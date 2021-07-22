var PROTO_PATH = __dirname + '/protos/ai_server.proto';

import grpc = require('@grpc/grpc-js');
import protoLoader = require('@grpc/proto-loader');
import { SegmentationInterface } from './grcp_interface';
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
  segmentation: SegmentationInterface
  proto: GrpcObject

  constructor(url:string,server_port:number|string,client_port:number|string) {
    this.client_url = `${url}:${client_port}`
    this.server_url = `${url}:${server_port}`
    this.proto = grpc.loadPackageDefinition(packageDefinition).ai_server as GrpcObject;

    this.segmentation = new SegmentationInterface(this.client_url,this.proto)
    this.server = this.openServer()
  }

  openServer(){
    var server = new grpc.Server();

    const Segmentation = this.proto.Segmentation as ServiceClientConstructor
    server.addService(Segmentation.service, {
      OnComplete: this.segmentation.OnComplete
    });
    
    server.bindAsync(this.server_url, grpc.ServerCredentials.createInsecure(), () => {
      console.log('start listening grpc')
      server.start();
    }); 
    return server;
  }
}
      
export const grpcSocket = new GRPCSocket("localhost",50050,50051)