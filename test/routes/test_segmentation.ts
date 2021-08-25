/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-prototype-builtins */
import supertest from "supertest";
import app from "src/app";
import { expect } from "chai";
import rle from "test/resource/rle.json";

describe("/upload/segmentation two request", function () {
  this.timeout(10 * 1000);
  const request_ids: Array<number> = [];
  const cut_counts: Array<number> = [];
  const image_list = ["test_img.png", "test_img copy.png"];
  it("/source 200", async function () {
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
      request_ids.push(response_ids["req_id"]);
      cut_counts.push(response_ids["cut_count"]);
    }
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

  it("/cut 200", async function () {
    this.timeout(2 * 60 * 1000);
    for (let index = 0; index < image_list.length; index++) {
      const cut_count = cut_counts[index];
      const request_id = request_ids[index];
      for (let cut_id = 1; cut_id <= cut_count; cut_id++) {
        const response = await supertest(app)
          .get("/upload/segmentation/cut")
          .query({ req_id: request_id, cut_id: cut_id });
        expect(response.statusCode).that.is.oneOf([500, 200]);
        if (response.statusCode === 200) {
          expect(response.body).to.hasOwnProperty("cut");
        } else {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          cut_id--;
        }
      }
    }
    this.timeout(10 * 1000);
  });

  it("/result 200", async function () {
    for (let index = 0; index < image_list.length; index++) {
      const cut_count = cut_counts[index];
      const request_id = request_ids[index];
      for (let cut_id = 1; cut_id <= cut_count; cut_id++) {
        const response = await supertest(app)
          .get("/upload/segmentation/result")
          .query({ req_id: request_id, cut_id: cut_id })
          .expect(200);
        expect(response.body.progress).to.be.a("number");
      }
    }
  });

  describe("get result and update using previous data", function () {
    const request_id = 1307;
    const cut_count = 1;
    let mask: Array<number>;
    // before("get completed request_id", async function () {

    // });
    it("/result complete", async function () {
      for (let cut_id = 1; cut_id <= cut_count; cut_id++) {
        const response = await supertest(app)
          .get("/upload/segmentation/result")
          .query({ req_id: request_id, cut_id: cut_id })
          .expect(200);
        expect(response.body.progress).to.be.equal(100);
      }
    });

    it("/result/mask", async function () {
      for (let cut_id = 1; cut_id <= cut_count; cut_id++) {
        console.log(request_id, cut_id);
        const response = await supertest(app)
          .get("/upload/segmentation/result/mask")
          .query({ req_id: request_id, cut_id: cut_id })
          .expect(200);
        expect(response.body).to.hasOwnProperty("mask");
        expect(response.body.mask).to.be.instanceof(Array);
        mask = response.body.mask;
      }
    });

    it("/result/inpaint", async function () {
      console.log("inpaint test start");
      for (let cut_id = 1; cut_id <= cut_count; cut_id++) {
        const response = await supertest(app)
          .get("/upload/segmentation/result/inpaint")
          .query({ req_id: request_id, cut_id: cut_id })
          .expect(200);
        expect(response.body).to.be.instanceof(Buffer);
      }
    });

    it("/mask", async function () {
      const rle_copy = JSON.parse(JSON.stringify(rle));
      expect(mask).to.be.instanceof(Array);
      expect(mask[0]).to.be.a("number");
      rle_copy.result[0].value.rle = mask;
      const response = await supertest(app)
        .post("/upload/segmentation/mask")
        .send({
          req_id: request_id,
          cut_id: cut_count,
          mask: JSON.stringify(rle_copy),
        })
        .expect(200);
      expect(response.body).to.hasOwnProperty("success");
      expect(response.body.success).to.be.equal(true);
    });
  });
});
