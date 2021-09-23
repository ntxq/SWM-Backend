/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-prototype-builtins */
import supertest from "supertest";
import app from "src/app";
import { expect } from "chai";
import rle from "test/resource/rle.json";
import sinon from "ts-sinon";
import { queryManager } from "src/sql/mysql_connection_manager";
import { grpcSocket } from "src/gRPC/grpc_socket";
import { s3 } from "src/modules/s3_wrapper";
import { mysqlConnection } from "src/sql/sql_connection";
import { getImagePath } from "src/modules/utils";
import { PostProjectResponse } from "src/routes/upload/segmentation";

describe("/upload/segmentation two request", function () {
  afterEach((done) => {
    sinon.restore();
    done();
  });

  const image_list = ["test_img.png", "test_img copy.png"];

  describe("/project", function () {
    before(() => {
      const addRequestReturn: PostProjectResponse = { request_array: [] };
      image_list.map((image_name, index) => {
        addRequestReturn.request_array.push({
          req_id: index,
          filename: image_name,
          s3_url: "sample url(invalid)",
          s3_blank_url: "sample blank url(invalid)",
        });
      });
      sinon.stub(queryManager, "addProject").resolves(1);
      sinon.stub(queryManager, "addRequest").resolves(addRequestReturn);
    });
    it("200 request", async () => {
      const response: supertest.Response = await supertest(app)
        .post("/upload/segmentation/project")
        .send({ title: "test project", filenames: image_list })
        .expect(200);
      const body = response.body;
      expect(body.request_array.length).to.be.equal(image_list.length);
      for (const request of body.request_array) {
        expect(request.req_id).to.be.a("number");
        expect(request.s3_url).to.be.a("string");
        expect(image_list).to.be.include(request.filename);
      }
    });
  });

  describe("/source", function () {
    before(() => {
      sinon.stub(queryManager, "updateCut").resolves();
      const grpcStub = sinon.stub(grpcSocket.segmentation, "splitImage");
      image_list.map((image_name, index) => {
        return grpcStub.onCall(index).resolves({
          req_id: index,
          cut_count: (index + 1) * 2,
          cut_ranges: "[0,100]",
        });
      });
    });
    it("200 request", async () => {
      const response: supertest.Response = await supertest(app)
        .post("/upload/segmentation/source")
        .send({ req_id: 1 })
        .expect(200);
      const body = response.body;
      expect(body).to.hasOwnProperty("cut_count");
      expect(body.cut_count).to.be.a("number");
    });
  });

  describe("/blank", function () {
    before(() => {
      sinon.stub(queryManager, "updateCut").resolves();
      const grpcStub = sinon.stub(grpcSocket.segmentation, "splitImage");
      image_list.map((image_name, index) => {
        return grpcStub.onCall(index).resolves({
          req_id: index,
          cut_count: (index + 1) * 2,
          cut_ranges: "[0, 100]",
        });
      });
    });
    it("/blank 200", async function () {
      const response = await supertest(app)
        .post("/upload/segmentation/blank")
        .send({ req_id: 1 })
        .expect(200);
      expect(response.body.success).to.be.a("boolean");
    });
  });

  describe("/start", function () {
    before(function (done) {
      sinon.stub(grpcSocket.segmentation, "startSegmentation").resolves();
      done();
    });
    it("/start 200", async function () {
      const response = await supertest(app)
        .post("/upload/segmentation/start")
        .send({ req_id: 1 })
        .expect(200);
      expect(response.body.success).to.be.a("boolean");
    });
  });

  it("/cut 200", async function () {
    sinon.stub(queryManager, "getPath").resolves("sample");
    sinon.stub(s3, "download").resolves("sample");
    const cut_id = 1;
    const request_id = 2;
    const response = await supertest(app)
      .get("/upload/segmentation/cut")
      .query({ req_id: request_id, cut_id: cut_id });
    expect(response.statusCode).is.equal(200);
    expect(response.body).to.hasOwnProperty("cut");
  });

  it("/result 200", async function () {
    sinon.stub(queryManager, "getPath").resolves("sample");
    sinon.stub(s3, "download").resolves("sample");
    //progress manager initStatus
    sinon.stub(mysqlConnection, "callProcedure").resolves({ complete: "mask" });

    const cut_id = 1;
    const request_id = 2;
    const response = await supertest(app)
      .get("/upload/segmentation/result")
      .query({ req_id: request_id, cut_id: cut_id });
    expect(response.statusCode).is.equal(200);
    expect(response.body.progress).to.be.a("number");
  });

  it("/result/mask 200", async function () {
    sinon.stub(queryManager, "getPath").resolves("sample");
    sinon
      .stub(s3, "download")
      .resolves(JSON.stringify(rle.result[0].value.rle));
    const cut_id = 1;
    const request_id = 2;
    const response = await supertest(app)
      .get("/upload/segmentation/result/mask")
      .query({ req_id: request_id, cut_id: cut_id });
    expect(response.statusCode).is.equal(200);
    expect(response.body.mask).to.be.instanceOf(Array);
  });

  it("/result/inpaint 200", async function () {
    sinon.stub(queryManager, "getPath").resolves("sample");
    sinon.stub(s3, "download").resolves("sample");
    const cut_id = 1;
    const request_id = 2;
    const response = await supertest(app)
      .get("/upload/segmentation/result/inpaint")
      .query({ req_id: request_id, cut_id: cut_id });
    expect(response.statusCode).is.equal(200);
    expect(response.body).to.be.instanceOf(Buffer);
  });

  it("/mask", async function () {
    sinon.stub(grpcSocket.segmentation, "updateMask").resolves();

    const request_id = 2;
    const cut_id = 1;

    const response = await supertest(app)
      .post("/upload/segmentation/mask")
      .send({
        req_id: request_id,
        cut_id: cut_id,
        mask: JSON.stringify(rle),
      })
      .expect(200);
    expect(response.body).to.hasOwnProperty("success");
    expect(response.body.success).to.be.equal(true);
  });
});
