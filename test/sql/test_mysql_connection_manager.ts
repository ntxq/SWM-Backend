/* eslint-disable unicorn/no-null */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// import supertest from "supertest";
// import app from "src/app";
import { expect } from "chai";
import { queryManager } from "src/sql/mysql_connection_manager";
import { mysqlConnection, mysqlLonginConnection } from "src/sql/sql_connection";
import sinon from "ts-sinon";
import { s3 } from "src/modules/s3_wrapper";

describe("mysql connection test", function () {
  before((done) => {
    sinon.stub(s3, "upload").resolves();
    sinon.stub(s3, "download").resolves("returnValue");
    done();
  });
  afterEach((done) => {
    sinon.restore();
    done();
  });

  it("addProject", function (done) {
    const returnValue = { id: 1 };
    sinon.stub(mysqlConnection, "callProcedure").resolves(returnValue);
    queryManager
      .addProject(1, "test")
      .then((id) => {
        expect(id).to.be.a("number");
        done();
      })
      .catch((error) => {
        done(error);
      });
  });

  it("addRequest", function (done) {
    const data = [
      { id: 1, originalname: "sample", buffer: Buffer.from([]) },
      { id: 2, originalname: "sample2", buffer: Buffer.from([]) },
    ];
    const rows = data.map((value) => {
      return { id: value.id };
    });
    const filenames = data.map((value) => {
      return value.originalname;
    });

    sinon.stub(mysqlConnection, "callMultipleProcedure").resolves(rows);
    queryManager
      .addRequest(1, filenames)
      .then((response) => {
        for (const item of response.request_array) {
          expect(item.req_id).to.be.a("number");
          expect(item.s3_url).to.be.a("string");
          expect(filenames).to.be.include(item.filename);
        }
        done();
      })
      .catch((error) => {
        done(error);
      });
  });

  it("setCutCount", function (done) {
    const returnValue = {};
    sinon.stub(mysqlConnection, "callProcedure").resolves(returnValue);
    queryManager
      .setCutCount(1, 50)
      .then(() => {
        done();
      })
      .catch((error) => {
        done(error);
      });
  });

  it("getCutCount", function (done) {
    const cutCount = 50;
    const returnValue = { cut_count: cutCount };
    sinon.stub(mysqlConnection, "callProcedure").resolves(returnValue);
    queryManager
      .getCutCount(1)
      .then((count) => {
        expect(count).to.be.equal(cutCount);
        done();
      })
      .catch((error) => {
        done(error);
      });
  });

  it("checkProgress", function (done) {
    const returnValue = { complete: "cut" };
    sinon.stub(mysqlConnection, "callProcedure").resolves(returnValue);
    queryManager
      .checkProgress(1, 1)
      .then((prgoress) => {
        expect(prgoress).to.be.a("number");
        done();
      })
      .catch((error) => {
        done(error);
      });
  });

  it("updateProgress", async function () {
    const returnValue = {};
    sinon.stub(mysqlConnection, "callProcedure").resolves(returnValue);
    await queryManager.updateProgress(1, 1, "inpaint");
    const result = await queryManager.checkProgress(1, 1);
    expect(result).to.be.equal(100);
  });

  it("updateCut", async function () {
    const returnValue = { complete: "cut" };
    sinon.stub(mysqlConnection, "callProcedure").resolves(returnValue);
    await queryManager.updateCut(1, "cut", 1, "samplePath");
    await queryManager.updateCut(1, "inpaint", 1, "samplePath");
    await queryManager.updateCut(1, "mask", 1, "samplePath");
    await queryManager.updateCut(1, "cut", 0, "samplePath");
  });

  it("updateUserUploadInpaint", async function () {
    const returnValue = { complete: "cut" };
    sinon.stub(mysqlConnection, "callProcedure").resolves(returnValue);
    await queryManager.updateUserUploadInpaint(1, "cut", 1, "samplePath");
    await queryManager.updateUserUploadInpaint(1, "inpaint", 1, "samplePath");
    await queryManager.updateUserUploadInpaint(1, "mask", 1, "samplePath");
  });

  it("get/set CutRange", async function () {
    const ranges = { 1: [0, 10] };
    const returnValue = [];
    for (const [key, value] of Object.entries(ranges)) {
      returnValue.push({
        cut_idx: key,
        cut_start: value[0],
        cut_end: value[1],
      });
    }

    sinon.stub(mysqlConnection, "callMultipleProcedure").resolves(returnValue);
    sinon.stub(mysqlConnection, "callProcedure").resolves(returnValue);

    const json = JSON.parse(JSON.stringify(ranges)) as JSON;
    await queryManager.setCutRanges(1, json);
    const rows = await queryManager.getCutRange(1);
    for (const [index, range] of rows) {
      expect(Number.parseInt(index)).to.be.a("number");
      expect(range.length).to.be.equal(2);
      expect(range[0]).to.be.a("number");
      expect(range[1]).to.be.a("number");
      expect(range[0]).to.be.lessThan(range[1]);
    }
  });

  it("getPath", async function () {
    const returnValue = {
      cut_path: "cut_path",
      inpaint_path: "inpaint_path",
      mask_path: "mask_path",
      mask_image_path: "mask_image_path",
    };
    sinon.stub(mysqlConnection, "callProcedure").resolves(returnValue);

    let path = await queryManager.getPath(1, "cut");
    expect(path).to.be.equal("cut_path");

    path = await queryManager.getPath(1, "cut", 1);
    expect(path).to.be.equal("cut_path");
    path = await queryManager.getPath(1, "inpaint", 1);
    expect(path).to.be.equal("inpaint_path");
    path = await queryManager.getPath(1, "mask", 1);
    expect(path).to.be.equal("mask_path");
    path = await queryManager.getPath(1, "mask_image", 1);
    expect(path).to.be.equal("mask_image_path");
    //default value
    // await queryManager
    //   .getPath(1, "mask", 1)
    //   .then((result) => {
    //     expect(result).to.be.instanceof(Error);
    //   })
    //   .catch((error) => {
    //     expect(error.statusCode).to.be.equal(500);
    //   });
  });

  it("get/set bboxes", async function () {
    const returnValue = {
      bbox_id: 1,
      x: 40,
      y: 30,
      width: 400,
      height: 300,
      text: "text",
      group_id: 1,
      group_index: 1,
    };
    sinon
      .stub(mysqlConnection, "callProcedure")
      .resolves({ bboxes: JSON.stringify([returnValue]) });

    let bboxes = await queryManager.getBboxes(1, 1);
    expect(bboxes).to.be.instanceof(Array);
    for (const bbox of bboxes) {
      expect(bbox.bbox_id).to.be.equal(returnValue.bbox_id);
      expect(bbox.x).to.be.equal(returnValue.x);
      expect(bbox.y).to.be.equal(returnValue.y);
      expect(bbox.width).to.be.equal(returnValue.width);
      expect(bbox.height).to.be.equal(returnValue.height);
      expect(bbox.text).to.be.equal(returnValue.text);
    }
    await queryManager.setBboxes(1, 0, [returnValue]);
    await queryManager.setBboxes(1, 1, [returnValue]);
    bboxes = await queryManager.getBboxes(1, 1);
    for (const bbox of bboxes) {
      expect(bbox.bbox_id).to.be.equal(returnValue.bbox_id);
      expect(bbox.x).to.be.equal(returnValue.x);
      expect(bbox.y).to.be.equal(returnValue.y);
      expect(bbox.width).to.be.equal(returnValue.width);
      expect(bbox.height).to.be.equal(returnValue.height);
      expect(bbox.text).to.be.equal(returnValue.text);
    }
  });

  it("get/set translate bboxes", async function () {
    const returnValue = {
      id: 1,
      x: 30,
      y: 20,
      width: 100,
      height: 200,
      text: "text",
      fontColor: "red",
      fontSize: 15,
      fontFamily: "default",
      fontWeight: "bold",
      fontStyle: "random",
    };
    sinon
      .stub(mysqlConnection, "callProcedure")
      .resolves({ translate_box: JSON.stringify([returnValue]) });

    const bboxes = await queryManager.getTranslateBoxes(1, 1);
    expect(bboxes).to.be.instanceof(Array);
    await queryManager.setTranslateBoxes(1, 1, [returnValue]);
    for (const bbox of bboxes) {
      expect(bbox.id).to.be.equal(returnValue.id);
      expect(bbox.x).to.be.equal(returnValue.x);
      expect(bbox.y).to.be.equal(returnValue.y);
      expect(bbox.width).to.be.equal(returnValue.width);
      expect(bbox.height).to.be.equal(returnValue.height);
      expect(bbox.text).to.be.equal(returnValue.text);
      expect(bbox.fontColor).to.be.equal(returnValue.fontColor);
      expect(bbox.fontSize).to.be.equal(returnValue.fontSize);
      expect(bbox.fontFamily).to.be.equal(returnValue.fontFamily);
      expect(bbox.fontWeight).to.be.equal(returnValue.fontWeight);
      expect(bbox.fontStyle).to.be.equal(returnValue.fontStyle);
    }
  });

  it("getUser", async function () {
    const ID = 1;
    const returnValue = {
      create_time: Date.now().toString(),
      nickname: "test profile",
      email: "null",
    };
    sinon.stub(mysqlLonginConnection, "callProcedure").resolves(returnValue);
    const result = await queryManager.getUser(ID);

    const time = result.create_time as string;
    expect(Date.parse(time)).to.be.not.equal(Number.NaN);
    expect(result.nickname).to.be.equal("test profile");
    expect(result.email).to.be.equal("null");
  });

  it("addUser", async function () {
    const ID = 1;
    const returnValue = {
      create_time: Date.now().toString(),
    };
    sinon.stub(mysqlLonginConnection, "callProcedure").resolves(returnValue);
    const result = await queryManager.addUser(
      ID,
      "test_nick",
      "test@email.com"
    );
    const time = result.create_time as string;
    expect(Date.parse(time)).to.be.not.equal(Number.NaN);
  });
  it("isValidRequest", async function () {
    const returnValue = { valid: 1 };
    sinon.stub(mysqlConnection, "callProcedure").resolves(returnValue);
    const response = await queryManager.isValidRequest(123_123, 10_000);
    expect(response).to.be.equal(true);
  });
});
