import passport from "passport";
import { Profile, Strategy } from "passport-kakao";
import express from "express";
import { Request, Response, NextFunction } from "express-serve-static-core";
import jsonwebtoken from "jsonwebtoken";
import { queryManager } from "src/sql/mysql_connection_manager";
import { jwtKey } from "src/sql/secret";
import crypto from "node:crypto";

const router = express.Router();

export interface OauthJwtToken {
  jwtAccessToken: string;
  index: number;
}

export interface OauthToken {
  accessToken: string;
  index: number;
}
export const accessTokens: Map<string, OauthToken> = new Map<
  string,
  OauthToken
>();

export function initKakaoOauth(): void {
  passport.use(
    "kakao",
    new Strategy(
      {
        clientID: "4ee38a9230dc15bb654d1a79386e0e7c",
        callbackURL: "http://localhost:3000/oauth", // 위에서 설정한 Redirect URI
        clientSecret: "",
      },
      (accessToken, refreshToken, profile: Profile, done) => {
        const ID = Number.parseInt(profile.id);
        queryManager
          .existUser(ID)
          .then(async (isExist) => {
            if (isExist == false) {
              await queryManager.addUser(ID);
            }
            const index = await queryManager.setRepreshToken(ID, refreshToken);
            const jwt: OauthToken = {
              accessToken: accessToken,
              index: index,
            };
            done(undefined, jwt);
          })
          .catch((error) => {
            done(error);
          });
      }
    )
  );
  // 패스포트 설정
  passport.serializeUser(function (user, done) {
    const kakao_user: Profile = user as Profile;
    console.log("serialize");
    console.log(kakao_user);
    done(undefined, kakao_user.id);
  });

  passport.deserializeUser<number>(function (userID, done) {
    console.log("deserialize");
    console.log(userID);
    done(undefined, userID);
  });
}

router.get("/kakao", passport.authenticate("kakao"));

type authCallback = (
  request: Request,
  response: Response,
  next: NextFunction
) => void;

function generate_token() {
  let id = crypto.randomBytes(20).toString("hex");
  while (accessTokens.has(id)) {
    id = crypto.randomBytes(20).toString("hex");
  }
  return id;
}

export function setAccessTokenCookie(
  response: Response,
  tokenObject: OauthToken
): string {
  const jwtAccessToken = generate_token();
  const jwtToken: OauthJwtToken = {
    jwtAccessToken: jwtAccessToken,
    index: tokenObject.index,
  };
  const token = jsonwebtoken.sign(jwtToken, jwtKey, { expiresIn: "30m" });
  accessTokens.set(jwtAccessToken, tokenObject);
  response.cookie("kakao_token", token);
  return token;
}

router.get("/", (request, response, next) => {
  const authCallback: authCallback = passport.authenticate(
    "kakao",
    (error, tokenObject: OauthToken) => {
      setAccessTokenCookie(response, tokenObject);
      response.redirect("/home");
    }
  ) as authCallback;
  authCallback(request, response, next);
});

export default router;
