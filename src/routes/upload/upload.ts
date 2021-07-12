import createError from "http-errors"
import express from 'express';

import ocrRouter from './ocr'

var router = express.Router();

router.use('/OCR', ocrRouter);

// catch 404 and forward to error handler
router.use(function(req, res, next) {
  next(createError(404));
});

// error handler
router.use(function(err, req, res, next) {
  // set locals, only providing error in development
  if(res.statusCode === 415)
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
