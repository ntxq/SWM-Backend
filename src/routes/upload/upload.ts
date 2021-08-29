import express from "express";

import ocrRouter from "src/routes/upload/ocr";
import segmentationRouter from "src/routes/upload/segmentation";

const router = express.Router();

router.use("/OCR", ocrRouter);
router.use("/segmentation", segmentationRouter);

export default router;
