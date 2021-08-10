import express from "express";

import { Request, Response } from "express-serve-static-core";
import { grpcSocket } from "src/gRPC/grpc_socket";
import { JSON_DIR } from "src/modules/const";
import fs from "fs";
import { queryManager } from "../../sql/mysqlConnectionManager";

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

router.get("/select", (req: Request, res: Response) => {
  const req_id = parseInt(req.query["req_id"] as string);
  grpcSocket.OCR.Start(req_id);
  res.send({ success: true });
});

router.get("/result", (req: Request, res: Response) => {
  const req_id = parseInt(req.query["req_id"] as string);
  queryManager.check_progress(req_id).then((complete) => {
    res.send({ complete });
  });
});

router.get("/result/bbox", (req: Request, res: Response) => {
  const req_id = parseInt(req.query["req_id"] as string);
  queryManager.get_bboxes(req_id).then((bboxList: BBox[]) => {
    res.send({ bboxList: bboxList });
  });
});

router.post("/edit", (req: Request, res: Response) => {
  const req_id = parseInt(req.body["req_id"]);
  const bboxList: TranslateBBox[] = JSON.parse(req.body["bboxList"]);
  queryManager.set_bboxes_with_translate(req_id, bboxList).then(() => {
    res.send({ success: true });
  });
});

export default router;
