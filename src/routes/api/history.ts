import express from "express";

import { Request, Response } from "express-serve-static-core";
import { queryManager } from "src/sql/mysql_connection_manager";
import { asyncRouterWrap, validateParameters } from "src/modules/utils";
import { s3 } from "src/modules/s3_wrapper";

const router = express.Router();
router.get(
  "/donwload",
  asyncRouterWrap(async (request: Request, response: Response) => {
    validateParameters(request);
    const requestID = Number.parseInt(request.query["req_id"] as string);
    const cutPath = await queryManager.getPath(requestID, "complete", 0);
    const downloadURL = await s3.getDownloadURL(cutPath);
    response.send({ s3_url: downloadURL });
  })
);

export default router;
