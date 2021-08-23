import path from "node:path";
import { TranslateBBox, BBox } from "src/routes/upload/ocr";
import createError from "http-errors";
import AWS from "aws-sdk";
import { Request, Response, NextFunction } from "express-serve-static-core";
import assert from "node:assert";
import { Readable } from "node:stream";
import { credentials } from "src/sql/secret";
import requests from "src/routes/requests.json";

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

export function updateBbox(
  oldBbox: BBox[] | TranslateBBox[],
  newBbox: BBox[] | TranslateBBox[]
): TranslateBBox[] {
  return newBbox as TranslateBBox[];
}

export function handleGrpcError(error: Error): createError.HttpError {
  console.log(error);
  return new createError.ServiceUnavailable();
}

// eslint-disable-next-line @typescript-eslint/ban-types
export const asyncRouterWrap = (asyncFuntion: Function) => {
  return (request: Request, response: Response, next: NextFunction): void => {
    try {
      asyncFuntion(request, response, next);
    } catch (error) {
      next(error);
    }
  };
};

export function validateParameters(request: Request): void {
  try {
    const url = request.baseUrl + request.path;
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

class S3 {
  s3: AWS.S3;
  bucket: string;
  ACL: string;

  constructor() {
    AWS.config.region = "ap-northeast-2";
    AWS.config.credentials = credentials;
    this.s3 = new AWS.S3();
    this.bucket = "swm-images-db";
    this.ACL = "public-read";
  }

  async upload(filename: string, buffer: Buffer) {
    const parameter: AWS.S3.Types.PutObjectRequest = {
      Bucket: this.bucket,
      ACL: this.ACL,
      Key: filename,
      Body: buffer,
    };
    return new Promise<void>((resolve, reject) => {
      this.s3.upload(parameter, function (error, data) {
        if (error) {
          console.error(data, error);
          reject(new createError.InternalServerError());
        }
        console.log("complete upload");
        resolve();
      });
    });
  }

  private async streamToString(stream: Readable): Promise<string> {
    return await new Promise((resolve, reject) => {
      const chunks: Uint8Array[] = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("error", reject);
      stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    });
  }

  async download(filename: string): Promise<Buffer | string> {
    const parameter: AWS.S3.Types.GetObjectRequest = {
      Bucket: this.bucket,
      Key: filename,
    };
    return new Promise<Buffer | string>((resolve, reject) => {
      this.s3.getObject(parameter, (error, data) => {
        if (error || data.Body === undefined) {
          reject(error);
          return;
        }
        if (data.Body instanceof Readable) {
          this.streamToString(data.Body)
            .then((data) => {
              resolve(data);
            })
            .catch((error) => {
              throw error;
            });
        } else if (typeof data.Body === "string") {
          resolve(data.Body);
        } else if (data.Body instanceof Buffer) {
          resolve(data.Body);
        } else {
          resolve(data.Body.toString());
        }
      });
    });
  }
}

export const s3 = new S3();
