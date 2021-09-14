/* eslint-disable unicorn/no-null */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { expect } from "chai";
import { progressManager } from "src/modules/progress_manager";
import { s3 } from "src/modules/s3_wrapper";
import { mysqlConnection } from "src/sql/sql_connection";
import sinon from "ts-sinon";

describe("progress manager test", function () {
  const request_id = 10;
  const cut_index = 1;
  before((done) => {
    sinon.stub(s3, "upload").resolves();
    sinon.stub(s3, "download").resolves("returnValue");

    const returnValue = { complete: "cut" };
    sinon.stub(mysqlConnection, "callProcedure").resolves(returnValue);
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  it("get/set cut progress", async function () {
    let progress = await progressManager.getProgress(request_id, cut_index);
    expect(progress).to.be.a("number");
    expect(progress).to.be.equal(5);
    await progressManager.updateProgress(request_id, cut_index, "inpaint");
    progress = await progressManager.getProgress(request_id, cut_index);
    expect(progress).to.be.a("number");
    expect(progress).to.be.equal(100);
  });
});
