import express from 'express';
import multer, { FileFilterCallback } from 'multer';
import fs from 'fs';
import { isImageFile, generate_id } from 'src/modules/utils';
import { IMAGE_DIR } from 'src/modules/const';
import path from 'path';
import { req_now_step, req_ocr_result, save_ocr_result } from 'src/modules/req_ai_server';
import { mysql_connection } from 'src/sql/sql_connection';
import { grpcSocket } from 'src/gRPC/grcp_socket';

interface ImageRequest extends Request{
	name?:string;
}

import { Request, Response, NextFunction } from 'express-serve-static-core'

var router = express.Router();

var prefix = 0

var storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, IMAGE_DIR);
	},
	filename: function (req, file, cb) {
		prefix += 1
		cb(null, Date.now() + prefix + file.originalname);
	}
})

var fileFilter = function(req:ImageRequest, file:Express.Multer.File, cb:FileFilterCallback){
	if(!isImageFile(file)){
		(req.res as Response).statusCode = 415
		// req.h = 'goes wrong on the mimetype';
		cb(Error('Error: Images Only!'));
	}
	if(!req.name){
		req.name = file.originalname
	}
	return cb(null,true)
}
  
const upload = multer({ storage: storage, fileFilter:fileFilter, limits: { fileSize: 1024 * 1024 * 1024 } });


router.post('/source', upload.array('source'), (req:ImageRequest,res:Response) => {
	try{
		//todo 최준영 제대로 된 user id 로 변환
		const user_id = 'test_user_junyeong'
		const files = req.files as Express.Multer.File[];
		mysql_connection.callProcedure('sp_add_original_source',[user_id,files.length,req.name],async (rows: any)=>{
			const req_id = rows['id']
			for (var i = 0; i < files.length;i++) {
				const file = files[i]
				const old_path = file.path
				const new_path = `${IMAGE_DIR}/original/${req_id}_${i}${path.extname(file.originalname)}`
				await fs.promises.rename(old_path, new_path)
			};
			grpcSocket.StartOCR(req_id,files.length)
			res.send({req_id:req_id})
		},()=>{})
	}
	catch(e){
		res.status(500).send({msg:"internel error"});
	}
});

router.get('/progress', (req:Request,res:Response) => {
	try{
		const req_id = parseInt(req.params['req_id'])
		var step = req_now_step(req_id,parseInt(req.params['step']))
		res.send({step:step})
	}
	catch{
		res.status(500).send({msg:"internel error"});
	}
});

router.get('/result', (req:Request,res:Response) => {
	try{
		const req_id = parseInt(req.params['req_id'])
		const data = req_ocr_result(req_id)
		res.send({data:data})
	}
	catch{
		res.status(500).send({msg:"internel error"});
	}
});

router.post('/confirm', (req:Request,res:Response) => {
	try{
		const data = req.body['data']
		save_ocr_result(data)
		res.send({})
	}
	catch{
		res.status(500).send({msg:"internel error"});
	}
});

export default router;