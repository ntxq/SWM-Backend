import multer, { FileFilterCallback } from 'multer';
import { IMAGE_DIR } from 'src/modules/const';
import { isImageFile } from 'src/modules/utils';
import { Request, Response, NextFunction } from 'express-serve-static-core'

var storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, IMAGE_DIR);
	},
	filename: function (req, file, cb) {
		cb(null, Date.now() + file.originalname);
	}
})

var fileFilter = function(req:Request, file:Express.Multer.File, cb:FileFilterCallback){
	if(!isImageFile(file)){
		(req.res as Response).statusCode = 415
		// req.h = 'goes wrong on the mimetype';
		cb(Error('Error: Images Only!'));
	}
	return cb(null,true)
}
  
export const multer_image = multer({ storage: storage, fileFilter:fileFilter, limits: { fileSize: 1024 * 1024 * 1024 } });