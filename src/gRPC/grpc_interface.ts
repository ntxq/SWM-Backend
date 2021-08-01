import { GrpcObject } from '@grpc/grpc-js';
import { ServiceClient, ServiceClientConstructor } from '@grpc/grpc-js/build/src/make-client';
import fs from 'fs';
import grpc = require('@grpc/grpc-js');
import { IMAGE_DIR } from 'src/modules/const';
import * as MESSAGE from './grpc_message_interface';
import { JSON_DIR } from '../modules/const';
import { queryManager } from '../sql/mysqlConnectionManager';
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

  async Start(req_id:number,callback?:Function | undefined){
    fs.readFile(await queryManager.get_path(req_id,"original"), (err, data) => {
      if (err) {
        console.error(err)
        return
      }
      const request:MESSAGE.RequestStart = {req_id:req_id, image:data}
      this.client.Start(request, function(err:Error | null, response:MESSAGE.ReplyRequestStart) {
        if(err){
          console.error(err)
          return callback && callback(err,null)
        }
        console.log('Greeting:', response.status_code);
        return callback && callback(null,response)
      });
    })
  }

  ImageTransfer(call:grpc.ServerUnaryCall<MESSAGE.SendImage, MESSAGE.ReceiveImage>,
    callback:grpc.sendUnaryData<MESSAGE.ReceiveImage>
    ) {
      const request:MESSAGE.SendImage = call.request 

      var image = new Jimp(request.width, request.height);
      image.rgba(request.is_rgba);
      image.bitmap.data = request.image;
      const filepath = path.join(IMAGE_DIR,request.filename)
      image.write(filepath,(err,value)=>{
        queryManager.update_cut(request.req_id, request.type,request.index,filepath)
        const response: MESSAGE.ReceiveImage = { success:true }
        callback(null,response);
      })
  }

  JsonTransfer(call:grpc.ServerUnaryCall<MESSAGE.SendJson, MESSAGE.ReceiveJson>,
    callback:grpc.sendUnaryData<MESSAGE.ReceiveJson>
    ) {
      const request:MESSAGE.SendJson = call.request 

      fs.writeFileSync(path.join(JSON_DIR,request.filename),JSON.stringify(JSON.parse(request.data), null, 4))
      switch(request.type){
        case "cut":
          queryManager.set_cut_ranges(request.req_id,JSON.parse(request.data))
          break;
      }
      const response: MESSAGE.ReceiveJson = { success:true }
      callback(null,response);
  }

  async UpdateMask(req_id:number,data:Array<Array<number>>,callback?:Function | undefined){
    const masks:Array<Buffer> = []
    data.forEach((mask)=>{
      masks.push(Buffer.from(mask))
    })

    const cut_ranges = await queryManager.get_cut_range(req_id)
    const request:MESSAGE.RequestMaskUpdate = {
      req_id:req_id, 
      mask_rles:masks, 
      image:fs.readFileSync(await queryManager.get_path(req_id,"original")),
      cut_ranges:JSON.stringify(Object.fromEntries(cut_ranges))
    }

    queryManager.update_progress(req_id,'cut').then(()=>{
      this.client.UpdateMask(request, function(err:Error | null, response:MESSAGE.ReplyMaskUpdate) {
        if(err){
          console.error(err)
          return callback && callback(err,null)
        }
        console.log('Greeting:', response);
        return callback && callback(null,response)
      });
    })
  }

  UpdateProgress(call:grpc.ServerUnaryCall<MESSAGE.SendUpdateProgress, MESSAGE.ReplySendUpdateProgress>,
    callback:grpc.sendUnaryData<MESSAGE.ReplySendUpdateProgress>
    ) {
      const request:MESSAGE.SendUpdateProgress = call.request 
      queryManager.update_progress(request.req_id,request.status).then(()=>{
        const response: MESSAGE.ReplySendUpdateProgress = {}
        callback(null,response);
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

  async Start(req_id:number,callback?:Function | undefined){
    fs.readFile(await queryManager.get_path(req_id,"original"), (err, data) => {
      if (err) {
        console.error(err)
        return
      }
      const request:MESSAGE.RequestStart = {req_id:req_id, image:data}
      this.client.Start(request, function(err:Error | null, response:MESSAGE.ReplyRequestStart) {
        if(err){
          console.error(err)
          return callback && callback(err,null)
        }
        console.log('Greeting_OCR:', response.status_code);
        return callback && callback(null,response)
      });
    })
  }

  JsonTransfer(call:grpc.ServerUnaryCall<MESSAGE.SendJson, MESSAGE.ReceiveJson>,
    callback:grpc.sendUnaryData<MESSAGE.ReceiveJson>
    ) {
      const request:MESSAGE.SendJson = call.request 

      fs.writeFileSync(path.join(JSON_DIR,request.filename),JSON.stringify(JSON.parse(request.data), null, 4))
      switch(request.type){
        case "bbox":
          queryManager.set_bboxes(request.req_id,JSON.parse(request.data))
          break;
      }
      const response: MESSAGE.ReceiveJson = { success:true }
      callback(null,response);
  }
}