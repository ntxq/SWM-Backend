/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable no-prototype-builtins */
import supertest from "supertest";
import app from "src/app";
import { expect } from "chai";
import sinon from "ts-sinon";
import { queryManager } from "src/sql/mysql_connection_manager";
import { s3 } from "src/modules/s3_wrapper";

describe("/api/history", function () {
  const request_id = 1307;
  afterEach((done) => {
    sinon.restore();
    done();
  });

  it("/download 200", async function () {
    sinon.stub(s3, "getDownloadURL").resolves("sample_url");
    sinon.stub(queryManager, "getPath").resolves("test_path");

    const response = await supertest(app)
      .get("/api/history/download")
      .query({ req_id: request_id })
      .expect(200);
    expect(response.body).to.hasOwnProperty("success");
    expect(response.body.s3_url).to.be.equal("sample_url");
  });

  it("/download 200", async function () {
    sinon.stub(s3, "getDownloadURL").resolves("sample_url");
    sinon.stub(queryManager, "getPath").resolves("test_path");

    const response = await supertest(app)
      .get("/api/history/download")
      .query({ req_id: request_id })
      .expect(200);
    expect(response.body).to.hasOwnProperty("success");
    expect(response.body.s3_url).to.be.equal("sample_url");
  });
});
