/* eslint-disable unicorn/no-null */
/* eslint-disable @typescript-eslint/no-explicit-any */
import passport from "passport";
import { Profile, Strategy } from "passport-kakao";
import express from "express";
import { Request, Response, NextFunction } from "express-serve-static-core";

const router = express.Router();

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
        done(null, accessToken);
      }
    )
  );
  // 패스포트 설정
  passport.serializeUser(function (user, done) {
    const kakao_user: Profile = user as Profile;
    done(null, kakao_user.id);
  });

  passport.deserializeUser<number>(function (userID, done) {
    done(null, userID);
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
    (error, accessToken) => {
      response.cookie("kakao_token", accessToken);
      response.redirect("/home");
    }
  ) as authCallback;
  authCallback(request, response, next);
});

export default router;
