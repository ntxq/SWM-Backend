import express from "express";
import { grpcSocket } from "src/gRPC/grpc_socket";

import { Request, Response } from "express-serve-static-core";
import { queryManager } from "src/sql/mysql_connection_manager";
import {
  asyncRouterWrap,
  getImagePath,
  validateParameters,
  validateRequestID,
} from "src/modules/utils";
import { s3 } from "src/modules/s3_wrapper";

const router = express.Router();

interface PostProjectBody {
  title: string;
  filenames: string[];
}

interface PostProjectResponseUnit {
  req_id: number;
  filename: string;
  s3_url: string;
  s3_blank_url: string;
}

export interface PostProjectResponse {
  request_array: Array<PostProjectResponseUnit>;
}

router.post(
  "/project",
  asyncRouterWrap(async (request: Request, response: Response) => {
    validateParameters(request);
    const body = request.body as PostProjectBody;
    const userID = response.locals.userID as number;
    const projectID = await queryManager.addProject(userID, body.title);
    const returnValue = await queryManager.addRequest(
      projectID,
      body.filenames
    );

    response.send(returnValue);
  })
);

interface PostSourceBody {
  req_id: number;
}

interface PostSourceResponse {
  cut_count: number;
}

router.post(
  "/source",
  asyncRouterWrap(async (request: Request, response: Response) => {
    validateParameters(request);
    const body = request.body as PostSourceBody;
    await validateRequestID(response.locals.userID, body.req_id);
    const imagePath = getImagePath(body.req_id, 0, "cut");

    await queryManager.updateCut(body.req_id, "cut", 0, imagePath);
    const reply = await grpcSocket.segmentation.splitImage(
      body.req_id,
      "cut",
      imagePath
    );
    await queryManager.setCutCount(reply.req_id, reply.cut_count);
    const returnValue: PostSourceResponse = {
      cut_count: reply.cut_count,
    };
    response.send(returnValue);
  })
);

interface PostBlankBody {
  req_id: number;
}

router.post(
  "/blank",
  asyncRouterWrap(async (request: Request, response: Response) => {
    validateParameters(request);
    const body = request.body as PostBlankBody;
    await validateRequestID(response.locals.userID, body.req_id);

    const imagePath = getImagePath(body.req_id, 0, "inpaint");

    await Promise.all([
      queryManager.updateCut(body.req_id, "inpaint", 0, imagePath),
      grpcSocket.segmentation.splitImage(body.req_id, "inpaint", imagePath),
    ]);

    response.send({ success: true });
  })
);

interface PostStartBody {
  req_id: number;
}

router.post(
  "/start",
  asyncRouterWrap(async (request: Request, response: Response) => {
    validateParameters(request);
    const body = request.body as PostStartBody;
    await validateRequestID(response.locals.userID, body.req_id);
    const imageUrl = getImagePath(body.req_id, 0, "cut");
    const imageSize = await s3.getFileSize(imageUrl);
    const total_size = await queryManager.addImageSize(
      response.locals.userID,
      body.req_id,
      imageSize,
      "without_inpaint"
    );
    const success = total_size > 0;
    if (success) {
      await grpcSocket.segmentation.startSegmentation(body.req_id);
    }
    response.send({ success: success, size: total_size });
  })
);

router.get(
  "/cut",
  asyncRouterWrap(async (request: Request, response: Response) => {
    validateParameters(request);
    const requestID = Number.parseInt(request.query["req_id"] as string);
    const cutIndex = Number.parseInt(request.query["cut_id"] as string);

    await validateRequestID(response.locals.userID, requestID);

    const cutPath = await queryManager.getPath(requestID, "cut", cutIndex);
    const cut = await s3.download(cutPath);
    response.type("png");
    response.end(cut);
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
    response.send({ progress: Math.min(progress, 100) });
  })
);

router.get(
  "/result/inpaint",
  asyncRouterWrap(async (request: Request, response: Response) => {
    validateParameters(request);
    const requestID = Number.parseInt(request.query["req_id"] as string);
    const cutIndex = Number.parseInt(request.query["cut_id"] as string);

    await validateRequestID(response.locals.userID, requestID);

    const inpaintPath = await queryManager.getPath(
      requestID,
      "inpaint",
      cutIndex
    );
    const inpaint = await s3.download(inpaintPath);
    response.type("png");
    response.end(inpaint);
  })
);

router.get(
  "/result/mask",
  asyncRouterWrap(async (request: Request, response: Response) => {
    validateParameters(request);
    const requestID = Number.parseInt(request.query["req_id"] as string);
    const cutIndex = Number.parseInt(request.query["cut_id"] as string);

    await validateRequestID(response.locals.userID, requestID);

    const maskPath = await queryManager.getPath(requestID, "mask", cutIndex);
    const mask = await s3.download(maskPath);
    response.send({ mask: JSON.parse(mask.toString()) as JSON });
  })
);

interface RLEValue {
  rle: Array<number>;
}

interface RLEResult {
  value: RLEValue;
}

interface RLE {
  result: Array<RLEResult>;
}
interface PostMaskBody {
  mask: string;
  req_id: string;
  cut_id: string;
}
router.post(
  "/mask",
  asyncRouterWrap(async (request: Request, response: Response) => {
    validateParameters(request);
    const body = request.body as PostMaskBody;
    const requestID = Number.parseInt(body["req_id"]);
    const cutIndex = Number.parseInt(body["cut_id"]);
    const mask: Array<RLEResult> = (JSON.parse(body["mask"]) as RLE)["result"];

    const rle: Array<Array<number>> = [];
    for (const element of mask) {
      rle.push(element["value"]["rle"]);
    }

    await validateRequestID(response.locals.userID, requestID);

    await grpcSocket.segmentation.updateMask(requestID, cutIndex, rle);
    response.send({ success: true });
  })
);

export default router;
