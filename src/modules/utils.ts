import path from "path";
import { TranslateBBox, BBox } from 'src/routes/upload/ocr';
import createError from "http-errors"
import { Request, Response, NextFunction } from "express-serve-static-core";
import assert from "assert";
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

