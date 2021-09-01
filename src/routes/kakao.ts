import passport from "passport";
import { Strategy } from "passport-kakao";
import express from "express";

const router = express.Router();
export function getKakaoOauth(){
    passport.use("kakao", new Strategy({
      clientID: "",
      callbackURL: "/oauth",     // 위에서 설정한 Redirect URI
      clientSecret: "",
    }, async (accessToken, refreshToken, profile, done) => {
        console.log(profile)
      console.log(accessToken);
      console.log(refreshToken);
    }))
  }
getKakaoOauth();

router.get('/',(req,res)=>{
    console.log(req.query)
    res.redirect('/');
});

router.get('/kakao', passport.authenticate('kakao', {
    failureRedirect: '/',
}), (req, res) => {
    res.redirect('/auth');
});

export default router;