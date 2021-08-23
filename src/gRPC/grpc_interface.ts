/* eslint-disable unicorn/no-null */
import { GrpcObject } from "@grpc/grpc-js";
import {
  ServiceClient,
  ServiceClientConstructor,
} from "@grpc/grpc-js/build/src/make-client";
import grpc = require("@grpc/grpc-js");
import { JSON_DIR } from "src/modules/const";
import * as MESSAGE from "src/gRPC/grpc_message_interface";
import { queryManager } from "src/sql/mysql_connection_manager";
import createError, { HttpError } from "http-errors";
import path = require("path");
import { handleGrpcError, s3 } from "src/modules/utils";

export class SegmentationInterface {
  clientUrl: string;
  proto: GrpcObject;
  client: ServiceClient;

  constructor(clientUrl: string, proto: GrpcObject) {
    this.clientUrl = clientUrl;
    this.proto = proto;

    const segmentation = this.proto.Segmentation as ServiceClientConstructor;
    this.client = new segmentation(
      this.clientUrl,
      grpc.credentials.createInsecure(),
      {
        "grpc.max_send_message_length": 1024 * 1024 * 1024,
        "grpc.max_receive_message_length": 1024 * 1024 * 1024,
      }
    );
  }

  async makeCutsFromWholeImage(
    requestID: number,
    type: string,
    path: string
  ): Promise<MESSAGE.ReplyRequestMakeCut> {
    const data = (await s3.download(path)) as Buffer;
    const request: MESSAGE.RequestMakeCut = {
      req_id: requestID,
      type: type,
      image: data,
    };
    return new Promise<MESSAGE.ReplyRequestMakeCut>((resolve, reject) => {
      const callback = function (
        error: Error | null,
        response: MESSAGE.ReplyRequestMakeCut
      ) {
        if (error) {
          reject(handleGrpcError(error));
        }
        resolve(response);
      };

      this.client.MakeCutsFromWholeImage(request, callback);
    });
  }

  async start(requestID: number, cutIndex = 0): Promise<void> {
    if (cutIndex !== 0) {
      for (let failCount = 0; failCount < 20; failCount++) {
        try {
          const path = await queryManager.getPath(requestID, "cut", cutIndex);
          if (path === null) {
            throw new createError.InternalServerError();
          }
          const data = (await s3.download(path)) as Buffer;
          const request: MESSAGE.RequestStart = {
            req_id: requestID,
            image: data,
            cut_index: cutIndex,
          };
          return new Promise((resolve, reject) => {
            const callback = function (
              error: Error | null,
              response: MESSAGE.ReplyRequestStart
            ) {
              if (error) {
                reject(handleGrpcError(error));
                return;
              }
              console.log("Greeting:", response.status_code);
              resolve();
            };
            this.client.StartCut(request, callback);
          });
        } catch (error) {
          if (error instanceof HttpError && error.statusCode == 500) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } else {
            throw error;
          }
        }
      }
    } else {
      const cut_count = await queryManager.getCutCount(requestID);
      await Promise.all(
        Array.from({ length: cut_count }, (_, index) =>
          this.start(requestID, index + 1)
        )
      );
    }
  }

  async imageTransfer(
    call: grpc.ServerUnaryCall<MESSAGE.SendImage, MESSAGE.ReceiveImage>,
    callback: grpc.sendUnaryData<MESSAGE.ReceiveImage>
  ): Promise<MESSAGE.ReceiveImage> {
    const request: MESSAGE.SendImage = call.request;
    await queryManager.updateCut(
      request.req_id,
      request.type,
      request.cut_index,
      request.file_name
    );
    const response: MESSAGE.ReceiveImage = { success: true };
    callback(null, response);
    return response;
  }

  async jsonTransfer(
    call: grpc.ServerUnaryCall<MESSAGE.SendJson, MESSAGE.ReceiveJson>,
    callback: grpc.sendUnaryData<MESSAGE.ReceiveJson>
  ): Promise<MESSAGE.ReceiveJson> {
    const request: MESSAGE.SendJson = call.request;
    const filePath = path.join(JSON_DIR, request.file_name);
    await s3.upload(
      filePath,
      Buffer.from(JSON.stringify(JSON.parse(request.data)))
    );
    switch (request.type) {
      case "cut":
        await queryManager.setCutRanges(
          request.req_id,
          JSON.parse(request.data)
        );
        break;
      case "mask":
        await queryManager.updateCut(
          request.req_id,
          request.type,
          request.cut_index,
          filePath
        );
        break;
    }
    const response: MESSAGE.ReceiveJson = { success: true };
    callback(null, response);
    return response;
  }

  async updateMask(
    requestID: number,
    cutIndex: number,
    data: Array<Array<number>>
  ): Promise<unknown> {
    const masks: Array<Buffer> = [];
    for (const mask of data) {
      masks.push(Buffer.from(mask));
    }

    const cutRanges = await queryManager.getCutRange(requestID);
    const request: MESSAGE.RequestMaskUpdate = {
      req_id: requestID,
      mask_rles: masks,
      cut_index: cutIndex,
      image: (await s3.download(
        await queryManager.getPath(requestID, "cut", cutIndex)
      )) as Buffer,
      cut_ranges: JSON.stringify(Object.fromEntries(cutRanges)),
    };
    await queryManager.updateProgress(requestID, cutIndex, "cut");
    return new Promise((resolve, reject) => {
      this.client.UpdateMask(
        request,
        function (error: Error | null, response: MESSAGE.ReplyMaskUpdate) {
          if (error) {
            reject(handleGrpcError(error));
            return;
          }
          console.log("Greeting:", response);
          resolve(response);
        }
      );
    });
  }
}

export class OCRInterface {
  clientUrl: string;
  proto: GrpcObject;
  client: ServiceClient;

  constructor(clientUrl: string, proto: GrpcObject) {
    this.clientUrl = clientUrl;
    this.proto = proto;

    const OCR = this.proto.OCR as ServiceClientConstructor;
    this.client = new OCR(this.clientUrl, grpc.credentials.createInsecure(), {
      "grpc.max_send_message_length": 1024 * 1024 * 1024,
      "grpc.max_receive_message_length": 1024 * 1024 * 1024,
    });
  }

  async start(
    requestID: number,
    cutIndex: number
  ): Promise<MESSAGE.ReplyRequestStart> {
    const filePath = await queryManager.getPath(requestID, "cut", cutIndex);
    if (!filePath) {
      throw new createError.InternalServerError();
    }
    const data = (await s3.download(filePath)) as Buffer;

    return new Promise<MESSAGE.ReplyRequestStart>((resolve, reject) => {
      const request: MESSAGE.RequestStart = {
        req_id: requestID,
        image: data,
        cut_index: cutIndex,
      };
      this.client.start(
        request,
        function (error: Error | null, response: MESSAGE.ReplyRequestStart) {
          if (error) {
            reject(handleGrpcError(error));
            return;
          }
          console.log("Greeting_OCR:", response.status_code);
          return resolve(response);
        }
      );
    });
  }

  async jsonTransfer(
    call: grpc.ServerUnaryCall<MESSAGE.SendJson, MESSAGE.ReceiveJson>,
    callback: grpc.sendUnaryData<MESSAGE.ReceiveJson>
  ): Promise<MESSAGE.ReceiveJson> {
    const request: MESSAGE.SendJson = call.request;

    await s3.upload(
      path.join(JSON_DIR, request.file_name),
      Buffer.from(JSON.stringify(JSON.parse(request.data), null, 4))
    );

    switch (request.type) {
      case "bbox":
        await queryManager.setBboxes(
          request.req_id,
          request.cut_index,
          JSON.parse(request.data)
        );
        break;
    }
    const response: MESSAGE.ReceiveJson = { success: true };
    callback(null, response);
    return response;
  }
}
