import express from 'express';
import fs from 'fs';
import { IMAGE_DIR, JSON_DIR } from 'src/modules/const';
import path from 'path';
import { mysql_connection, Procedure } from 'src/sql/sql_connection';
import { grpcSocket } from 'src/gRPC/grpc_socket';

import { Request, Response, NextFunction } from 'express-serve-static-core';
import { multer_image } from 'src/routes/multer_options';
import createError from 'http-errors';
import { queryManager } from 'src/sql/mysqlConnectionManager';

var router = express.Router();

router.post('/source', multer_image.array('source'), async (req:Request,res:Response) => {
	//todo 최준영 제대로 된 user id 로 변환
	const user_id = 123123123

	const project_id = await queryManager.add_project(user_id,req.body['title'])
	const files = req.files as Express.Multer.File[];

	queryManager.add_original_sources(project_id,files).then(([req_id_map,path_id_map] : [Map<string,number>,Map<number,string>])=>{
		queryManager.set_original_file_paths(path_id_map).then(()=>{
			res.send({req_ids:Object.fromEntries(req_id_map)})
		})
	})
});

router.post('/blank', multer_image.array('blank'), (req:Request,res:Response,next:NextFunction) => {
	//todo 최준영 제대로 된 user id 로 변환
	const blank_not_exist_ids:number[] = JSON.parse(req.body.empty_id)
	const map_ids:number[] = JSON.parse(req.body.map_ids);
	const files = req.files as Express.Multer.File[];
	const req_id_map = new Map<string,number>();

	//set query and response data
	const id_path_map = new Map<number,string>();
	for(var i =0;i<map_ids.length;i++){
		const req_id = map_ids[i]
		const blank_file = files[i];

		const old_path = blank_file.path
		const new_path = `${IMAGE_DIR}/blank/${req_id}${path.extname(blank_file.originalname)}`
		fs.promises.rename(old_path, new_path)
		req_id_map.set(blank_file.originalname,req_id)
		id_path_map.set(req_id,new_path)
	}

	//send start ai processing signal
	blank_not_exist_ids.forEach(req_id=>{
		grpcSocket.segmentation.Start(req_id)
	})

	//set inpaints on db
	queryManager.set_blanks(id_path_map).then((status_code)=>{
		if(status_code !== 200){
			res.statusCode = status_code
			next(createError(res.statusCode));
			return;
		}
		res.send({req_ids:Object.fromEntries(req_id_map)})
	})
})

router.get('/result', (req:Request,res:Response) => {
	const req_id = parseInt(req.query['req_id'] as string)
	queryManager.check_progress(req_id,'inpaint').then((complete)=>{
		res.send({complete:complete})
	})
});

router.get('/result/inpaint', (req:Request,res:Response,next:NextFunction) => {
	const req_id = parseInt(req.query['req_id'] as string)
	const inpaint = `${IMAGE_DIR}/inpaint/${req_id}_0.png`
	if(!fs.existsSync(inpaint)){
		next(createError(404))
		return;
	}
	res.sendFile(inpaint)
});

router.get('/result/mask', (req:Request,res:Response,next:NextFunction) => {
	const req_id = parseInt(req.query['req_id'] as string)
	const mask = `${JSON_DIR}/mask/${req_id}.json`
	if(!fs.existsSync(mask)){
		next(createError(404))
		return;
	}
	res.send({mask:require(mask)})
});

router.post('/mask', (req:Request,res:Response,next:NextFunction) => {
	const req_id = parseInt(req.body['req_id'] as string)
	const mask = JSON.parse(req.body['mask'])['result']
	if(mask == undefined){
		next(createError(400))
		return;
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