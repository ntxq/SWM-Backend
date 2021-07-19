import express from 'express';
import multer, { FileFilterCallback } from 'multer';
import fs from 'fs';
import { isImageFile } from 'src/modules/utils';
import { IMAGE_DIR } from 'src/modules/const';
import path from 'path';
import { req_now_step, req_ocr_result, save_ocr_result } from 'src/modules/req_ai_server';
import { mysql_connection, Procedure } from 'src/sql/sql_connection';
import { grpcSocket } from 'src/gRPC/grcp_socket';

import { Request, Response } from 'express-serve-static-core'

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

var fileFilter = function(req:Request, file:Express.Multer.File, cb:FileFilterCallback){
	if(!isImageFile(file)){
		(req.res as Response).statusCode = 415
		// req.h = 'goes wrong on the mimetype';
		cb(Error('Error: Images Only!'));
	}
	return cb(null,true)
}
  
const upload = multer({ storage: storage, fileFilter:fileFilter, limits: { fileSize: 1024 * 1024 * 1024 } });


router.post('/source', upload.array('source'), (req:Request,res:Response) => {
	try{
		const req_id_map = new Map<string,number>();
		//todo 최준영 제대로 된 user id 로 변환
		const user_id = 123123123
		const files = req.files as Express.Multer.File[];
		const procedures = Array<Procedure>();
		for(var i =0;i<files.length;i++){
			const file = files[i]
			const procedure:Procedure = {
				query:'sp_add_original_source',
				parameters:[user_id,file.originalname],
				callback:(rows:any,err:any)=>{
					const req_id = rows['id']
					const old_path = file.path
					const new_path = `${IMAGE_DIR}/original/${req_id}${path.extname(file.originalname)}`
					fs.promises.rename(old_path, new_path)
					req_id_map.set(file.originalname,req_id)
				}
			}
			procedures.push(procedure)
		}
		mysql_connection.callMultipleProcedure(procedures,(err:any,result:any)=>{
			res.send({req_id_map:Object.fromEntries(req_id_map)})
		})
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