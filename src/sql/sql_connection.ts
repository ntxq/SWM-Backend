import createError from "http-errors";
import mysql, { Connection } from "mysql";
import { DBConnection, DBLoginCneection } from "src/sql/secret";

type QueryReturnType = SelectUniqueResult | Array<SelectUniqueResult> | [];
type QueryParameter = string | number | JSON | boolean | null | undefined;
type QueryUniqueSelectRow = Array<Array<unknown>>;
export type SelectUniqueResult = { [key: string]: string | number | null };

export interface Procedure {
  query: string;
  parameters: Array<QueryParameter>;
  selectUnique: boolean;
}

interface ConnectionOption {
  host: string;
  user: string;
  password: string;
  port: number;
  database: string;
}

export abstract class MysqlConnection {
  connection: mysql.Pool;

  constructor(option: ConnectionOption) {
    this.connection = this.connect(option);
  }

  connect(option: ConnectionOption): mysql.Pool {
    const connection = mysql.createPool({
      connectionLimit: 100,
      host: option.host,
      user: option.user,
      password: option.password,
      port: option.port,
      database: option.database,
      multipleStatements: true,
      charset: "utf8_general_ci",
    });
    connection.on("error", (error) => {
      const _error = error as mysql.MysqlError;
      console.log("db error", error);
      if (_error.code === "PROTOCOL_CONNECTION_LOST") {
        return this.connect(option);
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
          console.error(query);
          if (error.sqlState?.startsWith("SP")) {
            rejects(new createError[error.sqlState.slice(2)]());
          } else {
            rejects(new createError.InternalServerError());
          }
          return;
        }

        //Array??? ????????? OkPacket??? ??? ???
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

class ContentsConnection extends MysqlConnection {
  private static instance: MysqlConnection;

  private constructor() {
    super(DBConnection);
  }

  static getInstance(): MysqlConnection {
    return this.instance || (this.instance = new this());
  }
}

class LoginConnection extends MysqlConnection {
  private static instance: MysqlConnection;

  private constructor() {
    super(DBLoginCneection);
  }

  static getInstance(): MysqlConnection {
    return this.instance || (this.instance = new this());
  }
}

export const mysqlConnection = ContentsConnection.getInstance();
export const mysqlLonginConnection = LoginConnection.getInstance();
