import { GrpcObject } from "@grpc/grpc-js";
import {
  ServiceClient,
  ServiceClientConstructor,
} from "@grpc/grpc-js/build/src/make-client";
import fs from "fs";
import grpc = require("@grpc/grpc-js");
import { IMAGE_DIR, JSON_DIR } from "src/modules/const";
import * as MESSAGE from "src/gRPC/grpc_message_interface";
import { queryManager } from "src/sql/mysqlConnectionManager";
import createError from "http-errors";
import Jimp = require("jimp");
import path = require("path");
import { handleGrpcError, s3 } from "src/modules/utils";

export class SegmentationInterface {
  client_url: string;
  proto: GrpcObject;
  client: ServiceClient;

  constructor(client_url: string, proto: GrpcObject) {
    this.client_url = client_url;
    this.proto = proto;

    const segmentation = this.proto.Segmentation as ServiceClientConstructor;
    this.client = new segmentation(
      this.client_url,
      grpc.credentials.createInsecure(),
      {
        "grpc.max_send_message_length": 1024 * 1024 * 1024,
        "grpc.max_receive_message_length": 1024 * 1024 * 1024,
      }
    );
  }

  async MakeCutsFromWholeImage(req_id: number, type: string, path: string) {
		// const data = await s3.download(path) as Buffer;
		const data = fs.readFileSync(path)
		const request: MESSAGE.RequestMakeCut = {
			req_id: req_id,
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

  async Start(req_id:number,index:number=0):Promise<MESSAGE.ReplyRequestStart>{
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
      if(index == 0){
				const cut_count = await queryManager.get_cut_count(req_id)
				for(var i =1; i <= cut_count; i++){
					try{
						var cut_path = await queryManager.get_path(req_id,"cut",i)
						const data = fs.readFileSync(cut_path)
						const request:MESSAGE.RequestStart = {req_id:req_id, image:data,index:i}
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
				const data = fs.readFileSync(await queryManager.get_path(req_id,"cut",index))
      	const request:MESSAGE.RequestStart = {req_id:req_id, image:data,index:index}
        this.client.StartCut(request, cb);
      }
			}
			catch(err){
				reject(new createError.InternalServerError)
			}
    })
  }

  ImageTransfer(call:grpc.ServerUnaryCall<MESSAGE.SendImage, MESSAGE.ReceiveImage>,
		callback:grpc.sendUnaryData<MESSAGE.ReceiveImage>) {
		const request:MESSAGE.SendImage = call.request 

		var image = new Jimp(request.width, request.height);
		image.rgba(request.is_rgba);
		image.bitmap.data = request.image;
		const filepath = path.join(IMAGE_DIR,request.filename)
		s3.upload(filepath,request.image)
		image.writeAsync(filepath).then((value)=>{
			queryManager.update_cut(request.req_id, request.type,request.index,filepath)
			
		})
		const response: MESSAGE.ReceiveImage = { success:true }
		callback(null,response);
		return response
  }

  JsonTransfer(call:grpc.ServerUnaryCall<MESSAGE.SendJson, MESSAGE.ReceiveJson>,
		callback:grpc.sendUnaryData<MESSAGE.ReceiveJson>) {
		const request:MESSAGE.SendJson = call.request 
		const filepath = path.join(JSON_DIR,request.filename)
		fs.writeFileSync(filepath,JSON.stringify(JSON.parse(request.data), null, 4))
		s3.upload(filepath,Buffer.from(JSON.stringify(JSON.parse(request.data))))
		switch(request.type){
			case "cut":
				queryManager.set_cut_ranges(request.req_id,JSON.parse(request.data))
				break;
			case "mask":
				queryManager.update_cut(request.req_id, request.type,request.index,filepath)
				break;
		}
		const response: MESSAGE.ReceiveJson = { success:true }
		callback(null,response);
		return response
  }

  async UpdateMask(req_id:number,index:number,data:Array<Array<number>>){
    const masks:Array<Buffer> = []
    data.forEach((mask)=>{
      masks.push(Buffer.from(mask))
    })

    const cut_ranges = await queryManager.get_cut_range(req_id)
    const request:MESSAGE.RequestMaskUpdate = {
      req_id:req_id, 
      mask_rles:masks, 
      index:index,
      image:fs.readFileSync(await queryManager.get_path(req_id,"cut",index)),
      cut_ranges:JSON.stringify(Object.fromEntries(cut_ranges))
    }
		return new Promise(async (resolve,reject)=>{
			await queryManager.update_progress(req_id,index,'cut')
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
  client_url: string;
  proto: GrpcObject;
  client: ServiceClient;

  constructor(client_url: string, proto: GrpcObject) {
    this.client_url = client_url;
    this.proto = proto;

    const OCR = this.proto.OCR as ServiceClientConstructor;
    this.client = new OCR(this.client_url, grpc.credentials.createInsecure(), {
      "grpc.max_send_message_length": 1024 * 1024 * 1024,
      "grpc.max_receive_message_length": 1024 * 1024 * 1024,
    });
  }

  async Start(req_id: number, index: number) {
    const file_path = await queryManager.get_path(req_id, "cut", index);
    return new Promise<MESSAGE.ReplyRequestStart>((resolve, reject) => {
      if(!file_path){
        return reject(new createError.InternalServerError);
      }
      const data = fs.readFileSync(file_path);
      const request:MESSAGE.RequestStart = {req_id:req_id, image:data, index:index}
      this.client.Start(request, function(err:Error | null, response:MESSAGE.ReplyRequestStart) {
				if(err){
					reject(handleGrpcError(err))
					return;
				}
        console.log('Greeting_OCR:', response.status_code);
        return resolve(response)
      })
    })
  }

  JsonTransfer(call:grpc.ServerUnaryCall<MESSAGE.SendJson, MESSAGE.ReceiveJson>,
		callback:grpc.sendUnaryData<MESSAGE.ReceiveJson>) {
		const request:MESSAGE.SendJson = call.request 

		fs.writeFileSync(path.join(JSON_DIR,request.filename),JSON.stringify(JSON.parse(request.data), null, 4))
		s3.upload(path.join(JSON_DIR,request.filename),
			Buffer.from(JSON.stringify(JSON.parse(request.data), null, 4)))

		switch(request.type){
			case "bbox":
				queryManager.set_bboxes(request.req_id,request.index,JSON.parse(request.data)).then(()=>{
				})
				break;
		}
		const response: MESSAGE.ReceiveJson = { success:true }
		callback(null,response);
		return response
  }
}
