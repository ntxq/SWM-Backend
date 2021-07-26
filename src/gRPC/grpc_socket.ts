var PROTO_PATH = __dirname + '/protos/ai_server.proto';

import grpc = require('@grpc/grpc-js');
import protoLoader = require('@grpc/proto-loader');
import { SegmentationInterface } from './grpc_interface';
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

  constructor(server_url:string,client_url:string) {
    this.client_url = client_url
    this.server_url = server_url
    this.proto = grpc.loadPackageDefinition(packageDefinition).ai_server as GrpcObject;

    this.segmentation = new SegmentationInterface(this.client_url,this.proto)
    this.server = this.openServer()
  }

  openServer(){
    var server = new grpc.Server({'grpc.max_send_message_length': 1024*1024*1024,'grpc.max_receive_message_length': 1024*1024*1024});

    const Segmentation = this.proto.Segmentation as ServiceClientConstructor
    server.addService(Segmentation.service, {
      OnComplete: this.segmentation.OnComplete,
      ImageTransfer: this.segmentation.ImageTransfer,
      JsonTransfer: this.segmentation.JsonTransfer
    });
    
    server.bindAsync(this.server_url, grpc.ServerCredentials.createInsecure(), () => {
      console.log('start listening grpc')
      server.start();
    }); 
    return server;
  }
}
      
export const grpcSocket = new GRPCSocket("0.0.0.0:50050","172.17.0.1:50051")