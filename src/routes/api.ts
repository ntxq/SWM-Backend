/* eslint-disable @typescript-eslint/ban-ts-comment */
import express from "express";

import ocrRouter from "src/routes/api/ocr";
import segmentationRouter from "src/routes/api/segmentation";
import profileRouter from "src/routes/api/profile";
import historyRouter from "src/routes/api/history";
import { Request, Response, NextFunction } from "express-serve-static-core";
import jsonwebtoken, { TokenExpiredError } from "jsonwebtoken";
import { jwtKey, MODE } from "src/sql/secret";
import createHttpError from "http-errors";
import { OauthJwtToken, OauthToken } from "src/routes/oauth";
import { queryManager } from "src/sql/mysql_connection_manager";
import {
  kakaoRefresh,
  kakaoVerify,
  makeAccessTokenCookie,
  accessTokens,
} from "src/modules/oauth";
// import http from "node:http";

const router = express.Router();

interface Cookie {
  kakao_token: string;
  [key: string]: string;
}

router.use(
  "*",
  function (request: Request, response: Response, next: NextFunction) {
    // @ts-ignore
    if (MODE === "dev") {
      //test account
      response.locals.userID = 1;
      next();
      return;
    }
    const token = (request.cookies as Cookie)["kakao_token"];
    try {
      const jwtObject = jsonwebtoken.verify(token, jwtKey) as OauthJwtToken;
      const accessToken = accessTokens.get(jwtObject.jwtAccessToken);
      if (accessToken) {
        response.locals.userID = accessToken.userID;
        next();
        return;
      }
      next(new createHttpError.Unauthorized());
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        const jwtObject = jsonwebtoken.decode(token) as OauthJwtToken;
        if (!accessTokens.has(jwtObject.jwtAccessToken)) {
          next(new createHttpError.Unauthorized());
          return;
        }

        const accessToken = accessTokens.get(
          jwtObject.jwtAccessToken
        ) as OauthToken;

        kakaoVerify(accessToken.accessToken)
          .then(async (isValid) => {
            //get new access token
            if (!isValid) {
              const refreshToken = await queryManager.getRefreshToken(
                jwtObject.index
              );
              const refreshResult = await kakaoRefresh(refreshToken);
              accessTokens.delete(jwtObject.jwtAccessToken);
              accessToken.accessToken = refreshResult.access_token;

              //set new refresh token
              if (refreshResult.refresh_token) {
                accessToken.index = await queryManager.setRefreshToken(
                  accessToken.userID,
                  refreshResult.refresh_token
                );
              }
            }
            //set new access jwt token
            const token = makeAccessTokenCookie(accessToken);
            response.cookie("kakao_token", token);
            next();
          })
          .catch((error) => {
            next(error);
            return;
          });
      } else {
        console.error(error);
        next(new createHttpError.Forbidden());
      }
    }
  }
);

router.use("/OCR", ocrRouter);
router.use("/segmentation", segmentationRouter);
router.use("/profile", profileRouter);
router.use("/history", historyRouter);

export default router;
