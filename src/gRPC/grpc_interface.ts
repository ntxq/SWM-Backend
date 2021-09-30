/* eslint-disable unicorn/no-null */
import { GrpcObject } from "@grpc/grpc-js";
import {
  ServiceClient,
  ServiceClientConstructor,
} from "@grpc/grpc-js/build/src/make-client";
import grpc = require("@grpc/grpc-js");
import * as MESSAGE from "src/gRPC/grpc_message_interface";
import { queryManager } from "src/sql/mysql_connection_manager";
import {
  getJsonPath,
  getSentenceFromBboxes,
  handleGrpcError,
} from "src/modules/utils";
import { s3 } from "src/modules/s3_wrapper";
import { TranslateBox } from "src/routes/upload/ocr";

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

  async splitImage(
    requestID: number,
    type: string,
    imagePath: string
  ): Promise<MESSAGE.ReplyRequestMakeCut> {
    const request: MESSAGE.RequestMakeCut = {
      req_id: requestID,
      type: type,
      image_path: imagePath,
    };
    return new Promise<MESSAGE.ReplyRequestMakeCut>((resolve, reject) => {
      const callback = async function (
        error: Error | null,
        response: MESSAGE.ReplyRequestMakeCut
      ) {
        if (error) {
          reject(handleGrpcError(error));
        }
        type Ranges = {
          [key: string]: {
            range: [number, number];
            image_path: string;
          };
        };
        const cut_ranges = JSON.parse(response.cut_ranges) as Ranges;
        const ranges: Map<string, number[]> = new Map<string, number[]>();
        for (const [key, value] of Object.entries(cut_ranges)) {
          await queryManager.updateCut(
            requestID,
            "cut",
            Number.parseInt(key),
            value.image_path
          );
          ranges.set(key, value.range);
        }
        await queryManager.setCutRanges(
          request.req_id,
          JSON.parse(JSON.stringify(ranges))
        );
        resolve(response);
      };

      this.client.SplitImage(request, callback);
    });
  }

  async startSegmentation(requestID: number, cutIndex = 0): Promise<void> {
    if (cutIndex !== 0) {
      await this.startSegmentationCut(requestID, cutIndex);
    } else {
      const cut_count = await queryManager.getCutCount(requestID);
      await Promise.all(
        Array.from({ length: cut_count }, (_, index) =>
          this.startSegmentation(requestID, index + 1)
        )
      );
    }
  }

  async startSegmentationCut(
    requestID: number,
    cutIndex: number
  ): Promise<void> {
    const imagePath = await queryManager.getPath(requestID, "cut", cutIndex);
    const request: MESSAGE.RequestStart = {
      req_id: requestID,
      cut_index: cutIndex,
      image_path: imagePath,
    };
    return new Promise((resolve, reject) => {
      const callback = async function (
        error: Error | null,
        response: MESSAGE.ReplySegmentationStart
      ) {
        if (error) {
          reject(handleGrpcError(error));
          return;
        }
        const filePath = getJsonPath(requestID, cutIndex, "mask");
        await s3.upload(
          filePath,
          Buffer.from(JSON.stringify(JSON.parse(response.mask)))
        );
        await queryManager.updateCut(requestID, "mask", cutIndex, filePath);
        resolve();
      };
      this.client.StartSegmentation(request, callback);
    });
  }
  async inpaintComplete(
    call: grpc.ServerUnaryCall<
      MESSAGE.RequestInpaintComplete,
      MESSAGE.ReplyInpaintComplete
    >,
    callback: grpc.sendUnaryData<MESSAGE.ReplyInpaintComplete>
  ): Promise<MESSAGE.ReplyInpaintComplete> {
    const request: MESSAGE.RequestInpaintComplete = call.request;
    await queryManager.updateCut(
      request.req_id,
      "inpaint",
      request.cut_index,
      request.file_name
    );
    const response: MESSAGE.ReplyInpaintComplete = { req_id: request.req_id };
    callback(null, response);
    return response;
  }

  async updateMask(
    requestID: number,
    cutIndex: number,
    data: Array<Array<number>>
  ): Promise<MESSAGE.ReplyMaskUpdate> {
    const masks: Array<Buffer> = [];
    for (const mask of data) {
      masks.push(Buffer.from(mask));
    }

    const request: MESSAGE.RequestMaskUpdate = {
      req_id: requestID,
      mask_rles: masks,
      cut_index: cutIndex,
      image_path: await queryManager.getPath(requestID, "cut", cutIndex),
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

  async startOCR(
    requestID: number,
    cutIndex: number
  ): Promise<MESSAGE.ReplyOCRStart> {
    const imagePath = await queryManager.getPath(requestID, "cut", cutIndex);

    return new Promise<MESSAGE.ReplyOCRStart>((resolve, reject) => {
      const request: MESSAGE.RequestStart = {
        req_id: requestID,
        cut_index: cutIndex,
        image_path: imagePath,
      };
      this.client.StartOCR(
        request,
        async function (error: Error | null, response: MESSAGE.ReplyOCRStart) {
          if (error) {
            reject(handleGrpcError(error));
            return;
          }
          await queryManager.updateProgress(requestID, cutIndex, "bbox");
          return resolve(response);
        }
      );
    });
  }

  async sendBBoxes(
    call: grpc.ServerUnaryCall<MESSAGE.SendJson, MESSAGE.ReceiveJson>,
    callback: grpc.sendUnaryData<MESSAGE.ReceiveJson>
  ): Promise<MESSAGE.ReceiveJson> {
    const request: MESSAGE.SendJson = call.request;
    await queryManager.setBboxes(
      request.req_id,
      request.cut_index,
      JSON.parse(request.data)
    );
    const response: MESSAGE.ReceiveJson = { success: true };
    callback(null, response);
    return response;
  }

  async startTranslate(
    requestID: number,
    cutIndex: number,
    translateID: number
  ): Promise<TranslateBox> {
    const bboxes = await queryManager.getBboxes(requestID, cutIndex);
    const text = getSentenceFromBboxes(bboxes, translateID);
    const request: MESSAGE.RequestStartTranslate = { text: text };
    return new Promise<TranslateBox>((resolve, reject) => {
      this.client.StartTranslate(
        request,
        function (error: Error | null, response: MESSAGE.ReplyStartTranslate) {
          if (error) {
            reject(handleGrpcError(error));
            return;
          }
          const translated = JSON.parse(response.data) as TranslateBox;
          return resolve(translated);
        }
      );
    });
  }

  async startConcat(requestID: number): Promise<void> {
    const request: MESSAGE.RequestStartConcat = { req_id: requestID };
    return new Promise<void>((resolve, reject) => {
      this.client.StartConcat(
        request,
        async function (
          error: Error | null,
          response: MESSAGE.ReplyStartConcat
        ) {
          if (error) {
            reject(handleGrpcError(error));
            return;
          }
          await queryManager.updateCut(requestID, "complete", 0, response.path);
          return resolve();
        }
      );
    });
  }
}
