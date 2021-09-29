import express from "express";

import { Request, Response } from "express-serve-static-core";
import { queryManager } from "src/sql/mysql_connection_manager";
import { asyncRouterWrap } from "src/modules/utils";
import { s3 } from "src/modules/s3_wrapper";
import createHttpError from "http-errors";

const router = express.Router();

router.get(
  "/",
  asyncRouterWrap(async (request: Request, response: Response) => {
    const userID = response.locals.userID as number;
    const userInfo = await queryManager.getUser(userID);
    if (!userInfo.nickname) {
      throw new createHttpError.NotFound();
    }
    response.send({
      username: userInfo.nickname,
      create_time: userInfo.create_time,
      email: userInfo.email,
      pic_path: userInfo.pic_path,
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
