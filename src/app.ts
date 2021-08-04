import createError from "http-errors";
import express from "express";
import path from "path";
import cookieParser = require("cookie-parser");
import cors = require("cors");
import logger = require("morgan");
import { Request, Response, NextFunction } from "express-serve-static-core";

var uploadRouter = require("./routes/upload/upload.ts");

var app = express();

app.use(logger("dev"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));
app.use(cookieParser());
app.use(cors());

app.use(
  "/static",
  express.static(path.join(__dirname, "../frontend/build/static"))
);

app.use("/upload", uploadRouter);
app.get("*", (req: Request, res: Response) =>
  res.sendFile("index.html", {
    root: path.join(__dirname, "../frontend/build/"),
  })
);

// catch 404 and forward to error handler
app.use(function (req: Request, res: Response, next: NextFunction) {
  next(createError(404));
});

// error handler
app.use(function (
  err: createError.HttpError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.log(err.message);
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.send("error");
});

export default app;
