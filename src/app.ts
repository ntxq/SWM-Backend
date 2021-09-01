import createError from "http-errors";
import express from "express";
import path from "node:path";
import cookieParser = require("cookie-parser");
import cors = require("cors");
import logger = require("morgan");
import { Request, Response, NextFunction } from "express-serve-static-core";

import uploadRouter from "src/routes/upload/upload";
import kakaoRouter from "src/routes/kakao";
import passport = require("passport");

const app = express();

app.use(logger("dev"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));
app.use(cookieParser());
app.use(cors());

app.use(
  "/static",
  express.static(path.join(path.resolve(), "frontend/build/static"))
);

app.use("/upload", uploadRouter);
app.use("/oauth", kakaoRouter);
app.get("*", (request: Request, response: Response) =>
  response.sendFile("index.html", {
    root: path.join(path.resolve(), "frontend/build/"),
  })
);

// catch 404 and forward to error handler
app.use(function (request: Request, response: Response, next: NextFunction) {
  next(new createError.NotFound());
});

// error handler
app.use(function (
  error: createError.HttpError,
  request: Request,
  response: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  console.log(error.message);
  // set locals, only providing error in development
  response.locals.message = error.message;
  response.locals.error = request.app.get("env") === "development" ? error : {};

  // render the error page
  response.status(error.status || 500);
  response.send("error");
});

export default app;
