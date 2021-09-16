import path from "node:path";
import createError from "http-errors";
import { Request, Response, NextFunction } from "express-serve-static-core";
import assert from "node:assert";
import requests from "src/routes/requests.json";
import { IMAGE_DIR, ProgressType } from "./const";

type RequestParameters = {
  [index: string]: string;
};
type Json = { [key: string]: Json | string | number };

export function isImageFile(file: Express.Multer.File): boolean {
  // Allowed ext
  const filetypes = /jpeg|jpg|png/;
  // Check ext
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime
  const mimetype = filetypes.test(file.mimetype);

  return mimetype && extname;
}

export function handleGrpcError(error: Error): createError.HttpError {
  console.log(error);
  return new createError.ServiceUnavailable();
}

type RouterFunction = (
  request: Request,
  response: Response,
  next: NextFunction
) => Promise<void>;
export const asyncRouterWrap = (asyncFuntion: RouterFunction) => {
  return (request: Request, response: Response, next: NextFunction): void => {
    asyncFuntion(request, response, next).catch((error) => {
      next(error);
    });
  };
};

export function getImagePath(
  requestID: number,
  cutIndex: number,
  type: ProgressType
): string {
  return path.join(IMAGE_DIR, type, `${requestID}_${cutIndex}.png`);
}

export function validateParameters(request: Request): void {
  try {
    let url = request.baseUrl + request.path;
    if (url.slice(-1) == "/") {
      url = url.slice(0, -1);
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const urlList = (requests as Json)[request.method] as Json;
    const requestChecker = urlList[url] as Json;

    for (const type of Object.keys(requestChecker)) {
      let requestParameters: RequestParameters = {};
      switch (type) {
        case "body":
          requestParameters = JSON.parse(
            JSON.stringify(request.body)
          ) as RequestParameters;
          break;
        case "query":
          requestParameters = JSON.parse(
            JSON.stringify(request.query)
          ) as RequestParameters;
          break;
        case "params":
          requestParameters = JSON.parse(
            JSON.stringify(request.params)
          ) as RequestParameters;
          break;
      }
      for (const [parameterName, parameterType] of Object.entries(
        requestChecker[type]
      )) {
        if (parameterType == "number") {
          assert(
            !Number.isNaN(Number.parseInt(requestParameters[parameterName]))
          );
        } else if (parameterType == "object") {
          assert(JSON.parse(requestParameters[parameterName]));
        } else {
          assert(typeof requestParameters[parameterName] == parameterType);
        }
      }
    }
  } catch (error) {
    console.error(error);
    throw new createError.BadRequest();
  }
}
