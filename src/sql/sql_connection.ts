import createError from "http-errors";
import mysql, { Connection } from "mysql";
import { DBConnection } from "src/sql/secret";

type QueryReturnType = SelectUniqueResult | Array<SelectUniqueResult> | [];
type QueryParameter = string | number | JSON | boolean | null;
type QueryUniqueSelectRow = Array<Array<unknown>>;
export type SelectUniqueResult = { [key: string]: string | number };

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
      connectionLimit: 100,
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

  async callProcedure(procedure: Procedure): Promise<QueryReturnType> {
    const rows = await this.callMultipleProcedure([procedure]);
    return rows[0];
  }

  async callMultipleProcedure(
    procedures: Array<Procedure>
  ): Promise<QueryReturnType[]> {
    const connection = await this.getConnection();
    return new Promise<QueryReturnType[]>((resolve, reject) => {
      connection.beginTransaction(() => {
        Promise.all(
          [...procedures].map((procedure) =>
            this.execAsyncQuery(connection, procedure)
          )
        )
          .then((rows) => {
            connection.commit();
            connection.release();
            resolve(rows);
          })
          .catch((error) => {
            connection.commit();
            connection.release();
            if (error instanceof createError.HttpError) {
              reject(error);
            } else {
              reject(new createError.InternalServerError());
            }
          });
      });
    });
  }

  private getConnection() {
    return new Promise<mysql.PoolConnection>((resolve, reject) => {
      this.connection.getConnection((error, conn) => {
        if (error) {
          console.error(error);
          reject(new createError.InternalServerError());
          return;
        }
        resolve(conn);
      });
    });
  }

  private execAsyncQuery(
    conn: Connection,
    procedure: Procedure
  ): Promise<QueryReturnType> {
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
            rejects(new createError[error.sqlState.slice(2)]());
          } else {
            rejects(new createError.InternalServerError());
          }
          return;
        }

        //Array가 아니면 OkPacket만 온 것
        if (!Array.isArray(rows)) {
          resolve([]);
          return;
        }
        const result = rows as QueryUniqueSelectRow;
        if (result[0] === undefined || result[0][0] === undefined) {
          resolve([]);
          return;
        }
        if (procedure.selectUnique) {
          resolve(JSON.parse(JSON.stringify(result[0][0])));
        } else {
          resolve(JSON.parse(JSON.stringify(result[0])));
        }
      });
    });
  }
}

export const mysqlConnection = MysqlConnection.getInstance();
