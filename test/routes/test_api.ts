/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-prototype-builtins */
import supertest from "supertest";
import app from "src/app";
import sinon from "ts-sinon";
import { queryManager } from "src/sql/mysql_connection_manager";
import { grpcSocket } from "src/gRPC/grpc_socket";
import { PostProjectResponse } from "src/routes/api/segmentation";

describe("upload filter validation", function () {
  afterEach((done) => {
    sinon.restore();
    done();
  });

  const image_list = ["test_img.png", "test_img copy.png"];
  describe("/source", function () {
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
    it("400 request", async () => {
      await supertest(app)
        .post("/api/segmentation/source")
        .field({ title_x: "test project" })
        .expect(400);
    });
  });
});

describe("not exist api call error", function () {
  it("/api/invalid", async function () {
    await supertest(app)
      .post("/api/invalid")
      .field({ title: "test project" })
      .expect(404);
  });
});
