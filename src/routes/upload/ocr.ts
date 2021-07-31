import express from 'express';

import { Request, Response } from 'express-serve-static-core'
import { grpcSocket } from 'src/gRPC/grpc_socket';
import { JSON_DIR } from 'src/modules/const';
import fs from 'fs';

var router = express.Router();

interface BBox{
	bbox_id:number,
	originalX:number,
	originalY:number,
	originalWidth:number,
	originalHeight:number,
	originalText:string,
	translatedText:string
}

interface ResponseBBox extends BBox{
}

interface RequestBBox extends BBox{
	translatedX:number,
	translatedY:number,
	translatedWidth:number,
	translatedHeight:number,
	fontColor:string,
	fontSize:string,
	fontFamily:string,
	fontWeight:string,
	fontStyle:string
}


interface StyleBBox{
	bbox_id:number,
	target:string,
	fontSize:string,
	fontColor:string,
	fontType:string,
}

router.get('/select', (req:Request,res:Response) => {
	const req_id = parseInt(req.query['req_id'] as string)
	grpcSocket.OCR.Start(req_id)
	res.send({success:true})
});

router.get('/result', (req:Request,res:Response) => {
	const req_id = parseInt(req.query['req_id'] as string)
	const bbox = `${JSON_DIR}/bbox/${req_id}.json`
	const complete = fs.existsSync(bbox)
	res.send({complete:complete})
});

router.get('/result/bbox', (req:Request,res:Response) => {
	const req_id = parseInt(req.query['req_id'] as string)
	const bboxList:ResponseBBox[] = require(`${JSON_DIR}/bbox/${req_id}.json`)
	res.send({bboxList:bboxList})
});

router.post('/edit', (req:Request,res:Response) => {
	const req_id = parseInt(req.params['req_id'])
	const bboxList:RequestBBox[] = JSON.parse(req.params['bboxList'])
	// UpdateBbox(req_id,bboxList)
	res.send({success:true})
});

router.post('/styles', (req:Request,res:Response) => {
	const req_id = parseInt(req.params['req_id'])
	const bboxList:StyleBBox[] = JSON.parse(req.params['bboxList'])
	// UpdateBboxStyle(req_id,bboxList)
	res.send({success:true})
});

export default router;