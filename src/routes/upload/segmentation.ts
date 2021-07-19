import express from 'express';
import fs from 'fs';
import { IMAGE_DIR } from 'src/modules/const';
import path from 'path';
import { req_ocr_result } from 'src/modules/req_ai_server';
import { mysql_connection, Procedure } from 'src/sql/sql_connection';
import { grpcSocket } from 'src/gRPC/grcp_socket';

import { Request, Response } from 'express-serve-static-core'
import { multer_image } from 'src/routes/multer_options';

var router = express.Router();

router.post('/source', multer_image.array('source'), (req:Request,res:Response) => {
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
			res.send({req_ids:Object.fromEntries(req_id_map)})
		})
	}
	catch(e){
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

export default router;