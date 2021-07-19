import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { isImageFile, generate_id } from '../../modules/utils';
import { IMAGE_DIR } from '../../modules/const';
import path from 'path';
import { req_now_step, req_ocr_result, save_ocr_result } from '../../modules/req_ai_server';

interface ImageRequest extends Request{
	req_id?:number;
}

import { Request, Response, NextFunction } from 'express-serve-static-core'

var router = express.Router();

var prefix = 0

var storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, IMAGE_DIR);
	},
	filename: function (req, file, cb) {
	  cb(null, file.originalname);
	}
})
var fileFilter = function(req:express.Request, file, cb){
	if(!isImageFile(file)){
		req.res.statusCode = 415
		// req.h = 'goes wrong on the mimetype';
		cb('Error: Images Only!');
	}
	cb(null,true)
}
  
const upload = multer({ storage: storage, fileFilter:fileFilter, limits: { fileSize: 1024 * 1024 * 1024 } });


router.post('/source', upload.array('source'), (req,res) => {
	try{
		const files = req.files as Express.Multer.File[];
		for (var i = 0; i < files.length;i++) {
			console.log(res.statusCode)
			if(req){
				res.status(415).send("jpg,jpeg,png파일만 업로드 가능합니다.")
				return
			}
		}
		const req_id = generate_id();
		for (var i = 0; i < files.length;i++) {
			const file = files[i]
			const old_path = file.path
			const new_path = `${IMAGE_DIR}/original/${req.req_id}_${i}${path.extname(file.originalname)}`
			fs.rename(old_path, new_path, function (err) {
				if (err) {
					console.error(err)
					throw err
				}
				console.log('Successfully renamed - AKA moved!')
			})
		}
		// send_to_ai_server();
		res.send({req_id:req_id})
	}
	catch{
		res.status(500).send({msg:"internel error"});
	}
});

router.get('/progress', (req,res) => {
	try{
		const req_id = req.params['req_id']
		var step = req.params['step']
		// step = get_now_step(req_id,step)
		res.send({step:step})
	}
	catch{
		res.status(500).send({msg:"internel error"});
	}
});

router.get('/result', (req,res) => {
	try{
		const req_id = req.params['req_id']
		const data = {} // get_ocr_result(req_id)
		res.send({data:data})
	}
	catch{
		res.status(500).send({msg:"internel error"});
	}
});

router.post('/confirm', (req,res) => {
	try{
		const data = req.body['data']
		// save_ocr_result(data)
		res.send({})
	}
	catch{
		res.status(500).send({msg:"internel error"});
	}
});

export default router;