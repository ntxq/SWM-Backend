/* eslint-disable unicorn/no-null */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { expect } from "chai";
import { s3 } from "src/modules/s3_wrapper";
import request from "superagent";
import fs from "node:fs";

describe("s3 wrapper test", function () {
  it("s3 image upload URL test", async function () {
    const url = await s3.getUploadURL("test_img.png");
    const file = fs.readFileSync("test/resource/test_img.png");
    const response = await request
      .put(url)
      .set("Content-Type", "image/*")
      .send(file);
    expect(response.statusCode).to.be.equal(200);
  });
});
