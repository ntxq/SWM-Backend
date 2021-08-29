import express from "express";
import { IMAGE_DIR } from "src/modules/const";
import path from "node:path";
import { grpcSocket } from "src/gRPC/grpc_socket";

import { Request, Response } from "express-serve-static-core";
import { multer_image } from "src/routes/multer_options";
import { queryManager } from "src/sql/mysql_connection_manager";
import { asyncRouterWrap, validateParameters } from "src/modules/utils";
import { s3 } from "src/modules/s3_wrapper";

const router = express.Router();

interface PostSourceBody {
  title: string;
}

interface PostSourceResponse {
  req_id: number;
  cut_count: number;
}

router.post(
  "/source",
  multer_image.array("source"),
  asyncRouterWrap(async (request: Request, response: Response) => {
    validateParameters(request);
    const body = request.body as PostSourceBody;
    //todo 최준영 제대로 된 user id 로 변환
    const userID = 123_123_123;

    const projectID = await queryManager.addProject(userID, body["title"]);
    const files = request.files as Express.Multer.File[];

    const ID2PathMap = await queryManager.addRequest(projectID, files);

    const upadteCuts = Promise.all(
      [...ID2PathMap].map(([requestID, [new_path]]) => {
        return queryManager.updateCut(requestID, "cut", 0, new_path);
      })
    );

    const makeCuts = Promise.all(
      [...ID2PathMap].map(([requestID, [new_path]]) => {
        return grpcSocket.segmentation.makeCutsFromWholeImage(
          requestID,
          "cut",
          new_path
        );
      })
    );

    const replies = (await Promise.all([upadteCuts, makeCuts]))[1];

    const path2IDMap = new Map<string, PostSourceResponse>();
    for (const reply of replies) {
      const pathes = ID2PathMap.get(reply.req_id);
      if (!pathes) continue;
      const [, originalPath] = pathes;
      path2IDMap.set(originalPath, {
        req_id: reply.req_id,
        cut_count: reply.cut_count,
      });
      await queryManager.setCutCount(reply.req_id, reply.cut_count);
    }
    response.send({ req_ids: Object.fromEntries(path2IDMap) });
  })
);

interface PostBlankBody {
  empty_id: string;
  map_ids: string;
}

router.post(
  "/blank",
  multer_image.array("blank"),
  async (request: Request, response: Response) => {
    validateParameters(request);
    const body = request.body as PostBlankBody;
    const noneBlankList = JSON.parse(body.empty_id) as number[];
    const blankList = JSON.parse(body.map_ids) as number[];
    const files = request.files as Express.Multer.File[];

    //send start ai processing signal
    //todo 최준영 how to catch exception?
    const startInpaintPromise = noneBlankList.map((requestID) =>
      grpcSocket.segmentation.start(requestID)
    );

    const requestFileList: [number, string, Express.Multer.File][] =
      blankList.map((requestID, index) => [
        requestID,
        path.join(IMAGE_DIR, "inpaint", `${requestID}_0.png`),
        files[index],
      ]);

    const upadteCuts = requestFileList.map(([requestID, path]) => {
      return queryManager.updateUserUploadInpaint(
        requestID,
        "inpaint",
        0,
        path
      );
    });

    const uploadCuts = requestFileList.map(([, path, file]) => {
      return s3.upload(path, file.buffer);
    });

    const makeCuts = requestFileList.map(([requestID, path]) => {
      return grpcSocket.segmentation.makeCutsFromWholeImage(
        requestID,
        "inpaint",
        path
      );
    });

    await Promise.all([startInpaintPromise, upadteCuts, uploadCuts, makeCuts]);
    response.send({ success: true });
  }
);

router.get(
  "/cut",
  asyncRouterWrap(async (request: Request, response: Response) => {
    validateParameters(request);
    const requestID = Number.parseInt(request.query["req_id"] as string);
    const cutIndex = Number.parseInt(request.query["cut_id"] as string);
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
    await grpcSocket.segmentation.updateMask(requestID, cutIndex, rle);
    response.send({ success: true });
  })
);

export default router;
