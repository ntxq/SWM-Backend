import jsonwebtoken from "jsonwebtoken";
import { jwtKey, KAKAO_ID } from "src/sql/secret";
import crypto from "node:crypto";
import { OauthJwtToken, OauthToken } from "src/routes/oauth";
import https, { RequestOptions } from "node:https";
import createHttpError from "http-errors";

export const accessTokens: Map<string, OauthToken> = new Map<
  string,
  OauthToken
>();

export function generate_token(): string {
  let id;
  do {
    id = crypto.randomBytes(20).toString("hex");
  } while (accessTokens.has(id));
  return id;
}

export function makeAccessTokenCookie(tokenObject: OauthToken): string {
  const jwtAccessToken = generate_token();
  const jwtToken: OauthJwtToken = {
    jwtAccessToken: jwtAccessToken,
    index: tokenObject.index,
  };
  const token = jsonwebtoken.sign(jwtToken, jwtKey, { expiresIn: "30m" });
  accessTokens.set(jwtAccessToken, tokenObject);
  return token;
}

export function kakaoVerify(key: string): Promise<boolean> {
  const options: RequestOptions = {
    hostname: "kapi.kakao.com",
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
      // let responseText = "";
      response.on("data", () => {
        // responseText += data;
        return;
      });
      response.on("error", () => {
        reject(new createHttpError.BadGateway());
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
  refresh_token?: string;
  refresh_token_expires_in?: number;
}

export function kakaoRefresh(key: string): Promise<RefreshBody> {
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
    client_id: KAKAO_ID,
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
    httpreq.write(JSON.stringify(post_data));
    httpreq.end();
  });
}
