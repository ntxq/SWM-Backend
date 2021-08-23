import express from "express";
import { IMAGE_DIR } from "src/modules/const";
import path from "node:path";
import { grpcSocket } from "src/gRPC/grpc_socket";
import * as MESSAGE from "src/gRPC/grpc_message_interface";

import { Request, Response, NextFunction } from "express-serve-static-core";
import { multer_image } from "src/routes/multer_options";
import createError from "http-errors";
import { queryManager } from "src/sql/mysql_connection_manager";
import { asyncRouterWrap, s3, validateParameters } from "src/modules/utils";

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
  asyncRouterWrap(
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        validateParameters(request);
      } catch (error) {
        next(error);
        return;
      }
      const body = request.body as PostSourceBody;
      //todo 최준영 제대로 된 user id 로 변환
      const userID = 123_123_123;
      const projectID = await queryManager.addProject(userID, body["title"]);
      const files = request.files as Express.Multer.File[];
      queryManager
        .addRequest(projectID, files)
        .then(async (ID2PathMap: Map<number, [string, string]>) => {
          const promiseArray = new Array<
            Promise<void | MESSAGE.ReplyRequestMakeCut>
          >();
          for (const [requestID, pathes] of ID2PathMap) {
            const [new_path] = pathes;
            promiseArray.push(
              queryManager.updateCut(requestID, "cut", 0, new_path),
              grpcSocket.segmentation.makeCutsFromWholeImage(
                requestID,
                "cut",
                new_path
              )
            );
          }
          const path2IDMap = await Promise.all(promiseArray).then(
            async (replies: Array<void | MESSAGE.ReplyRequestMakeCut>) => {
              const path2IDMap = new Map<string, PostSourceResponse>();
              try {
                for (const reply of replies) {
                  if (reply) {
                    const pathes = ID2PathMap.get(reply.req_id);
                    if (pathes) {
                      const [, originalPath] = pathes;
                      path2IDMap.set(originalPath, {
                        req_id: reply.req_id,
                        cut_count: reply.cut_count,
                      });
                      await queryManager.setCutCount(
                        reply.req_id,
                        reply.cut_count
                      );
                    }
                  }
                }
                return path2IDMap;
              } catch {
                throw new createError.InternalServerError();
              }
            }
          );
          return path2IDMap;
        })
        .then((path2IDMap) => {
          response.send({ req_ids: Object.fromEntries(path2IDMap) });
        })
        .catch((error) => {
          next(error);
        });
    }
  )
);

interface PostBlankBody {
  empty_id: string;
  map_ids: string;
}

router.post(
  "/blank",
  multer_image.array("blank"),
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      validateParameters(request);
    } catch (error) {
      next(error);
      return;
    }
    const body = request.body as PostBlankBody;
    const noneBlankList = JSON.parse(body.empty_id) as number[];
    const blankList = JSON.parse(body.map_ids) as number[];
    const files = request.files as Express.Multer.File[];

    //send start ai processing signal
    //todo 최준영 how to catch exception?
    for (const requestID of noneBlankList) {
      grpcSocket.segmentation.start(requestID).then(
        () => {
          return;
        },
        (error) => {
          throw error;
        }
      );
    }

    //set query and response data
    const promiseArray = new Array<
      Promise<void | MESSAGE.ReplyRequestMakeCut>
    >();
    for (const [index, requestID] of blankList.entries()) {
      const blankFile = files[index];
      const newPath = path.join(
        IMAGE_DIR,
        "inpaint",
        `${requestID}_0${path.extname(blankFile.originalname)}`
      );
      await s3.upload(newPath, blankFile.buffer);
      promiseArray.push(
        queryManager.updateUserUploadInpaint(requestID, "inpaint", 0, newPath),
        grpcSocket.segmentation.makeCutsFromWholeImage(
          requestID,
          "inpaint",
          newPath
        )
      );
    }
    Promise.all(promiseArray)
      .then(() => {
        response.send({ success: true });
      })
      .catch((error) => {
        next(error);
      });
  }
);

router.get(
  "/cut",
  asyncRouterWrap(
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        validateParameters(request);
      } catch (error) {
        next(error);
        return;
      }
      const requestID = Number.parseInt(request.query["req_id"] as string);
      const cutIndex = Number.parseInt(request.query["cut_id"] as string);
      const cutPath = await queryManager.getPath(requestID, "cut", cutIndex);
      if (!cutPath) {
        next(new createError.InternalServerError());
        return;
      }
      const cut = await s3.download(cutPath);
      response.type("png");
      response.end(cut);
    }
  )
);

router.get(
  "/result",
  asyncRouterWrap(
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        validateParameters(request);
      } catch (error) {
        next(error);
        return;
      }
      const requestID = Number.parseInt(request.query["req_id"] as string);
      const cutIndex = Number.parseInt(request.query["cut_id"] as string);
      const progress = await queryManager.checkProgress(requestID, cutIndex);
      response.send({ progress: Math.min(progress, 100) });
    }
  )
);

router.get(
  "/result/inpaint",
  asyncRouterWrap(
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        validateParameters(request);
      } catch (error) {
        next(error);
        return;
      }
      const requestID = Number.parseInt(request.query["req_id"] as string);
      const cutIndex = Number.parseInt(request.query["cut_id"] as string);
      const inpaintPath = await queryManager.getPath(
        requestID,
        "inpaint",
        cutIndex
      );
      if (!inpaintPath) {
        next(createError.NotFound);
        return;
      }
      const inpaint = await s3.download(inpaintPath);
      response.type("png");
      response.end(inpaint);
    }
  )
);

router.get(
  "/result/mask",
  asyncRouterWrap(
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        validateParameters(request);
      } catch (error) {
        next(error);
        return;
      }
      const requestID = Number.parseInt(request.query["req_id"] as string);
      const cutIndex = Number.parseInt(request.query["cut_id"] as string);
      const maskPath = await queryManager.getPath(requestID, "mask", cutIndex);
      if (!maskPath) {
        next(createError.NotFound);
        return;
      }
      const mask = await s3.download(maskPath);
      response.send({ mask: JSON.parse(mask.toString()) as JSON });
    }
  )
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
  asyncRouterWrap(
    async (request: Request, response: Response, next: NextFunction) => {
      validateParameters(request);
      const body = request.body as PostMaskBody;
      const requestID = Number.parseInt(body["req_id"]);
      const cutIndex = Number.parseInt(body["cut_id"]);
      const mask: Array<RLEResult> = (JSON.parse(body["mask"]) as RLE)[
        "result"
      ];
      if (mask == undefined) {
        next(createError.NotFound);
        return;
      }
      const mask_path = await queryManager.getPath(requestID, "mask", cutIndex);
      try {
        await s3.upload(mask_path, Buffer.from(JSON.stringify(mask)));
      } catch {
        next(new createError.InternalServerError());
      }

      const rle: Array<Array<number>> = [];
      for (const element of mask) {
        rle.push(element["value"]["rle"]);
      }
      grpcSocket.segmentation
        .updateMask(requestID, cutIndex, rle)
        .then(() => {
          response.send({ success: true });
        })
        .catch((error) => {
          next(error);
        });
    }
  )
);

export default router;
