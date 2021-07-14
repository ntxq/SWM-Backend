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
  proto:any
  client:any
  
  constructor(client_url:string,proto:any){
    this.client_url = client_url
    this.proto = proto
    this.client = new this.proto.OCR(this.client_url,grpc.credentials.createInsecure());
  }
  
  OnUpdateStep(call, callback) {
    const request:SendStep = call.request 
    const response: ReplySendStep = {
      req_id:request.req_id,
      step:request.step,
      status_code:200
    }
    console.log(response)
    callback(null,response);
  }
  
  OnComplete(call, callback) {
    const request:SendResult = call.request 
    const response: ReplySendResult = {
      req_id:request.req_id,
      status_code:200
    }
    callback(null,response);
  }
  
  Start(req_id:number){
    const request:RequestStart = {req_id:req_id}
    this.client.Start(request, function(err, response:ReplyRequestStart) {
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
  proto:any
  client:any
  
  constructor(client_url:string,proto:any){
    this.client_url = client_url
    this.proto = proto
    this.client = new this.proto.Style(this.client_url,grpc.credentials.createInsecure());
  }
  
  OnUpdateStep(call, callback) {
    const request:SendStep = call.request 
    const response: ReplySendStep = {
      req_id:request.req_id,
      step:request.step,
      status_code:200
    }
    callback(null,response);
  }
  
  OnComplete(call, callback) {
    const request:SendResult = call.request 
    const response: ReplySendResult = {
      req_id:request.req_id,
      status_code:200
    }
    callback(null,response);
  }
  
  Start(req_id:number){
    const request:RequestStart = {req_id:req_id}
    this.client.Start(request, function(err, response:ReplyRequestStart) {
      if(err){
        console.error(err)
        return
      }
      console.log('Greeting:', response.status_code);
    });
  }
}
