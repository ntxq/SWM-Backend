/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// import supertest from "supertest";
// import app from "src/app";
import { expect } from "chai";
import createError, { HttpError } from "http-errors";
import { Connection, MysqlError } from "mysql";
// import rle from "test/resource/rle.json";
import {
  mysqlConnection,
  Procedure,
  SelectUniqueResult,
} from "src/sql/sql_connection";
import sinon from "ts-sinon";

describe("mysql connection test", function () {
  const procedure_multiple: Procedure = {
    query: "sp_dummy_call_multiple",
    parameters: [],
    selectUnique: false,
  };
  const procedure_unique: Procedure = {
    query: "sp_dummy_call_unique",
    parameters: [],
    selectUnique: true,
  };

  afterEach((done) => {
    sinon.restore();
    done();
  });

  it("execAsyncQuery multiple", async function () {
    const privateConnection = mysqlConnection as any;
    const connection: Connection = await privateConnection.getConnection();
    const results = [{ id: 1 }];
    const dummyOkPacket = [results, { Okpacket: "adasd" }];
    sinon
      .stub(connection, "query")
      .onFirstCall()
      .callsArgWith(2, undefined, dummyOkPacket);
    const rows = await privateConnection.execAsyncQuery(
      connection,
      procedure_multiple
    );
    expect(rows).to.be.instanceOf(Array);
    expect(rows[0]["id"]).to.be.equal(results[0]["id"]);
  });

  it("execAsyncQuery unique", async function () {
    const privateConnection = mysqlConnection as any;
    const connection: Connection = await privateConnection.getConnection();
    const results = [{ id: 1 }];
    const dummyOkPacket = [results, { Okpacket: "adasd" }];
    sinon
      .stub(connection, "query")
      .onFirstCall()
      .callsArgWith(2, undefined, dummyOkPacket);
    const rows = await privateConnection.execAsyncQuery(
      connection,
      procedure_unique
    );
    expect(rows["id"]).to.be.equal(results[0]["id"]);
  });

  it("execAsyncQuery empty return", async function () {
    const privateConnection = mysqlConnection as any;
    const connection: Connection = await privateConnection.getConnection();
    const dummyEmptyPacket = [[], { Okpacket: "adasd" }];
    const dummyUpdatePacket = { Okpacket: "adasd" };
    sinon
      .stub(connection, "query")
      .onFirstCall()
      .callsArgWith(2, undefined, dummyEmptyPacket)
      .onSecondCall()
      .callsArgWith(2, undefined, dummyUpdatePacket);

    let rows = await privateConnection.execAsyncQuery(
      connection,
      procedure_unique
    );
    expect(rows).to.be.eql([]);

    rows = await privateConnection.execAsyncQuery(connection, procedure_unique);
    expect(rows).to.be.eql([]);
  });

  it("execAsyncQuery with error", async function () {
    const privateConnection = mysqlConnection as any;
    const connection: Connection = await privateConnection.getConnection();

    const error = new Error("dummy error") as MysqlError;
    error.sqlState = "SP500";

    sinon.stub(connection, "query").onFirstCall().callsArgWith(2, error);
    return new Promise((resolve, reject) => {
      privateConnection
        .execAsyncQuery(connection, procedure_unique)
        .then((rows: any) => {
          reject(rows);
        })
        .catch((error: HttpError) => {
          expect(error.statusCode).to.be.equal(500);
          resolve();
        });
    });
  });

  it("callMultipleProcedure", async function () {
    const results = [{ id: 1 }];
    sinon
      .stub(mysqlConnection, <any>"execAsyncQuery")
      .onFirstCall()
      .returns(results)
      .onSecondCall()
      .returns(results[0]);
    const rows = await mysqlConnection.callMultipleProcedure([
      procedure_multiple,
      procedure_unique,
    ]);
    expect(rows).to.be.instanceOf(Array);
    const row1 = rows[0] as SelectUniqueResult[];
    const row2 = rows[1] as SelectUniqueResult;
    expect(row1).to.be.instanceOf(Array);
    expect(row1[0]["id"]).to.be.equal(results[0]["id"]);
    expect(row2["id"]).to.be.equal(results[0]["id"]);
  });

  it("callProcedure", async function () {
    const results = { id: 1 };
    sinon.stub(mysqlConnection, <any>"execAsyncQuery").returns(results);
    const rows = (await mysqlConnection.callProcedure(
      procedure_unique
    )) as SelectUniqueResult;
    expect(rows["id"]).to.be.equal(results["id"]);
  });

  it("callProcedure with error", function (done) {
    sinon
      .stub(mysqlConnection, <any>"execAsyncQuery")
      .rejects(new createError.InternalServerError());
    mysqlConnection
      .callProcedure(procedure_unique)
      .then((rows) => {
        done(rows);
      })
      .catch((error) => {
        expect(error.statusCode).to.be.equal(500);
        done();
      });
  });
});
