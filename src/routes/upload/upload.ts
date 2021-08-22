import createError from "http-errors";
import express from "express";

import ocrRouter from "src/routes/upload/ocr";
import segmentationRouter from "src/routes/upload/segmentation";

import { Request, Response } from "express-serve-static-core";

const router = express.Router();

router.use("/OCR", ocrRouter);
router.use("/segmentation", segmentationRouter);

// catch 404 and forward to error handler
router.use(function (request, response, next) {
  next(createError.NotFound);
});

// error handler
router.use(function (
  error: createError.HttpError,
  request: Request,
  response: Response
) {
  // set locals, only providing error in development
  if (response.statusCode === 415) {
    return response.status(response.statusCode).send("error");
  }
  response.locals.message = error.message;
  response.locals.error = request.app.get("env") === "development" ? error : {};

  // render the error page
  response.status(error.statusCode || error.status || 500);
  response.send("error");
});

/* GET home page. */
router.get("/", function (request, response) {
  response.send("index");
});

export default router;
