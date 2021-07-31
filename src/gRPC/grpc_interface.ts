import { GrpcObject } from '@grpc/grpc-js';
import { ServiceClient, ServiceClientConstructor } from '@grpc/grpc-js/build/src/make-client';
import fs from 'fs';
import grpc = require('@grpc/grpc-js');
import { IMAGE_DIR } from 'src/modules/const';
import { ReceiveImage, ReceiveJson, ReplyMaskUpdate, ReplyRequestStart, ReplySendSegmentResult, RequestMaskUpdate, RequestStart, SendImage, SendJson, SendSegmentResult } from './grpc_message_interface';
import { JSON_DIR } from '../modules/const';
import Jimp = require('jimp');
import path = require('path');

export class SegmentationInterface{
  client_url:string
  proto:GrpcObject
  client:ServiceClient
  
  constructor(client_url:string,proto:GrpcObject){
    this.client_url = client_url
    this.proto = proto

    const segmentation = this.proto.Segmentation as ServiceClientConstructor
    this.client = new segmentation(this.client_url,grpc.credentials.createInsecure(),
      {'grpc.max_send_message_length': 1024*1024*1024,'grpc.max_receive_message_length': 1024*1024*1024});
  }
  
  OnComplete(call:grpc.ServerUnaryCall<SendSegmentResult, ReplySendSegmentResult>,
    callback:grpc.sendUnaryData<ReplySendSegmentResult>
    ) {
    const request:SendSegmentResult = call.request 

    var inpaint = new Jimp(request.width, request.height);
    inpaint.rgba(false);
    inpaint.bitmap.data = request.inpaint;
    inpaint.write(`${IMAGE_DIR}/inpaint/${request.req_id}.png`,(err,value)=>{})

    var mask = new Jimp(request.width, request.height);
    mask.rgba(true);
    mask.bitmap.data = request.mask;
    mask.write(`${IMAGE_DIR}/mask/${request.req_id}.png`,(err,value)=>{})
    
    const response: ReplySendSegmentResult = {
      req_id:request.req_id,
      status_code:200
    }
    callback(null,response);
  }

  ImageTransfer(call:grpc.ServerUnaryCall<SendImage, ReceiveImage>,
    callback:grpc.sendUnaryData<ReceiveImage>
    ) {
      const request:SendImage = call.request 
      
      console.log(request.filename)

      var image = new Jimp(request.width, request.height);
      image.rgba(request.is_rgba);
      image.bitmap.data = request.image;
      image.write(path.join(IMAGE_DIR,request.filename),(err,value)=>{})

      const response: ReceiveImage = { success:true }
      callback(null,response);
  }

  JsonTransfer(call:grpc.ServerUnaryCall<SendJson, ReceiveJson>,
    callback:grpc.sendUnaryData<ReceiveJson>
    ) {
      const request:SendJson = call.request 
      
      console.log(request.filename)
      fs.writeFileSync(path.join(JSON_DIR,request.filename),request.data)

      const response: ReceiveImage = { success:true }
      callback(null,response);
  }

  UpdateMask(req_id:number,data:Array<Array<number>>,callback?:Function | undefined){
    const masks:Array<Buffer> = []
    data.forEach((mask)=>{
      masks.push(Buffer.from(mask))
    })
    
    const request:RequestMaskUpdate = {
      req_id:req_id, 
      mask_rles:masks, 
      image:fs.readFileSync(`${IMAGE_DIR}/original/${req_id}.png`),
      cut_ranges:JSON.stringify(require(`${JSON_DIR}/cut/${req_id}.json`))
    }

    {
      fs.renameSync(`${IMAGE_DIR}/inpaint/${req_id}.png`, `${IMAGE_DIR}/inpaint/old/${req_id}.png`)
      fs.renameSync(`${JSON_DIR}/mask/${req_id}.json`, `${JSON_DIR}/mask/old/${req_id}.json`)
    }
    

    this.client.UpdateMask(request, function(err:Error | null, response:ReplyMaskUpdate) {
      if(err){
        console.error(err)
        return callback && callback(err,null)
      }
      console.log('Greeting:', response);
      return callback && callback(null,response)
    });
  }

  Start(req_id:number,callback?:Function | undefined){
    fs.readFile(`${IMAGE_DIR}/original/${req_id}.png`, (err, data) => {
      if (err) {
        console.error(err)
        return
      }
      const request:RequestStart = {req_id:req_id, image:data}
      this.client.Start(request, function(err:Error | null, response:ReplyRequestStart) {
        if(err){
          console.error(err)
          return callback && callback(err,null)
        }
        console.log('Greeting:', response.status_code);
        return callback && callback(null,response)
      });
    })
  }
}

export class OCRInterface{
  client_url:string
  proto:GrpcObject
  client:ServiceClient
  
  constructor(client_url:string,proto:GrpcObject){
    this.client_url = client_url
    this.proto = proto

    const OCR = this.proto.OCR as ServiceClientConstructor
    this.client = new OCR(this.client_url,grpc.credentials.createInsecure(),
      {'grpc.max_send_message_length': 1024*1024*1024,'grpc.max_receive_message_length': 1024*1024*1024});
  }

  Start(req_id:number,callback?:Function | undefined){
    fs.readFile(`${IMAGE_DIR}/original/${req_id}.png`, (err, data) => {
      if (err) {
        console.error(err)
        return
      }
      const request:RequestStart = {req_id:req_id, image:data}
      this.client.Start(request, function(err:Error | null, response:ReplyRequestStart) {
        if(err){
          console.error(err)
          return callback && callback(err,null)
        }
        console.log('Greeting_OCR:', response.status_code);
        return callback && callback(null,response)
      });
    })
  }
  
  JsonTransfer(call:grpc.ServerUnaryCall<SendJson, ReceiveJson>,
    callback:grpc.sendUnaryData<ReceiveJson>
    ) {
      const request:SendJson = call.request 
      
      console.log(request.filename)
      fs.writeFileSync(path.join(JSON_DIR,request.filename),request.data)

      const response: ReceiveImage = { success:true }
      callback(null,response);
  }
}