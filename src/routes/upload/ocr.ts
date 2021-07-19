import express from 'express';
import { req_now_step, req_ocr_result, save_ocr_result } from 'src/modules/req_ai_server';

import { Request, Response } from 'express-serve-static-core'

var router = express.Router();

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