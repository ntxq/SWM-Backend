import createError from "http-errors";
import mysql, { Connection } from "mysql";
import { DBConnection } from "src/sql/secret";

type QueryParameter = string | number | JSON;
type QueryUniqueSelectRow = Array<Array<unknown>>;
export type SelectUniqueResult = { [key: string]: string | number };
export type SelectMultipleResult = Array<
  SelectUniqueResult | SelectMultipleResult
>;

export interface Procedure {
  query: string;
  parameters: Array<QueryParameter>;
  selectUnique: boolean;
}

export class MysqlConnection {
  connection: mysql.Pool;
  private static instance: MysqlConnection;

  private constructor() {
    this.connection = this.connect();
  }

  static getInstance(): MysqlConnection {
    return this.instance || (this.instance = new this());
  }

  connect(): mysql.Pool {
    const connection = mysql.createPool({
      connectionLimit: 10,
      host: DBConnection.host,
      user: DBConnection.user,
      password: DBConnection.password,
      port: DBConnection.port,
      database: `Omniscient Translator Database`,
      multipleStatements: true,
      charset: "utf8_general_ci",
    });
    connection.on("error", (error) => {
      const _error = error as mysql.MysqlError;
      console.log("db error", error);
      if (_error.code === "PROTOCOL_CONNECTION_LOST") {
        return this.connect();
      } else {
        throw _error;
      }
    });
    return connection;
  }

  async callProcedure(procedure: Procedure): Promise<unknown> {
    const rows = await this.callMultipleProcedure([procedure]);
    return rows[0];
  }

  callMultipleProcedure(procedures: Array<Procedure>): Promise<unknown[]> {
    return new Promise<Array<unknown>>((resolve, reject) => {
      this.connection.getConnection((error, conn) => {
        if (error) {
          console.error(error);
          reject(new createError.InternalServerError());
          return;
        }
        conn.beginTransaction(() => {
          Promise.all(
            [...procedures].map((procedure) =>
              this.execAsyncQuery(conn, procedure)
            )
          )
            .then((rows) => {
              conn.commit();
              conn.release();
              resolve(rows);
            })
            .catch((error) => {
              conn.commit();
              conn.release();
              if (error instanceof createError.HttpError) {
                reject(error);
              } else {
                reject(new createError.InternalServerError());
              }
            });
        });
      });
    });
  }

  private execAsyncQuery(
    conn: Connection,
    procedure: Procedure
  ): Promise<unknown> {
    return new Promise((resolve, rejects) => {
      const questionMarksArray = "?"
        .repeat(procedure.parameters.length)
        .split("");

      const questionMarks = questionMarksArray.join(",");
      const query = `CALL ${procedure.query}(${questionMarks});`;
      conn.query(query, procedure.parameters, function (error, rows) {
        if (error) {
          console.error(error.message);
          if (error.sqlState?.startsWith("SP")) {
            rejects(createError(error.sqlState.slice(2)));
          } else {
            rejects(new createError.InternalServerError());
          }
          return;
        }

        //Array라는 건 마지막이 OkPacket이라는 뜻
        if (Array.isArray(rows)) {
          rows.pop();
        }
        //단순 update문으로 OkPacket만 오는 경우는 parsing하지않는다
        if (procedure.selectUnique) {
          const result = rows as QueryUniqueSelectRow;
          if (result[0] && result[0][0] === undefined) {
            resolve([]);
            return;
          }
          resolve(JSON.parse(JSON.stringify(result[0][0])));
        }

        resolve(rows);
      });
    });
  }

  destroyConnection(): void {
    this.connection.end();
  }
}

export const mysqlConnection = MysqlConnection.getInstance();
