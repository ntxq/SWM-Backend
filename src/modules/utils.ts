import path from "path";
import { TranslateBBox, BBox } from 'src/routes/upload/ocr';
import createError from "http-errors"
import AWS, { Credentials } from "aws-sdk"
import { Request, Response, NextFunction } from "express-serve-static-core";
import assert from "assert";
import { Readable } from "stream";
import { credentials } from "src/sql/secret";
const requests =  require("src/routes/requests.json");

type RequestParams = {
  [index: string]: string
}

export function isImageFile(file:Express.Multer.File):boolean{
	// Allowed ext
	const filetypes = /jpeg|jpg|png/;
	// Check ext
	const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
	// Check mime
	const mimetype = filetypes.test(file.mimetype);
 
	if(mimetype && extname){
		return true;
	} else {
		return false;
	}
}

export function update_bbox(old_bbox:BBox[] | TranslateBBox[],new_bbox:BBox[] | TranslateBBox[]){
	return new_bbox as TranslateBBox[];
}

export function handleGrpcError(err:Error){
	console.log(err)
	return new createError.ServiceUnavailable
}

export const asyncRouterWrap = (asyncFn:Function) => {
		return (async (req:Request, res:Response, next:NextFunction) => {
			try {
				return await asyncFn(req, res, next)
			} catch (error) {
				return next(error)
			}
		})  
	}

export function validateParameters(request:Request){
	try{
		const url = request.baseUrl + request.path
		const req_param_parser = requests[request.method][url]
		for(const type of Object.keys(req_param_parser)){
			var req_params:RequestParams = {}
			switch(type){
				case "body":
					req_params = JSON.parse(JSON.stringify(request.body))
					break
				case "query":
					req_params = JSON.parse(JSON.stringify(request.query))
					break
				case "params":
					req_params = JSON.parse(JSON.stringify(request.params))
					break
					
			}
			for(const [param_name,param_type] of Object.entries(req_param_parser[type])){
				if(param_type == "number"){
					assert(parseInt(req_params[param_name]) !== NaN)
				}
				else if(param_type == "object"){
					assert(JSON.parse(req_params[param_name]))
				}
				else{
					assert(typeof(req_params[param_name]) == param_type)
				}
			}
		}
	} catch(err){
		console.error(err)
		throw new createError.BadRequest
	}
}


class S3{
	s3:AWS.S3;
	bucket:string;
	ACL:string;

	constructor(){
		AWS.config.region = 'ap-northeast-2';
		AWS.config.credentials = credentials
		this.s3 = new AWS.S3();
		this.bucket = "swm-images-db";
		this.ACL = "public-read";
	}

	async upload(filename:string,buffer:Buffer){
		const param:AWS.S3.Types.PutObjectRequest = {
			Bucket:this.bucket, 
			ACL:this.ACL,
			Key:filename,
			Body:buffer,
		}
		return new Promise<void>((resolve,reject)=>{
			this.s3.upload(param, function(err, data){
				if(err){
					reject(new createError.InternalServerError)
				}
				console.log('complete upload')
				resolve()
			})
		})
		
	}

	async streamToString (stream: Readable): Promise<string> {
		return await new Promise((resolve, reject) => {
			const chunks: Uint8Array[] = [];
			stream.on('data', (chunk) => chunks.push(chunk));
			stream.on('error', reject);
			stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
		});
	}

	async download(filename:string):Promise<Buffer|string>{
		var params:AWS.S3.Types.GetObjectRequest = { 
			Bucket: this.bucket, 
			Key: filename
		};
		return new Promise<Buffer|string>((resolve,reject)=>{
			this.s3.getObject(params, (err, data) => {
				if(err || data.Body === undefined){
					reject(err);
					return;
				}
				if(data.Body instanceof Readable){
					this.streamToString(data.Body).then((data)=>{
						resolve(data);
					})
				}
				else if(typeof(data.Body) === "string"){
					resolve(data.Body)
				}
				else if(data.Body instanceof Buffer){
					resolve(data.Body)
				}
				else{
					resolve(data.Body.toString())
				}
			});
		})
	}
}

export const s3 = new S3();