import express from "express";

import { Request, Response } from "express-serve-static-core";
import { grpcSocket } from "src/gRPC/grpc_socket";
import { queryManager } from "src/sql/mysql_connection_manager";
import {
  asyncRouterWrap,
  getImagePath,
  validateParameters,
  validateRequestID,
} from "src/modules/utils";
import { s3 } from "src/modules/s3_wrapper";

const router = express.Router();

export interface BBox {
  bbox_id: number;
  originalX: number;
  originalY: number;
  originalWidth: number;
  originalHeight: number;
  originalText: string;
  translatedText?: string;
}

export interface TranslateBBox extends BBox {
  translatedX: number;
  translatedY: number;
  translatedWidth: number;
  translatedHeight: number;
  fontColor: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
}

router.get(
  "/select",
  asyncRouterWrap(async (request: Request, response: Response) => {
    validateParameters(request);
    const requestID = Number.parseInt(request.query["req_id"] as string);
    const cutIndex = Number.parseInt(request.query["cut_id"] as string);

    await validateRequestID(response.locals.userID, requestID);
    const imageUrl = getImagePath(requestID, 0, "cut");
    const imageSize = await s3.getFileSize(imageUrl);
    const total_size = await queryManager.addImageSize(
      response.locals.userID,
      requestID,
      imageSize,
      "with_inpaint"
    );
    const success = total_size > 0;
    if (success) {
      await grpcSocket.OCR.startOCR(requestID, cutIndex);
    }
    response.send({ success: success, size: total_size });
  })
);

router.get(
  "/result",
  asyncRouterWrap(async (request: Request, response: Response) => {
    validateParameters(request);
    const requestID = Number.parseInt(request.query["req_id"] as string);
    const cutIndex = Number.parseInt(request.query["cut_id"] as string);

    await validateRequestID(response.locals.userID, requestID);

    const progress = await queryManager.checkProgress(requestID, cutIndex);
    response.send({ progress: Math.max(0, progress - 100) });
  })
);

router.get(
  "/result/bbox",
  asyncRouterWrap(async (request: Request, response: Response) => {
    validateParameters(request);
    const requestID = Number.parseInt(request.query["req_id"] as string);
    const cutIndex = Number.parseInt(request.query["cut_id"] as string);

    await validateRequestID(response.locals.userID, requestID);

    const bboxList = await queryManager.getBboxes(requestID, cutIndex);
    response.send({ bboxList: bboxList });
  })
);

interface postEditBody {
  req_id: string;
  cut_id: string;
  bboxList: string;
}
router.post(
  "/edit",
  asyncRouterWrap(async (request: Request, response: Response) => {
    validateParameters(request);
    const body = request.body as postEditBody;
    const requestID = Number.parseInt(body["req_id"]);
    const cutIndex = Number.parseInt(body["cut_id"]);
    const bboxList = JSON.parse(body["bboxList"]) as TranslateBBox[];

    await validateRequestID(response.locals.userID, requestID);

    await queryManager.setBboxesWithTranslate(requestID, cutIndex, bboxList);
    response.send({ success: true });
  })
);

export default router;
