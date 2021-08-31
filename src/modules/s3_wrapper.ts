import AWS from "aws-sdk";
import { credentials } from "src/sql/secret";
import { Readable } from "node:stream";
import createError from "http-errors";

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
          reject(new createError.InternalServerError());
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

  async uploadURL(filename: string) {
    const parameter = {
      Bucket: this.bucket,
      Key: filename,
      Expires: 30,
    };
    return this.s3.getSignedUrlPromise("putObject", parameter);
  }

  async downloadURL(filename: string) {
    const parameter = {
      Bucket: this.bucket,
      Key: filename,
      Expires: 30,
    };
    return this.s3.getSignedUrlPromise("getObject", parameter);
  }
}

export const s3 = new S3();
