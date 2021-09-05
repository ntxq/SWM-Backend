import express from "express";

import ocrRouter from "src/routes/upload/ocr";
import segmentationRouter from "src/routes/upload/segmentation";
import { Request, Response, NextFunction } from "express-serve-static-core";
import jsonwebtoken, { TokenExpiredError } from "jsonwebtoken";
import { jwtKey } from "src/sql/secret";
import https, { RequestOptions } from "node:https";
import createHttpError from "http-errors";
import { accessTokens, OauthJwt, setAccessTokenCookie } from "src/routes/oauth";
import { queryManager } from "src/sql/mysql_connection_manager";
// import http from "node:http";

const router = express.Router();

interface Cookie {
  kakao_token: string;
  [key: string]: string;
}

function kakaoVerify(key: string): Promise<boolean> {
  const options: RequestOptions = {
    hostname: "kauth.kakao.com",
    path: "/v1/user/access_token_info",
    method: "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      contentType: "application/x-www-form-urlencoded;charset=utf-8",
    },
  };

  return new Promise<boolean>((resolve, reject) => {
    const httpreq = https.request(options, function (response) {
      response.setEncoding("utf8");
      response.on("data", (data) => {
        console.log(data);
      });
      response.on("end", function () {
        if (response.statusCode == 401) {
          resolve(false);
        } else if (response.statusCode == 200) {
          resolve(true);
        } else if (response.statusCode == 302) {
          resolve(true);
        } else {
          reject(new createHttpError.BadGateway());
        }
      });
    });
    httpreq.end();
  });
}

interface RefreshBody {
  token_type: string;
  access_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_token_expires_in: number;
}

function kakaoRefresh(key: string): Promise<RefreshBody> {
  const options: RequestOptions = {
    hostname: "kauth.kakao.com",
    path: "/oauth/token",
    method: "POST",
    headers: {
      contentType: "application/x-www-form-urlencoded;charset=utf-8",
    },
  };
  const post_data = {
    grant_type: "refresh_token",
    client_id: "",
    refresh_token: key,
  };

  return new Promise<RefreshBody>((resolve, reject) => {
    const httpreq = https.request(options, function (response) {
      response.setEncoding("utf8");
      let body = "";
      response.on("data", function (chunk: string) {
        body += chunk;
      });

      response.on("end", function () {
        if (response.statusCode == 200) {
          const result = JSON.parse(body) as RefreshBody;
          resolve(result);
        } else {
          reject(new createHttpError.BadGateway());
        }
      });
    });
    httpreq.write(post_data);
    httpreq.end();
  });
}

router.use(
  "*",
  function (request: Request, response: Response, next: NextFunction) {
    const token = (request.cookies as Cookie)["kakao_token"];
    try {
      const jwtObject = jsonwebtoken.verify(token, jwtKey) as OauthJwt;
      if (!accessTokens.has(jwtObject.accessToken)) {
        next(new createHttpError.Unauthorized());
      }
      console.log(jwtObject);
      next();
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        const jwtObject = jsonwebtoken.decode(token) as OauthJwt;
        kakaoVerify(jwtObject.accessToken)
          .then(async (isValid) => {
            //get new access token
            if (!isValid) {
              const refreshToken = await queryManager.getRefreshToken(
                jwtObject.index
              );
              const refreshResult = await kakaoRefresh(refreshToken);
              accessTokens.delete(jwtObject.accessToken);
              jwtObject.accessToken = refreshResult.access_token;
            }
            const newJwtObject = {
              accessToken: jwtObject.accessToken,
              index: jwtObject.index,
            };
            //set new access jwt token
            setAccessTokenCookie(response, newJwtObject);
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

export default router;
