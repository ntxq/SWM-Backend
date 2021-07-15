var PROTO_PATH = __dirname + '/protos/ai_server.proto';

import grpc = require('@grpc/grpc-js');
import protoLoader = require('@grpc/proto-loader');
import { OCRInterface, StyleInterface } from './grcp_interface';
import { GrpcObject } from '@grpc/grpc-js';
import { ServiceClientConstructor } from '@grpc/grpc-js/build/src/make-client';

var packageDefinition = protoLoader.loadSync(
  PROTO_PATH,
  {keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});
  
class GRPCSocket{
  client_url: string
  server_url: string
  server: grpc.Server
  OCR: OCRInterface
  style: StyleInterface
  proto: GrpcObject

  constructor(url:string,server_port:number|string,client_port:number|string) {
    this.client_url = `${url}:${client_port}`
    this.server_url = `${url}:${server_port}`
    this.proto = grpc.loadPackageDefinition(packageDefinition).ai_server as GrpcObject;

    this.OCR = new OCRInterface(this.client_url,this.proto)
    this.style = new StyleInterface(this.client_url,this.proto)
    this.server = this.openServer()
  }

  openServer(){
    var server = new grpc.Server();
    const OCR = this.proto.OCR as ServiceClientConstructor
    server.addService(OCR.service, {
      OnUpdateStep: this.OCR.OnUpdateStep, 
      OnComplete: this.OCR.OnComplete
    });
    const Style = this.proto.Style as ServiceClientConstructor
    server.addService(Style.service, {
      OnUpdateStep: this.style.OnUpdateStep, 
      OnComplete: this.style.OnComplete
    });
    
    server.bindAsync(this.server_url, grpc.ServerCredentials.createInsecure(), () => {
      console.log('start listening grpc')
      server.start();
    }); 
    return server;
  }
  
  StartOCR(req_id:number){
    this.OCR.Start(req_id)
  }
}
      
export const grpcSocket = new GRPCSocket("localhost",50050,50051)