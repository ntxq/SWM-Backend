/* eslint-disable unicorn/no-null */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { expect } from "chai";
import { isImageFile, validateRequestID } from "src/modules/utils";
import { mysqlConnection } from "src/sql/sql_connection";
import sinon from "ts-sinon";

describe("utils test", function () {
  afterEach((done) => {
    sinon.restore();
    done();
  });

  it("isImageFile", function (done) {
    const imageFile = {
      originalname: "imagesample.png",
      mimetype: "png",
    } as Express.Multer.File;
    const notImageFile = {
      originalname: "imagesample.txt",
      mimetype: "txt",
    } as Express.Multer.File;
    expect(isImageFile(imageFile)).to.be.equal(true);
    expect(isImageFile(notImageFile)).to.be.equal(false);
    done();
  });

  it("validateRequestID", function (done) {
    const stub = sinon.stub(mysqlConnection, "callProcedure");
    //valid
    {
      const returnValue = { valid: 1 };
      stub.onFirstCall().resolves(returnValue);
      validateRequestID(123_123, 900).catch((error) => {
        done(error);
      });
    }
    //invalid
    {
      const returnValue = { valid: 0 };
      stub.onSecondCall().resolves(returnValue);
      validateRequestID(123_123, 900)
        .then(() => {
          done(returnValue);
        })
        .catch(() => {
          done();
        });
    }
  });
});
