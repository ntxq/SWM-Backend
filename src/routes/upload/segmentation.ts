import express from "express";
import fs from "fs";
import { IMAGE_DIR, JSON_DIR } from "src/modules/const";
import path from "path";
import { grpcSocket } from "src/gRPC/grpc_socket";
import * as MESSAGE from "src/gRPC/grpc_message_interface";

import { Request, Response, NextFunction } from "express-serve-static-core";
import { multer_image } from "src/routes/multer_options";
import createError from "http-errors";
import { queryManager } from "src/sql/mysql_connection_manager";
import { asyncRouterWrap, s3, validateParameters } from "src/modules/utils";

var router = express.Router();

router.post("/source", multer_image.array("source"), asyncRouterWrap(async (req:Request,res:Response,next:NextFunction) => {
	try{
		validateParameters(req)
	}catch(err){
		next(err)
		return
	}
	//todo 최준영 제대로 된 user id 로 변환
	const userID = 123123123
	const projectID = await queryManager.addProject(userID,req.body["title"])
	const files = req.files as Express.Multer.File[];
	queryManager.addRequest(projectID,files).then(async (ID2PathMap : Map<number,[string,string]>)=>{
		const promiseArray = Array<Promise<void|MESSAGE.ReplyRequestMakeCut>>()
		for(const [requestID,pathes] of ID2PathMap){
			const [new_path, original_path] = pathes;
			promiseArray.push(queryManager.updateCut(requestID,"cut",0,new_path))
			promiseArray.push(
				grpcSocket.segmentation.makeCutsFromWholeImage(requestID,"cut",new_path)
			);
		}
		const path2IDMap = await Promise.all(promiseArray)
			.then(async (replies:Array<void|MESSAGE.ReplyRequestMakeCut>)=>{
				const path2IDMap = new Map<string,object>();
				try{
					for(const reply of replies){
						if(reply){
							const pathes = ID2PathMap.get(reply.req_id)
							if(pathes){
								const [_, originalPath] = pathes
								path2IDMap.set(originalPath,{req_id:reply.req_id, cut_count:reply.cut_count})
								await queryManager.setCutCount(reply.req_id,reply.cut_count)
							}
						}
					}
					return path2IDMap
				}catch(err){
					throw(new createError.InternalServerError)
				}
		});
		return path2IDMap
	}).then(path2IDMap =>{
		res.send({req_ids:Object.fromEntries(path2IDMap)})
	}).catch(error =>{
		next(error)
	})
}));

router.post("/blank", multer_image.array("blank"), async (req:Request,res:Response,next:NextFunction) => {
	try{
		validateParameters(req)
	}catch(err){
		next(err)
		return
	}
	const noneBlankList:number[] = JSON.parse(req.body.empty_id)
	const blankList:number[] = JSON.parse(req.body.map_ids);
	const files = req.files as Express.Multer.File[];

	//send start ai processing signal
	//todo 최준영 how to catch exception?
	noneBlankList.forEach((requestID)=>{
		grpcSocket.segmentation.start(requestID)
	})

	//set query and response data
	const promiseArray = new Array<Promise<void|MESSAGE.ReplyRequestMakeCut>>();
	for(var i =0;i<blankList.length;i++){
		const requestID = blankList[i]
		const blankFile = files[i];
		const newPath = path.join(IMAGE_DIR,"inpaint",
			`${requestID}_0${path.extname(blankFile.originalname)}`);
		await s3.upload(newPath,blankFile.buffer)
		promiseArray.push(queryManager.updateUserUploadInpaint(requestID,"inpaint",0,newPath))
		promiseArray.push(
			grpcSocket.segmentation.makeCutsFromWholeImage(requestID,"inpaint",newPath)
		);
	}
	Promise.all(promiseArray).then(()=>{
		res.send({success:true})
	}).catch((err)=>{
		next(err)
	})
})

router.get("/cut", asyncRouterWrap(async (req:Request,res:Response,next:NextFunction) => {
	try{
		validateParameters(req)
	}catch(err){
		next(err)
		return
	}
	const requestID = parseInt(req.query["req_id"] as string)
	const cutIndex = parseInt(req.query["cut_id"] as string)
	const cutPath = await queryManager.getPath(requestID,"cut",cutIndex)
	if(!cutPath){
		next(new createError.InternalServerError)
		return;
	}
	const cut = await s3.download(cutPath)
	res.type("png")
	res.end(cut)
}));

router.get("/result", (req:Request,res:Response, next:NextFunction) => {
	try{
		validateParameters(req)
	}catch(err){
		next(err)
		return
	}
	const requestID = parseInt(req.query["req_id"] as string)
	const cutIndex = parseInt(req.query["cut_id"] as string)
	const progress = queryManager.checkProgress(requestID,cutIndex)
	res.send({progress: Math.min(progress,100)})
});

router.get("/result/inpaint", asyncRouterWrap(async (req:Request,res:Response,next:NextFunction) => {
	try{
		validateParameters(req)
	}catch(err){
		next(err)
		return
	}
	const requestID = parseInt(req.query["req_id"] as string)
	const cutIndex = parseInt(req.query["cut_id"] as string)
	const inpaintPath = await queryManager.getPath(requestID,"inpaint",cutIndex)
	if(!inpaintPath){
		next(createError.NotFound)
		return;
	}
	const inpaint = await s3.download(inpaintPath)
	res.type("png")
	res.end(inpaint)
}));

router.get("/result/mask", asyncRouterWrap(async (req:Request,res:Response,next:NextFunction) => {
	try{
		validateParameters(req)
	}catch(err){
		next(err)
		return
	}
	const requestID = parseInt(req.query["req_id"] as string)
	const cutIndex = parseInt(req.query["cut_id"] as string)
	const mask = await queryManager.getPath(requestID,"mask",cutIndex)
	if(!mask){
		next(createError.NotFound)
		return;
	}
	res.send({mask:require(mask)})
}));

router.post("/mask", asyncRouterWrap(async (req:Request,res:Response,next:NextFunction) => {
	try{
		validateParameters(req)
	}catch(err){
		next(err)
		return
	}
	const requestID = parseInt(req.query["req_id"] as string)
	const cutIndex = parseInt(req.query["cut_id"] as string)
	const mask = JSON.parse(req.body["mask"])["result"]
	if(mask == undefined){
		next(createError.NotFound)
		return;
	}
	const mask_path = await queryManager.getPath(requestID,"mask",cutIndex)
	try{
		s3.upload(mask_path,Buffer.from(JSON.stringify(mask)))
	}catch(error){
		next(new createError.InternalServerError)
	}

	const rle: Array<Array<number>> = []
	for(var i =0;i<mask.length;i++){
		rle.push(mask[i]["value"]["rle"])
	}
	grpcSocket.segmentation.updateMask(requestID,cutIndex,rle)
	.then(()=>{
		res.send({success:true})
	}).catch((err)=>{
		next(err)
	})
}));

export default router;
