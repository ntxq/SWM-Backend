import express from "express";

import { Request, Response, NextFunction } from "express-serve-static-core";
import { grpcSocket } from "src/gRPC/grpc_socket";
import { queryManager } from "src/sql/mysql_connection_manager";
import createHttpError from "http-errors";
import { validateParameters } from "src/modules/utils";

var router = express.Router();

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

router.get("/select", (req: Request, res: Response, next: NextFunction) => {
	try{
		validateParameters(req)
	}catch(err){
		next(err)
	}
  const requestID = parseInt(req.query["req_id"] as string);
  const cutIndex = parseInt(req.query["cut_id"] as string);
  grpcSocket.OCR.start(requestID, cutIndex)
    .then((response) => {
      res.send({ success: true });
    })
    .catch((err: createHttpError.HttpError) => {
      next(err);
    });
});

router.get("/result", (req: Request, res: Response, next: NextFunction) => {
	try{
		validateParameters(req)
	}catch(err){
		next(err)
	}
  const requestID = parseInt(req.query["req_id"] as string);
  const cutIndex = parseInt(req.query["cut_id"] as string);
  const progress = queryManager.checkProgress(requestID, cutIndex)
	res.send({progress:Math.max(0, progress - 100)})
});

router.get("/result/bbox", (req: Request, res: Response, next: NextFunction) => {
	try{
		validateParameters(req)
	}catch(err){
		next(err)
	}
  const requestID = parseInt(req.query["req_id"] as string);
  const cutIndex = parseInt(req.query["cut_id"] as string);
  queryManager.getBboxes(requestID, cutIndex).then((bboxList: BBox[]) => {
    res.send({ bboxList: bboxList });
  });
});

router.post("/edit", (req: Request, res: Response, next: NextFunction) => {
	try{
		validateParameters(req)
	}catch(err){
		next(err)
	}
  const requestID = parseInt(req.body["req_id"]);
  const cutIndex = parseInt(req.body["cut_id"] as string);
  const bboxList: TranslateBBox[] = JSON.parse(req.body["bboxList"]);
  queryManager.setBboxesWithTranslate(requestID, cutIndex, bboxList).then(() => {
    res.send({ success: true });
  });
});

export default router;
