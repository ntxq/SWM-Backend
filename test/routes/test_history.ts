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
  const request_id = 154;
  afterEach((done) => {
    sinon.restore();
    done();
  });

  it("/projects 200", async function () {
    sinon.stub(s3, "getDownloadURL").resolves("sample_url");
    sinon.stub(queryManager, "getPath").resolves("test_path");

    const response = await supertest(app)
      .get("/api/history/projects")
      .query({ page: 0 })
      .expect(200);
    expect(response.body).to.hasOwnProperty("projects");
    expect(response.body.projects).to.be.an("array");
    for (const project of response.body.projects) {
      expect(project).to.hasOwnProperty("id");
      expect(project).to.hasOwnProperty("requests");
      expect(project.requests).to.be.an("array");
      for (const request of project.requests) {
        expect(request).to.hasOwnProperty("id");
        expect(request).to.hasOwnProperty("progress");
        expect(request).to.hasOwnProperty("thumnail");
      }
    }
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
