import { grpcSocket } from "src/gRPC/grpc_socket";
// import { expect } from "chai";
import sinon from "ts-sinon";
import { expect } from "chai";
import { queryManager } from "src/sql/mysql_connection_manager";
import { s3 } from "src/modules/s3_wrapper";
import rle from "test/resource/rle.json";
import { mysqlConnection } from "src/sql/sql_connection";
describe("GRPC connection", function () {
  const request_id = 0;
  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe("Segmentation", function () {
    it("cut divide", async function () {
      const responseValue = {
        req_id: 0,
        cut_count: 1,
        cut_ranges: JSON.stringify({
          "1": {
            range: [0, 100],
            image_path: "adasdasd",
          },
        }),
      };
      sinon.stub(queryManager, "updateCut").resolves();
      sinon.stub(mysqlConnection, "callMultipleProcedure").resolves([]);
      sinon
        .stub(grpcSocket.segmentation.client, "SplitImage")
        .onFirstCall()
        .callsArgWith(1, undefined, responseValue);
      const response = await grpcSocket.segmentation.splitImage(
        request_id,
        "cut",
        "test/path"
      );
      expect(response.req_id).to.be.equal(responseValue.req_id);
      expect(response.cut_count).to.be.equal(responseValue.cut_count);
    });

    it("start segmentation", async function () {
      sinon.stub(queryManager, "getCutCount").resolves(3);
      sinon.stub(queryManager, "getPath").resolves("test/path");
      sinon.stub(s3, "upload").resolves();
      const responseValue = {
        req_id: 0,
        mask: JSON.stringify([0, 1, 2, 3, 4]),
      };
      const stub = sinon.stub(
        grpcSocket.segmentation.client,
        "StartSegmentation"
      );
      for (let index = 0; index < 10; index++) {
        stub.onCall(index).callsArgWith(1, undefined, responseValue);
      }
      await grpcSocket.segmentation.start(request_id, 0);
    });

    it("get image", async function () {
      sinon.stub(queryManager, "updateCut").resolves();
      const call = {
        request: {
          req_id: 0,
          cut_index: 0,
          file_name: "test/path",
        },
      };
      const response = await grpcSocket.segmentation.inpaintComplete(
        call as any,
        (error, response) => {
          return;
        }
      );
      expect(response.req_id).to.be.equal(0);
    });

    it("Update mask", async function () {
      const responseValue = {
        req_id: 0,
        status_code: 200,
      };
      const cutRanges = new Map<string, [number, number]>();
      cutRanges.set("1", [1, 100]);
      cutRanges.set("2", [100, 200]);
      sinon.stub(queryManager, "getCutRange").resolves(cutRanges);
      sinon.stub(queryManager, "getPath").resolves("asdsad");
      sinon.stub(queryManager, "updateProgress").resolves();
      sinon
        .stub(grpcSocket.segmentation.client, "UpdateMask")
        .onFirstCall()
        .callsArgWith(1, undefined, responseValue);
      const masks = new Array<Array<number>>();
      masks.push(rle.result[0].value.rle);

      const response = await grpcSocket.segmentation.updateMask(0, 1, masks);
      expect(response.req_id).to.be.equal(0);
      expect(response.status_code).to.be.equal(200);
    });
  });

  describe("OCR", function () {
    it("start OCR", async function () {
      sinon.stub(queryManager, "getPath").resolves("asdsad");
      const responseValue = {
        req_id: 0,
        status_code: 200,
      };
      sinon
        .stub(grpcSocket.OCR.client, "start")
        .onFirstCall()
        .callsArgWith(1, undefined, responseValue);
      const response = await grpcSocket.OCR.start(1, 2);
      expect(response.req_id).to.be.equal(responseValue.req_id);
    });

    it("get json", async function () {
      sinon.stub(queryManager, "setBboxes").resolves();
      sinon.stub(s3, "upload").resolves();
      const types = ["bbox"];
      for (const type of types) {
        const call = {
          request: {
            req_id: 0,
            cut_index: 0,
            type: type,
            data: JSON.stringify({ test: "value" }),
            file_name: "string",
          },
        };
        const response = await grpcSocket.OCR.jsonTransfer(
          call as any,
          (error, response) => {
            return;
          }
        );
        expect(response.success).to.be.equal(true);
      }
    });
  });
});
