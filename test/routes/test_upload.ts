/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-prototype-builtins */
import supertest from "supertest";
import app from "src/app";
import sinon from "ts-sinon";
import { queryManager } from "src/sql/mysql_connection_manager";
import path from "node:path";
import { IMAGE_DIR } from "src/modules/const";
import { grpcSocket } from "src/gRPC/grpc_socket";

describe("upload filter validation", function () {
  afterEach((done) => {
    sinon.restore();
    done();
  });

  const image_list = ["test_img.png", "test_img copy.png"];
  const txt_list = ["test_txt.txt"];
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
    it("415 request", async () => {
      await supertest(app)
        .post("/upload/segmentation/source")
        .attach("source", `test/resource/${image_list[0]}`)
        .attach("source", `test/resource/${image_list[1]}`)
        .attach("source", `test/resource/${txt_list[0]}`)
        .field({ title: "test project" })
        .expect(415);
    });
    it("400 request", async () => {
      await supertest(app)
        .post("/upload/segmentation/source")
        .attach("source", `test/resource/${image_list[0]}`)
        .attach("source", `test/resource/${image_list[1]}`)
        .field({ title_x: "test project" })
        .expect(400);
    });
  });
});

describe("not exist api call error", function () {
  it("/upload/invalid", async function () {
    await supertest(app)
      .post("/upload/invalid")
      .field({ title: "test project" })
      .expect(404);
  });
});
