/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable no-prototype-builtins */
import supertest from "supertest";
import app from "src/app";
import { expect } from "chai";

describe("/upload/OCR one request", function () {
  const request_id = 1307;
  const cut_id = 1;
  // before("get inpainted request_id", async function () {
  // });
  it("/select 200", async function () {
    const response = await supertest(app)
      .get("/upload/OCR/select")
      .query({ req_id: request_id, cut_id: cut_id })
      .expect(200);
    expect(response.body).to.hasOwnProperty("success");
    expect(response.body.success).to.be.equal(true);
  });

  it("/result 200", async function () {
    const response = await supertest(app)
      .get("/upload/OCR/result")
      .query({ req_id: request_id, cut_id: cut_id });
    expect(response.body).to.hasOwnProperty("progress");
    expect(response.body.progress).to.be.a("number");
  });

  describe("update OCR using previous data", function () {
    const request_id = 1439;
    const cut_id = 1;
    let bboxList: Array<unknown>;
    // before("get completed data", async function () {

    // });
    it("/result complete", async function () {
      const response = await supertest(app)
        .get("/upload/OCR/result")
        .query({ req_id: request_id, cut_id: cut_id });
      expect(response.body).to.hasOwnProperty("progress");
      expect(response.body.progress).to.be.equal(100);
    });

    it("/result/bbox 200", async function () {
      const response = await supertest(app)
        .get("/upload/OCR/result/bbox")
        .query({ req_id: request_id, cut_id: cut_id });
      expect(response.body).to.hasOwnProperty("bboxList");
      expect(response.body.bboxList).to.be.instanceof(Array);
      bboxList = response.body.bboxList;
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
      const response = await supertest(app)
        .post("/upload/OCR/edit")
        .send({
          req_id: request_id,
          cut_id: cut_id,
          bboxList: JSON.stringify(bboxList),
        })
        .expect(200);
      expect(response.body).to.hasOwnProperty("success");
      expect(response.body.success).to.be.equal(true);
    });
  });
});
