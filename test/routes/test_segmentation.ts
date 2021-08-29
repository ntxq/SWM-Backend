/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-prototype-builtins */
import supertest from "supertest";
import app from "src/app";
import { expect } from "chai";
import rle from "test/resource/rle.json";
import sinon from "ts-sinon";
import { queryManager } from "src/sql/mysql_connection_manager";
import path from "node:path";
import { IMAGE_DIR } from "src/modules/const";
import { grpcSocket } from "src/gRPC/grpc_socket";
import { s3 } from "src/modules/s3_wrapper";
import { mysqlConnection } from "src/sql/sql_connection";

describe("/upload/segmentation two request", function () {
  afterEach((done) => {
    sinon.restore();
    done();
  });

  const image_list = ["test_img.png", "test_img copy.png"];
  describe("/source", function () {
    before(() => {
      const ID2PathMap = new Map<number, [string, string]>();
      image_list.map((image_name, index) => {
        const new_path = path.join(IMAGE_DIR, "cut", `${index}_0.png`);
        ID2PathMap.set(index, [new_path, image_name]);
      });
      sinon.stub(queryManager, "addProject").resolves(1);
      sinon.stub(queryManager, "addRequest").resolves(ID2PathMap);
      sinon.stub(queryManager, "updateCut").resolves();
      const grpcStub = sinon.stub(
        grpcSocket.segmentation,
        "makeCutsFromWholeImage"
      );
      image_list.map((image_name, index) => {
        return grpcStub.onCall(index).resolves({
          req_id: index,
          cut_count: (index + 1) * 2,
        });
      });
    });
    it("200 request", async () => {
      const response: supertest.Response = await supertest(app)
        .post("/upload/segmentation/source")
        .attach("source", `test/resource/${image_list[0]}`)
        .attach("source", `test/resource/${image_list[1]}`)
        .field({ title: "test project" })
        .expect(200);
      const body = response.body;
      expect(body).to.hasOwnProperty("req_ids");
      for (const image_name of image_list) {
        expect(body.req_ids).to.hasOwnProperty(image_name);
        const response_ids = body.req_ids[image_name];
        expect(response_ids["req_id"]).to.be.a("number");
        expect(response_ids["cut_count"]).to.be.a("number");
      }
    });
  });

  describe("/blank", function () {
    const request_ids: Array<number> = [1, 2];
    before(() => {
      sinon.stub(s3, "upload").resolves();
      const ID2PathMap = new Map<number, [string, string]>();
      image_list.map((image_name, index) => {
        const new_path = path.join(IMAGE_DIR, "cut", `${index}_0.png`);
        ID2PathMap.set(index, [new_path, image_name]);
      });
      sinon.stub(queryManager, "updateCut").resolves();
      const grpcStub = sinon.stub(
        grpcSocket.segmentation,
        "makeCutsFromWholeImage"
      );
      image_list.map((image_name, index) => {
        return grpcStub.onCall(index).resolves({
          req_id: index,
          cut_count: (index + 1) * 2,
        });
      });
    });
    it("/blank 200", async function () {
      const response = await supertest(app)
        .post("/upload/segmentation/blank")
        .field("map_ids", `[${request_ids[0]}]`)
        .field("empty_id", `[${request_ids[1]}]`)
        .attach("blank", `test/resource/${image_list[0]}`)
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
