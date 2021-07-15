import { GrpcObject } from '@grpc/grpc-js';
import { ServiceClient, ServiceClientConstructor } from '@grpc/grpc-js/build/src/make-client';
import grpc = require('@grpc/grpc-js');

interface ReplySendStep{
  req_id:number;
  step:number;
  status_code:number;
}

interface ReplySendResult{
  req_id:number;
  status_code:number;
}

interface RequestStart{
  req_id:number;
}

interface ReplyRequestStart{
  req_id:number;
  status_code:number;
}

interface SendResult{
  req_id:number;
  data:string;
}

interface SendStep{
  req_id:number;
  step:number;
}

export class OCRInterface{
  client_url:string
  proto:GrpcObject
  client:ServiceClient
  
  constructor(client_url:string,proto:GrpcObject){
    this.client_url = client_url
    this.proto = proto

    const OCR = this.proto.OCR as ServiceClientConstructor
    this.client = new OCR(this.client_url,grpc.credentials.createInsecure());
  }
  
  OnUpdateStep(
    call:grpc.ServerUnaryCall<SendStep, ReplySendStep>,
    callback:grpc.sendUnaryData<ReplySendStep>
    ) {
    const request:SendStep = call.request 
    const response: ReplySendStep = {
      req_id:request.req_id,
      step:request.step,
      status_code:200
    }
    console.log(response)
    callback(null,response);
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
  
  Start(req_id:number){
    const request:RequestStart = {req_id:req_id}
    this.client.Start(request, function(err:Error | null, response:ReplyRequestStart) {
      if(err){
        console.error(err)
        return
      }
      console.log('Greeting:', response.status_code);
    });
  }
}

export class StyleInterface{
  client_url:string
  proto:GrpcObject
  client:ServiceClient
  
  constructor(client_url:string,proto:GrpcObject){
    this.client_url = client_url
    this.proto = proto

    const style = this.proto.Style as ServiceClientConstructor
    this.client = new style(this.client_url,grpc.credentials.createInsecure());
  }
  
  OnUpdateStep(
    call:grpc.ServerUnaryCall<SendStep, ReplySendStep>,
    callback:grpc.sendUnaryData<ReplySendStep>
    ) {
    const request:SendStep = call.request 
    const response: ReplySendStep = {
      req_id:request.req_id,
      step:request.step,
      status_code:200
    }
    callback(null,response);
  }
  
  OnComplete(
    call:grpc.ServerUnaryCall<SendResult, ReplySendResult>,
    callback:grpc.sendUnaryData<ReplySendResult>
    ) {
    const request:SendResult = call.request 
    const response: ReplySendResult = {
      req_id:request.req_id,
      status_code:200
    }
    callback(null,response);
  }
  
  Start(req_id:number){
    const request:RequestStart = {req_id:req_id}
    this.client.Start(request, function(err:Error, response:ReplyRequestStart) {
      if(err){
        console.error(err)
        return
      }
      console.log('Greeting:', response.status_code);
    });
  }
}
