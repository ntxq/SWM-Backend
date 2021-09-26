import passport from "passport";
import { Profile, Strategy } from "passport-kakao";
import express from "express";
import { Request, Response, NextFunction } from "express-serve-static-core";
import { queryManager } from "src/sql/mysql_connection_manager";
import { makeAccessTokenCookie } from "src/modules/oauth";
import { KAKAO_ID } from "src/sql/secret";
import createHttpError from "http-errors";

const router = express.Router();

export interface KakaoProfile {
  username: string;
  email?: string;
  id: number;
  pic_path: string;
}

export interface ResponseProfile {
  createTime: Date;
  username: string;
  email?: string;
}

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
        const kakao_profile: KakaoProfile = {
          id: Number.parseInt(profile.id),
          username: profile.username as string,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          email: profile._json.kakao_account.email as string,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          pic_path: profile._json.kakao_account.profile
            .thumbnail_image_url as string,
        };
        const ID = kakao_profile.id;
        queryManager
          .getUser(ID)
          .then(async (userInfo) => {
            //set user profile
            if (!userInfo.create_time) {
              await queryManager.addUser(
                kakao_profile.id,
                kakao_profile.username,
                kakao_profile.email,
                kakao_profile.pic_path
              );
            }
            //refresh token
            const index = await queryManager.setRefreshToken(ID, refreshToken);
            const jwt: OauthToken = {
              accessToken: accessToken,
              index: index,
              userID: ID,
            };
            //response
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
  try {
    const authCallback: authCallback = passport.authenticate(
      "kakao",
      (error, tokenObject: OauthToken) => {
        if (error) {
          next(new createHttpError.InternalServerError());
          return;
        }
        const token = makeAccessTokenCookie(tokenObject);
        response.cookie("kakao_token", token);
        response.redirect("/home");
      }
    ) as authCallback;
    authCallback(request, response, next);
  } catch {
    next(new createHttpError.InternalServerError());
  }
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
