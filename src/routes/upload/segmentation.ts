import express from 'express';
import fs from 'fs';
import { IMAGE_DIR } from 'src/modules/const';
import path from 'path';
import { mysql_connection, Procedure } from 'src/sql/sql_connection';
import { grpcSocket } from 'src/gRPC/grcp_socket';

import { Request, Response, NextFunction } from 'express-serve-static-core';
import { multer_image } from 'src/routes/multer_options';
import createError from 'http-errors';

var router = express.Router();

router.post('/source', multer_image.array('source'), (req:Request,res:Response) => {
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
		res.send({req_ids:Object.fromEntries(req_id_map)})
	})
});

router.post('/blank', multer_image.array('blank'), (req:Request,res:Response,next:NextFunction) => {
	//todo 최준영 제대로 된 user id 로 변환
	const user_id = 123123123
	const blank_not_exist_ids:number[] = JSON.parse(req.body.empty_id)
	const map_ids:number[] = JSON.parse(req.body.map_ids);
	const files = req.files as Express.Multer.File[];
	const req_id_map = new Map<string,number>();
	const procedures = Array<Procedure>();

	for(var i =0;i<map_ids.length;i++){
		const req_id = map_ids[i]
		const blank_file = files[i];
		const procedure:Procedure = {
			query:'sp_set_balnk_source',
			parameters:[req_id,user_id,blank_file.originalname],
			callback:(rows:any,err:any)=>{
				if(err){
					res.status(400);
					return;
				}
				const old_path = blank_file.path
				const new_path = `${IMAGE_DIR}/blank/${req_id}${path.extname(blank_file.originalname)}`
				fs.promises.rename(old_path, new_path)
				req_id_map.set(blank_file.originalname,req_id)
			}
		}
		procedures.push(procedure)
	}
	
	blank_not_exist_ids.forEach(req_id=>{
		grpcSocket.segmentation.Start(parseInt(req_id))
	})

	mysql_connection.callMultipleProcedure(procedures,(err:any,result:any)=>{
		if(err){
			next(createError(res.statusCode));
			return;
		}
		res.send({req_ids:Object.fromEntries(req_id_map)})
	})
})

router.get('/result', (req:Request,res:Response) => {
	const req_id = parseInt(req.query['req_id'] as string)
	const inpaint = `${IMAGE_DIR}/inpaint/${req_id}.png`
	const mask = `${IMAGE_DIR}/mask/${req_id}.png`
	const complete = fs.existsSync(mask) && fs.existsSync(inpaint)
	res.send({complete:complete})
});

router.get('/result/inpaint', (req:Request,res:Response,next:NextFunction) => {
	const req_id = parseInt(req.query['req_id'] as string)
	const inpaint = `${IMAGE_DIR}/inpaint/${req_id}.png`
	if(!fs.existsSync(inpaint)){
		next(createError(404))
	}
	res.sendFile(inpaint)
});

router.get('/result/mask', (req:Request,res:Response,next:NextFunction) => {
	const req_id = parseInt(req.query['req_id'] as string)
	const mask = `${IMAGE_DIR}/mask/${req_id}.png`
	if(!fs.existsSync(mask)){
		next(createError(404))
	}
	res.sendFile(mask)
});

router.post('/mask', (req:Request,res:Response,next:NextFunction) => {
	const req_id = parseInt(req.body['req_id'] as string)
	const mask = JSON.parse(req.body['mask'])['result']
	if(mask == undefined){
		next(createError(400))
	}
	const mask_path = `${IMAGE_DIR}/mask/${req_id}.json`
	fs.writeFile(mask_path,JSON.stringify(mask),(err)=>{
		console.log(err)
	})

	const rle: Array<Array<number>> = []
	for(var i =0;i<mask.length;i++){
		rle.push(mask[i]['value']['rle'])
	}
	grpcSocket.segmentation.UpdateMask(req_id,rle)
	res.send({success:true})
});

export default router;