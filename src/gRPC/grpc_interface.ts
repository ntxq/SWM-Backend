import { GrpcObject } from "@grpc/grpc-js";
import {
  ServiceClient,
  ServiceClientConstructor,
} from "@grpc/grpc-js/build/src/make-client";
import grpc = require("@grpc/grpc-js");
import { IMAGE_DIR, JSON_DIR } from "src/modules/const";
import * as MESSAGE from "src/gRPC/grpc_message_interface";
import { queryManager } from "src/sql/mysql_connection_manager";
import createError from "http-errors";
import Jimp = require("jimp");
import path = require("path");
import { handleGrpcError, s3 } from "src/modules/utils";

export class SegmentationInterface {
  clientUrl: string;
  proto: GrpcObject;
  client: ServiceClient;

  constructor(clientUrl: string, proto: GrpcObject) {
    this.clientUrl = clientUrl;
    this.proto = proto;

    const segmentation = this.proto.Segmentation as ServiceClientConstructor;
    this.client = new segmentation(
      this.clientUrl,
      grpc.credentials.createInsecure(),
      {
        "grpc.max_send_message_length": 1024 * 1024 * 1024,
        "grpc.max_receive_message_length": 1024 * 1024 * 1024,
      }
    );
  }

  async makeCutsFromWholeImage(requestID: number, type: string, path: string) {
		const data = await s3.download(path) as Buffer;
		const request: MESSAGE.RequestMakeCut = {
			req_id: requestID,
			type: type,
			image: data,
		};
		return new Promise<MESSAGE.ReplyRequestMakeCut>((resolve,reject)=>{
			const cb = function (
				err: Error | null,
				response: MESSAGE.ReplyRequestMakeCut
			) {
				if (err) {
					reject(handleGrpcError(err))
				}
				resolve(response)
			};
	
			this.client.MakeCutsFromWholeImage(request, cb);
		})
  }

  async start(requestID:number,cutIndex:number=0):Promise<MESSAGE.ReplyRequestStart>{
		return new Promise<MESSAGE.ReplyRequestStart>(async (resolve,reject)=>{
			try{
      const cb = function(err:Error | null, response:MESSAGE.ReplyRequestStart) {
				if(err){
					reject(handleGrpcError(err))
					return;
				}
        console.log('Greeting:', response.status_code);
				resolve(response)
      }
			//todo 최준영
      if(cutIndex == 0){
				const cut_count = await queryManager.getCutCount(requestID)
				for(var i =1; i <= cut_count; i++){
					try{
						var cut_path = await queryManager.getPath(requestID,"cut",i)
						const data = await s3.download(cut_path) as Buffer;
						const request:MESSAGE.RequestStart = {
							req_id:requestID, image:data,cut_index:i
						}
						this.client.StartCut(request, cb);
					}
					catch(err){
						if(err instanceof createError.HttpError){
							await new Promise(resolve => setTimeout(resolve, 1000));
						}
						else{
							throw err;
						}
					}
				}
      }
      else{
				const path = await queryManager.getPath(requestID,"cut",cutIndex)
				const data = await s3.download(path) as Buffer;
				const request:MESSAGE.RequestStart = {req_id:requestID, image:data,cut_index:cutIndex}
        this.client.StartCut(request, cb);
      }
			}
			catch(err){
				reject(new createError.InternalServerError)
			}
    })
  }

  imageTransfer(call:grpc.ServerUnaryCall<MESSAGE.SendImage, MESSAGE.ReceiveImage>,
		callback:grpc.sendUnaryData<MESSAGE.ReceiveImage>) {

		const request:MESSAGE.SendImage = call.request 
		const filePath = path.join(IMAGE_DIR,request.file_name)
		s3.upload(filePath,request.image)
		const response: MESSAGE.ReceiveImage = { success:true }
		callback(null,response);
		return response
  }

  jsonTransfer(call:grpc.ServerUnaryCall<MESSAGE.SendJson, MESSAGE.ReceiveJson>,
		callback:grpc.sendUnaryData<MESSAGE.ReceiveJson>) {
		const request:MESSAGE.SendJson = call.request 
		const filePath = path.join(JSON_DIR,request.file_name)
		s3.upload(filePath,Buffer.from(JSON.stringify(JSON.parse(request.data))))
		switch(request.type){
			case "cut":
				queryManager.setCutRanges(request.req_id,JSON.parse(request.data))
				break;
			case "mask":
				queryManager.updateCut(request.req_id, request.type,request.cut_index,filePath)
				break;
		}
		const response: MESSAGE.ReceiveJson = { success:true }
		callback(null,response);
		return response
  }

  async updateMask(requestID:number,cutIndex:number,data:Array<Array<number>>){
    const masks:Array<Buffer> = []
    data.forEach((mask)=>{
      masks.push(Buffer.from(mask))
    })

    const cutRanges = await queryManager.getCutRange(requestID)
    const request:MESSAGE.RequestMaskUpdate = {
      req_id:requestID, 
      mask_rles:masks, 
      cut_index:cutIndex,
      image:await s3.download(await queryManager.getPath(requestID,"cut",cutIndex)) as Buffer,
      cut_ranges:JSON.stringify(Object.fromEntries(cutRanges))
    }
		return new Promise(async (resolve,reject)=>{
			await queryManager.updateProgress(requestID,cutIndex,'cut')
			this.client.UpdateMask(request, function(err:Error | null, response:MESSAGE.ReplyMaskUpdate) {
				if(err){
					reject(handleGrpcError(err))
					return;
				}
				console.log('Greeting:', response);
				resolve(response)
			});
		})
  }
}

export class OCRInterface {
  clientUrl: string;
  proto: GrpcObject;
  client: ServiceClient;

  constructor(clientUrl: string, proto: GrpcObject) {
    this.clientUrl = clientUrl;
    this.proto = proto;

    const OCR = this.proto.OCR as ServiceClientConstructor;
    this.client = new OCR(this.clientUrl, grpc.credentials.createInsecure(), {
      "grpc.max_send_message_length": 1024 * 1024 * 1024,
      "grpc.max_receive_message_length": 1024 * 1024 * 1024,
    });
  }

  async start(requestID: number, cutIndex: number) {
    const filePath = await queryManager.getPath(requestID, "cut", cutIndex);
    return new Promise<MESSAGE.ReplyRequestStart>(async (resolve, reject) => {
      if(!filePath){
        return reject(new createError.InternalServerError);
      }
			const data = await s3.download(filePath) as Buffer;
      const request:MESSAGE.RequestStart = {req_id:requestID, image:data, cut_index:cutIndex}
      this.client.start(request, function(err:Error | null, response:MESSAGE.ReplyRequestStart) {
				if(err){
					reject(handleGrpcError(err))
					return;
				}
        console.log('Greeting_OCR:', response.status_code);
        return resolve(response)
      })
    })
  }

  jsonTransfer(call:grpc.ServerUnaryCall<MESSAGE.SendJson, MESSAGE.ReceiveJson>,
		callback:grpc.sendUnaryData<MESSAGE.ReceiveJson>) {
		const request:MESSAGE.SendJson = call.request 

		s3.upload(path.join(JSON_DIR,request.file_name),
			Buffer.from(JSON.stringify(JSON.parse(request.data), null, 4)))

		switch(request.type){
			case "bbox":
				queryManager.setBboxes(request.req_id,request.cut_index,JSON.parse(request.data))
				break;
		}
		const response: MESSAGE.ReceiveJson = { success:true }
		callback(null,response);
		return response
  }
}