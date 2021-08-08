import express from 'express';

import { Request, Response, NextFunction } from 'express-serve-static-core';
import { grpcSocket } from 'src/gRPC/grpc_socket';
import { queryManager } from 'src/sql/mysqlConnectionManager';
import * as MESSAGE from 'src/gRPC/grpc_message_interface';
import createHttpError from 'http-errors';

var router = express.Router();

export interface BBox{
	bbox_id:number,
	originalX:number,
	originalY:number,
	originalWidth:number,
	originalHeight:number,
	originalText:string,
	translatedText?:string
}

export interface TranslateBBox extends BBox{
	translatedX:number,
	translatedY:number,
	translatedWidth:number,
	translatedHeight:number,
	fontColor:string,
	fontSize:number,
	fontFamily:string,
	fontWeight:string,
	fontStyle:string
}

router.get('/select', (req:Request,res:Response, next:NextFunction) => {
	const req_id = parseInt(req.query['req_id'] as string)
	const cut_id = parseInt(req.query['cut_id'] as string)
	grpcSocket.OCR.Start(req_id,cut_id)
	.then((response)=>{
		res.send({success:true})
	})
	.catch((err:createHttpError.HttpError)=>{
		next(err);
	})
});

router.get('/result', (req:Request,res:Response) => {
	const req_id = parseInt(req.query['req_id'] as string)
	const cut_id = parseInt(req.query['cut_id'] as string)
	queryManager.check_progress(req_id,'bbox',cut_id).then((complete)=>{
		res.send({complete:complete})
	})
});

router.get('/result/bbox', (req:Request,res:Response) => {
	const req_id = parseInt(req.query['req_id'] as string)
	const cut_id = parseInt(req.query['cut_id'] as string)
	queryManager.get_bboxes(req_id,cut_id).then((bboxList:BBox[])=>{
		res.send({bboxList:bboxList})
	})
});

router.post('/edit', (req:Request,res:Response) => {
	const req_id = parseInt(req.body['req_id'])
	const cut_id = parseInt(req.body['cut_id'] as string)
	const bboxList:TranslateBBox[] = JSON.parse(req.body['bboxList'])
	queryManager.set_bboxes_with_translate(req_id,cut_id,bboxList).then(()=>{
		res.send({success:true})
	})
});

export default router;