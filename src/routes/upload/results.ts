import express from "express";

const router = express.Router();

/* GET home page. */
router.get("/", function (request, response) {
  response.send("index");
});

export default router;
