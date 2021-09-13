import passport from "passport";
import { Profile, Strategy } from "passport-kakao";
import express from "express";
import { Request, Response, NextFunction } from "express-serve-static-core";
import { queryManager } from "src/sql/mysql_connection_manager";
import { makeAccessTokenCookie } from "src/modules/oauth";
import { KAKAO_ID } from "src/sql/secret";

const router = express.Router();

export interface OauthJwtToken {
  jwtAccessToken: string;
  index: number;
}

export interface OauthToken {
  accessToken: string;
  index: number;
  userID: number;
}

export function initKakaoOauth(): void {
  passport.use(
    "kakao",
    new Strategy(
      {
        clientID: KAKAO_ID,
        callbackURL: "", // 위에서 설정한 Redirect URI
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
            const index = await queryManager.setRefreshToken(ID, refreshToken);
            const jwt: OauthToken = {
              accessToken: accessToken,
              index: index,
              userID: ID,
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

router.get("/", (request, response, next) => {
  const authCallback: authCallback = passport.authenticate(
    "kakao",
    (error, tokenObject: OauthToken) => {
      const token = makeAccessTokenCookie(tokenObject);
      response.cookie("kakao_token", token);
      response.redirect("/home");
    }
  ) as authCallback;
  authCallback(request, response, next);
});

router.get("/logout", (request, response) => {
  response.cookie("kakao_token", "none", {
    expires: new Date(Date.now() - 1),
  });

  response
    .status(200)
    .json({ success: true, message: "User logged out successfully" });
});

export default router;
