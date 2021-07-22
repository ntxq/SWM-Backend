import { GrpcObject } from '@grpc/grpc-js';
import { ServiceClient, ServiceClientConstructor } from '@grpc/grpc-js/build/src/make-client';
import fs from 'fs';
import grpc = require('@grpc/grpc-js');
import { IMAGE_DIR } from 'src/modules/const';
import { ReplyMaskUpdate, ReplyRequestStart, ReplySendResult, RequestMaskUpdate, RequestStart, SendResult } from './grpc_message_interface';



export class SegmentationInterface{
  client_url:string
  proto:GrpcObject
  client:ServiceClient
  
  constructor(client_url:string,proto:GrpcObject){
    this.client_url = client_url
    this.proto = proto

    const segmentation = this.proto.Segmentation as ServiceClientConstructor
    this.client = new segmentation(this.client_url,grpc.credentials.createInsecure());
  }
  
  OnComplete(call:grpc.ServerUnaryCall<SendResult, ReplySendResult>,
    callback:grpc.sendUnaryData<ReplySendResult>
    ) {
    const request:SendResult = call.request 
    const response: ReplySendResult = {
      req_id:request.req_id,
      status_code:200
    }
    callback(null,response);
  }

  UpdateMask(req_id:number,data:Array<number>){
    const request:RequestMaskUpdate = {req_id:req_id, mask:Buffer.from(data)}
    this.client.Start(request, function(err:Error | null, response:ReplyMaskUpdate) {
      if(err){
        console.error(err)
        return
      }
      console.log('Greeting:', response);
    });
  }

  Start(req_id:number){
    fs.readFile(`${IMAGE_DIR}/original/${req_id}.png`, (err, data) => {
      if (err) {
        console.error(err)
        return
      }
      const request:RequestStart = {req_id:req_id, image:data}
      this.client.Start(request, function(err:Error | null, response:ReplyRequestStart) {
        if(err){
          console.error(err)
          return
        }
        console.log('Greeting:', response.status_code);
      });
    })
  }
}