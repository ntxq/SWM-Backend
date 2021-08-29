import multer, { FileFilterCallback } from "multer";
import { isImageFile } from "src/modules/utils";
import { Request } from "express-serve-static-core";
import createHttpError from "http-errors";

const storage = multer.memoryStorage();

const fileFilter = function (
  request: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback
) {
  if (!isImageFile(file)) {
    // req.h = 'goes wrong on the mimetype';
    callback(new createHttpError.UnsupportedMediaType());
  }
  // eslint-disable-next-line unicorn/no-null
  return callback(null, true);
};

export const multer_image = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 1024 * 1024 * 1024 },
});
