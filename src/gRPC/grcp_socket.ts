var PROTO_PATH = __dirname + '/protos/ai_server.proto';

import grpc = require('@grpc/grpc-js');
import protoLoader = require('@grpc/proto-loader');

interface ReplyGetProgress{
  req_id:number;
  status_code:number;
}

interface ReplyGetResult{
  req_id:number;
  status_code:number;
}

interface RequestRunModel{
  req_id:number;
}

interface ReplyRunModel{
  req_id:number;
  status_code:number;
}

var packageDefinition = protoLoader.loadSync(
    PROTO_PATH,
    {keepCase: true,
     longs: String,
     enums: String,
     defaults: true,
     oneofs: true
    });
var ai_server_proto = grpc.loadPackageDefinition(packageDefinition).ai_server as any;

class GPRCSocket{
  client_url: string
  server_url: string
  constructor(url:string,server_port:number|string,client_port:number|string) {
    this.client_url = `${url}:${client_port}`
    this.server_url = `${url}:${server_port}`
    this.openServer()
  }

  private GetProgress(call, callback) {
    const response: ReplyGetProgress = {
      req_id:call.req_id,
      status_code:200
    }
    callback(null,response);
  }

  private GetResult(call, callback) {
    const response: ReplyGetResult = {
      req_id:call.req_id,
      status_code:200
    }
    callback(null,response);
  }

  openServer(){
    var server = new grpc.Server();

    server.addService(ai_server_proto.OCR.service, 
      {
        GetProgress: this.GetProgress, 
        GetResult: this.GetResult
      });
    server.addService(ai_server_proto.Style.service, 
      {
        GetProgress: this.GetProgress, 
        GetResult: this.GetResult
      });

    server.bindAsync(this.server_url, grpc.ServerCredentials.createInsecure(), () => {
      console.log('start listening grpc')
      server.start();
    }); 
  }

  RunModel(req_id:number){
    var client = new ai_server_proto.OCR(this.client_url,grpc.credentials.createInsecure());
    const request:RequestRunModel = {req_id:req_id}
    client.RunModel(request, function(err, response:ReplyRunModel) {
      if(err){
        console.error(err)
        return
      }
      console.log('Greeting:', response.status_code);
    });
  }
}

export const grpcSocket = new GPRCSocket("localhost",50050,50051)