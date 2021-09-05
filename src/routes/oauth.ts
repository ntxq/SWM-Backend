import passport from "passport";
import { Profile, Strategy } from "passport-kakao";
import express from "express";
import { Request, Response, NextFunction } from "express-serve-static-core";
import jsonwebtoken from "jsonwebtoken";
import { queryManager } from "src/sql/mysql_connection_manager";
import { jwtKey } from "src/sql/secret";

const router = express.Router();

export interface OauthJwt {
  accessToken: string;
  index: number;
}
export const accessTokens: Map<string, Date> = new Map<string, Date>();

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
            const jwt: OauthJwt = {
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

export function setAccessTokenCookie(
  response: Response,
  jwtObject: OauthJwt
): string {
  const token = jsonwebtoken.sign(jwtObject, jwtKey, { expiresIn: "30m" });
  accessTokens.set(jwtObject.accessToken, new Date());
  response.cookie("kakao_token", token);
  return token;
}

router.get("/", (request, response, next) => {
  const authCallback: authCallback = passport.authenticate(
    "kakao",
    (error, jwtObject: OauthJwt) => {
      setAccessTokenCookie(response, jwtObject);
      response.redirect("/home");
    }
  ) as authCallback;
  authCallback(request, response, next);
});

export default router;
