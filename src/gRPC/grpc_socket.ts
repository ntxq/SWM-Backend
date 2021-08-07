var PROTO_PATH = __dirname + '/protos/ai_server.proto';

import grpc = require('@grpc/grpc-js');
import protoLoader = require('@grpc/proto-loader');
import { SegmentationInterface, OCRInterface } from 'src/gRPC/grpc_interface';
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
  segmentation_client_url: string;
  recognition_client_url: string;
  server_url: string;
  server: grpc.Server;
  segmentation: SegmentationInterface;
  OCR: OCRInterface;
  proto: GrpcObject;

  constructor(server_url:string,segmentation_client_url:string,recognition_client_url:string) {
    this.segmentation_client_url = segmentation_client_url
    this.recognition_client_url = recognition_client_url
    this.server_url = server_url
    this.proto = grpc.loadPackageDefinition(packageDefinition).ai_server as GrpcObject;

    this.segmentation = new SegmentationInterface(this.segmentation_client_url,this.proto)
    this.OCR = new OCRInterface(this.recognition_client_url,this.proto)
    this.server = this.openServer()
  }

  openServer(){
    var server = new grpc.Server({'grpc.max_send_message_length': 1024*1024*1024,'grpc.max_receive_message_length': 1024*1024*1024});

    const Segmentation = this.proto.Segmentation as ServiceClientConstructor
    server.addService(Segmentation.service, {
      ImageTransfer: this.segmentation.ImageTransfer,
      JsonTransfer: this.segmentation.JsonTransfer
    });

    const OCR = this.proto.OCR as ServiceClientConstructor
    server.addService(OCR.service, {
      JsonTransfer: this.OCR.JsonTransfer
    });

    server.bindAsync(this.server_url, grpc.ServerCredentials.createInsecure(), (error,port) => {
      if(error){
        console.error(error);
        return;
      }
      console.log('start listening grpc')
      server.start();
    }); 
    return server;
  }
}
      
export const grpcSocket = new GRPCSocket("0.0.0.0:4000","172.17.0.1:4001","172.17.0.1:5001")