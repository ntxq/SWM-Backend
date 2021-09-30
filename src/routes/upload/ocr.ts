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
import createHttpError from "http-errors";
import { multer_image } from "src/routes/multer_options";
import { s3 } from "src/modules/s3_wrapper";

const router = express.Router();

export interface BBox {
  bbox_id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  group_id: number;
  group_index: number;
}

export interface TranslateBox {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
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

    await grpcSocket.OCR.startOCR(requestID, cutIndex);
    response.send({ success: true });
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

interface postTextBody {
  req_id: string;
  cut_id: string;
  bboxList: string;
  translateBoxList: string;
}
router.post(
  "/text",
  asyncRouterWrap(async (request: Request, response: Response) => {
    validateParameters(request);
    const body = request.body as postTextBody;
    const requestID = Number.parseInt(body["req_id"]);
    const cutIndex = Number.parseInt(body["cut_id"]);
    const bboxList = JSON.parse(body["bboxList"]) as BBox[];
    const translates = JSON.parse(body["translateBoxList"]) as TranslateBox[];

    if (bboxList.length > 0 && translates.length > 0) {
      throw new createHttpError.BadRequest();
    }

    await validateRequestID(response.locals.userID, requestID);
    if (bboxList.length > 0) {
      await queryManager.setBboxes(requestID, cutIndex, bboxList);
    } else if (translates.length > 0) {
      await queryManager.setTranslateBoxes(requestID, cutIndex, translates);
    }
    response.send({ success: true });
  })
);

interface postTranslateBody {
  req_id: string;
  cut_id: string;
  translate_id: string;
}
router.post(
  "/translate",
  asyncRouterWrap(async (request: Request, response: Response) => {
    validateParameters(request);
    const body = request.body as postTranslateBody;
    const requestID = Number.parseInt(body["req_id"]);
    const cutIndex = Number.parseInt(body["cut_id"]);
    const translateID = Number.parseInt(body["translate_id"]);

    await validateRequestID(response.locals.userID, requestID);
    const translated = await grpcSocket.OCR.startTranslate(
      requestID,
      cutIndex,
      translateID
    );
    response.send({ translated: translated });
  })
);

interface postImageBody {
  req_id: string;
  cut_id: string;
}
router.post(
  "/image",
  multer_image.single("final_image"),
  asyncRouterWrap(async (request: Request, response: Response) => {
    validateParameters(request);
    const body = request.body as postImageBody;
    const requestID = Number.parseInt(body["req_id"]);
    const cutIndex = Number.parseInt(body["cut_id"]);
    const file = request.file as Express.Multer.File;
    const path_url = getImagePath(requestID, cutIndex, "complete");
    await s3.upload(path_url, file.buffer);
    await queryManager.updateCut(requestID, "complete", cutIndex, path_url);
    response.send({ success: true });
  })
);

export default router;
