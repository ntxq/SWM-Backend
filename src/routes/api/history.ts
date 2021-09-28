import express from "express";

import { Request, Response } from "express-serve-static-core";
import { queryManager } from "src/sql/mysql_connection_manager";
import { asyncRouterWrap, validateParameters, validateRequestID } from "src/modules/utils";
import { s3 } from "src/modules/s3_wrapper";

const router = express.Router();

interface Request {
  id: number;
  progress: string;
  thumbnail: string;
}

export interface Project {
  id: number;
  requests: Array<Request>;
}

router.get(
  "/projects",
  asyncRouterWrap(async (request: Request, response: Response) => {
    validateParameters(request);
    const page = Number.parseInt(request.query["page"] as string);
    const projects = await queryManager.getProjects(response.locals.userID, page);
    // const downloadURL = await s3.getDownloadURL(cutPath);
    response.send({ projects: projects });
}));

router.get(
  "/download",
  asyncRouterWrap(async (request: Request, response: Response) => {
    validateParameters(request);
    const requestID = Number.parseInt(request.query["req_id"] as string);
    await validateRequestID(response.locals.userID, requestID);
    const cutPath = await queryManager.getPath(requestID, "complete", 0);
    const downloadURL = await s3.getDownloadURL(cutPath);
    response.send({ s3_url: downloadURL });
}));

export default router;
