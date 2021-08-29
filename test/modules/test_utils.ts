/* eslint-disable unicorn/no-null */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { expect } from "chai";
import { isImageFile } from "src/modules/utils";

describe("utils test", function () {
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
});
