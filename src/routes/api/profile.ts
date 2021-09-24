import express from "express";

import { Request, Response } from "express-serve-static-core";
import { grpcSocket } from "src/gRPC/grpc_socket";
import { queryManager } from "src/sql/mysql_connection_manager";
import {
  asyncRouterWrap,
  validateParameters,
  validateRequestID,
} from "src/modules/utils";
import { s3 } from "src/modules/s3_wrapper";
import createHttpError from "http-errors";

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
  "/",
  asyncRouterWrap(async (request: Request, response: Response) => {
    const userID = response.locals.userID as number;
    const userInfo = await queryManager.getUser(userID);
    if (!userInfo.nickname) {
      throw new createHttpError.NotFound();
    }
    const pic_url =
      typeof userInfo.pic_path === "string"
        ? s3.getDownloadURL(userInfo.pic_path)
        : undefined;
    response.send({
      username: userInfo.nickname,
      create_time: userInfo.create_time,
      email: userInfo.email,
      pic_url: pic_url,
    });
  })
);

router.put(
  "/",
  asyncRouterWrap(async (request: Request, response: Response) => {
    const userID = response.locals.userID as number;
    const email = request.query["email"] as string;
    const username = request.query["username"] as string;
    const newUserProfile: Map<string, string> = new Map<string, string>();
    if (typeof email === "string") {
      newUserProfile.set("email", email);
    }
    if (typeof username === "string") {
      newUserProfile.set("username", username);
    }
    await queryManager.editUserProfile(userID, newUserProfile);
    response.send();
  })
);

// router.put(
//   "/pic",
//   asyncRouterWrap(async (request: Request, response: Response) => {
//     const userID = response.locals.userID as number;
//     const email = request.query["email"] as string;
//     const username = request.query["username"] as string;
//     const newUserProfile: Map<string, string> = new Map<string, string>();
//     if (typeof email === "string") {
//       newUserProfile.set("email", email);
//     }
//     if (typeof username === "string") {
//       newUserProfile.set("username", username);
//     }
//     await queryManager.editUserProfile(userID, newUserProfile);
//     response.send();
//   })
// );

router.delete(
  "/",
  asyncRouterWrap(async (request: Request, response: Response) => {
    const userID = response.locals.userID as number;
    await queryManager.deleteUser(userID);
    response.send();
  })
);

export default router;
