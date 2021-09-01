import express from "express";
import axios from "axios";
import { Request, Response, NextFunction } from "express-serve-static-core";
import { asyncRouterWrap } from "src/modules/utils";

const kakaoRouter = express.Router();

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_token_expires_in: number;
  token_type: string;
};

//나중에 process.env.NODE_ENV로 localhost || AWS 변경되게
const REDIRECT_URL = "http://localhost:3000/oauth";

async function getKakaoToken(authCode: string): Promise<string> {
  const token = await axios
    .post(
      "https://kauth.kakao.com/oauth/token",
      {
        grant_type: "authorization_code",
        client_id: "4ee38a9230dc15bb654d1a79386e0e7c", //env에서 가져오기
        redirect_uri: REDIRECT_URL,
        code: authCode,
      },
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    )
    .then((response) => response.data as TokenResponse)
    .then((data) => data.access_token);

  return token;
}

kakaoRouter.get(
  "/",
  asyncRouterWrap(async (request: Request, response: Response) => {
    //authCode는 따로 저장할 필요가 없음
    const authCode = request.query.code as string;
    const token = await getKakaoToken(authCode);

    response.cookie("kakao_token", token);
    response.redirect("../");
  })
);

export default kakaoRouter;
