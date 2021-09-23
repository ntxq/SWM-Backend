/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable no-prototype-builtins */
import supertest from "supertest";
import app from "src/app";
import { expect } from "chai";
import { grpcSocket } from "src/gRPC/grpc_socket";
import sinon from "ts-sinon";
import { mysqlConnection } from "src/sql/sql_connection";
import bboxJson from "test/resource/bbox.json";
import { queryManager } from "src/sql/mysql_connection_manager";

describe("/upload/OCR one request", function () {
  const request_id = 1307;
  const cut_id = 1;
  afterEach((done) => {
    sinon.restore();
    done();
  });

  it("/select 200", async function () {
    sinon.stub(grpcSocket.OCR, "startOCR").resolves();

    const response = await supertest(app)
      .get("/upload/OCR/select")
      .query({ req_id: request_id, cut_id: cut_id })
      .expect(200);
    expect(response.body).to.hasOwnProperty("success");
    expect(response.body.success).to.be.equal(true);
  });

  it("/result 200", async function () {
    //progress manager initStatus
    sinon.stub(mysqlConnection, "callProcedure").resolves({ complete: "bbox" });
    const response = await supertest(app)
      .get("/upload/OCR/result")
      .query({ req_id: request_id, cut_id: cut_id });
    expect(response.body).to.hasOwnProperty("progress");
    expect(response.body.progress).to.be.a("number");
  });

  it("/result/bbox 200", async function () {
    sinon.stub(queryManager, "getBboxes").resolves(bboxJson);

    const response = await supertest(app)
      .get("/upload/OCR/result/bbox")
      .query({ req_id: request_id, cut_id: cut_id });

    expect(response.body).to.hasOwnProperty("bboxList");
    expect(response.body.bboxList).to.be.instanceof(Array);
    for (const bbox of response.body.bboxList) {
      expect(bbox.bbox_id).to.be.a("number");
      expect(bbox.originalX).to.be.a("number");
      expect(bbox.originalY).to.be.a("number");
      expect(bbox.originalWidth).to.be.a("number");
      expect(bbox.originalHeight).to.be.a("number");
      expect(bbox.originalText).to.be.a("string");
      // todo 번역 붙이기
      // expect(bbox.translatedText).to.be.a("string");
    }
  });

  it("/edit 200", async function () {
    sinon.stub(queryManager, "setBboxesWithTranslate").resolves();

    const response = await supertest(app)
      .post("/upload/OCR/edit")
      .send({
        req_id: request_id,
        cut_id: cut_id,
        bboxList: JSON.stringify(bboxJson),
      })
      .expect(200);
    expect(response.body).to.hasOwnProperty("success");
    expect(response.body.success).to.be.equal(true);
  });
});
