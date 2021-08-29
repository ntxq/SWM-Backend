import { grpcSocket } from "src/gRPC/grpc_socket";
// import { expect } from "chai";
import { JSON_DIR } from "src/modules/const";
import fs from "node:fs";
describe.skip("GRPC connection", function () {
  const request_id = 0;

  it("Segmentation start", async function () {
    await grpcSocket.segmentation.start(request_id, 0);
  });

  it("Update mask", async function () {
    const masks = new Array<Array<number>>();
    const rle = fs
      .readFileSync(`${JSON_DIR}/mask/${request_id}_1.json`)
      .toString();

    masks.push(JSON.parse(rle));

    await grpcSocket.segmentation.updateMask(request_id, 1, masks);
  });
});
