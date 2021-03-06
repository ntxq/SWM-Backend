/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable no-prototype-builtins */
import { expect } from "chai";
import jsonwebtoken from "jsonwebtoken";
import { jwtKey } from "src/sql/secret";
import {
  generate_token,
  kakaoRefresh,
  kakaoVerify,
  makeAccessTokenCookie,
} from "src/modules/oauth";
import { OauthJwtToken } from "src/routes/oauth";

describe("oauth", function () {
  const test_access_token = {
    accessToken: "string",
    index: 0,
    userID: 123_123,
  };

  describe("oauth token managing", function () {
    it("generate_token", function (done) {
      expect(generate_token()).to.be.a("string");
      done();
    });
    it("makeAccessTokenCookie", function (done) {
      const token = makeAccessTokenCookie(test_access_token);
      const jwtObject = jsonwebtoken.verify(token, jwtKey) as OauthJwtToken;
      expect(jwtObject.jwtAccessToken).to.be.a("string");
      expect(jwtObject.index).to.be.equal(test_access_token.index);
      done();
    });
  });

  describe("kakao oauth modules", function () {
    it("kakaoVerify", async function () {
      //카카오 서버에서 발급받은 토큰이 아니다
      const result = await kakaoVerify(test_access_token.accessToken);
      expect(result).to.be.equal(false);
    });
    it("kakaoRefresh", function (done) {
      kakaoRefresh(test_access_token.accessToken)
        .then((response) => {
          done(response);
        })
        .catch((error) => {
          done();
        });
    });
  });
});
