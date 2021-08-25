/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// import supertest from "supertest";
// import app from "src/app";
import { expect } from "chai";
import createHttpError from "http-errors";
// import rle from "test/resource/rle.json";
import { mysqlConnection, Procedure } from "src/sql/sql_connection";

describe("mysql connection test", function () {
  const procedure: Procedure = {
    query: "sp_get_stored_procedures",
    parameters: [],
    selectUnique: false,
  };
  const procedure2: Procedure = {
    query: "sp_get_cut_count",
    parameters: [1450],
    selectUnique: true,
  };
  const procedure3: Procedure = {
    query: "sp_get_cut_count",
    parameters: [0],
    selectUnique: true,
  };
  const invalidProcedure: Procedure = {
    query: "sp_get_paths",
    parameters: [1450, 999],
    selectUnique: true,
  };
  // const invalidProcedure2: Procedure = {
  //   query: "sp_get_paths",
  //   parameters: [1450, 0],
  //   selectUnique: true,
  // };
  it("callProcedure", async function () {
    const rows = await mysqlConnection.callProcedure(procedure);
    expect(rows).to.be.instanceof(Array);
    const rows2 = await mysqlConnection.callProcedure(procedure2);
    expect(rows2).to.be.a("Object");
    const rows3 = await mysqlConnection.callProcedure(procedure3);
    expect(rows3).to.be.eql([]);

    const procedure1 = new Promise<void>((resolve, reject) => {
      mysqlConnection
        .callProcedure(invalidProcedure)
        .then(() => {
          reject();
        })
        .catch((error) => {
          console.error(error);
          expect(error.message).to.be.eql(
            new createHttpError.BadRequest().message
          );
          resolve();
        });
    });
    // const procedure2 = new Promise<void>((resolve, reject) => {
    //   mysqlConnection
    //     .callProcedure(invalidProcedure2)
    //     .then(() => {
    //       reject();
    //     })
    //     .catch((error) => {
    //       console.error(error);
    //       expect(error.message).to.be.equal(
    //         new createHttpError.InternalServerError().message
    //       );
    //       resolve();
    //     });
    // });
    return Promise.all([procedure1]);
  });
  it("callMultipleProcedure", async function () {
    await mysqlConnection.callMultipleProcedure([
      procedure,
      procedure,
      procedure,
    ]);
  });
});
