import createError from "http-errors"
import express from 'express';

import ocrRouter from './ocr'

import { Request, Response, NextFunction } from 'express-serve-static-core'

var router = express.Router();

router.use('/OCR', ocrRouter);

// catch 404 and forward to error handler
router.use(function(req, res, next) {
  next(createError(404));
});

// error handler
router.use(function(err:createError.HttpError, req:Request, res:Response, next:NextFunction) {
  // set locals, only providing error in development
  if(res.statusCode === 415){
    res.status(415).send('error');
    return;
  }
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.send('error');
});

/* GET home page. */
router.get('/', function(req, res, next) {
    res.send('index');
});

module.exports = router;
