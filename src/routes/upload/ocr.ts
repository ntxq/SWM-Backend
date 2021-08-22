import express from "express";

import { Request, Response, NextFunction } from "express-serve-static-core";
import { grpcSocket } from "src/gRPC/grpc_socket";
import { queryManager } from "src/sql/mysql_connection_manager";
import createHttpError from "http-errors";
import { validateParameters } from "src/modules/utils";

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
  (request: Request, response: Response, next: NextFunction) => {
    try {
      validateParameters(request);
    } catch (error) {
      next(error);
    }
    const requestID = Number.parseInt(request.query["req_id"] as string);
    const cutIndex = Number.parseInt(request.query["cut_id"] as string);
    grpcSocket.OCR.start(requestID, cutIndex)
      .then(() => {
        response.send({ success: true });
      })
      .catch((error: createHttpError.HttpError) => {
        next(error);
      });
  }
);

router.get(
  "/result",
  (request: Request, response: Response, next: NextFunction) => {
    try {
      validateParameters(request);
    } catch (error) {
      next(error);
    }
    const requestID = Number.parseInt(request.query["req_id"] as string);
    const cutIndex = Number.parseInt(request.query["cut_id"] as string);
    const progress = queryManager.checkProgress(requestID, cutIndex);
    response.send({ progress: Math.max(0, progress - 100) });
  }
);

router.get(
  "/result/bbox",
  (request: Request, response: Response, next: NextFunction) => {
    try {
      validateParameters(request);
    } catch (error) {
      next(error);
    }
    const requestID = Number.parseInt(request.query["req_id"] as string);
    const cutIndex = Number.parseInt(request.query["cut_id"] as string);
    queryManager
      .getBboxes(requestID, cutIndex)
      .then((bboxList: BBox[]) => {
        response.send({ bboxList: bboxList });
      })
      .catch((error) => {
        throw error;
      });
  }
);

interface postEditBody {
  req_id: string;
  cut_id: string;
  bboxList: string;
}
router.post(
  "/edit",
  (request: Request, response: Response, next: NextFunction) => {
    try {
      validateParameters(request);
    } catch (error) {
      next(error);
    }
    const body = request.body as postEditBody;
    const requestID = Number.parseInt(body["req_id"]);
    const cutIndex = Number.parseInt(body["cut_id"]);
    const bboxList = JSON.parse(body["bboxList"]) as TranslateBBox[];
    queryManager
      .setBboxesWithTranslate(requestID, cutIndex, bboxList)
      .then(() => {
        response.send({ success: true });
      })
      .catch((error) => {
        throw error;
      });
  }
);

export default router;
