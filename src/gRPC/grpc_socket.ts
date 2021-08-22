import grpc = require("@grpc/grpc-js");
import protoLoader = require("@grpc/proto-loader");
import { SegmentationInterface, OCRInterface } from "src/gRPC/grpc_interface";
import { GrpcObject } from "@grpc/grpc-js";
import { ServiceClientConstructor } from "@grpc/grpc-js/build/src/make-client";
import path = require("path");

const PROTO_PATH = path.join(path.resolve(), "protos", "ai_server.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

class GRPCSocket {
  clientUrlForSegmentation: string;
  clientUrlForRecognition: string;
  serverUrl: string;
  server: grpc.Server;
  segmentation: SegmentationInterface;
  OCR: OCRInterface;
  proto: GrpcObject;

  constructor(
    serverUrl: string,
    clientUrlForSegmentation: string,
    clientUrlForRecognition: string
  ) {
    this.clientUrlForSegmentation = clientUrlForSegmentation;
    this.clientUrlForRecognition = clientUrlForRecognition;
    this.serverUrl = serverUrl;
    this.proto = grpc.loadPackageDefinition(packageDefinition)
      .ai_server as GrpcObject;

    this.segmentation = new SegmentationInterface(
      this.clientUrlForSegmentation,
      this.proto
    );
    this.OCR = new OCRInterface(this.clientUrlForRecognition, this.proto);
    this.server = this.openServer();
  }

  openServer() {
    const server = new grpc.Server({
      "grpc.max_send_message_length": 1024 * 1024 * 1024,
      "grpc.max_receive_message_length": 1024 * 1024 * 1024,
    });

    const Segmentation = this.proto.Segmentation as ServiceClientConstructor;
    server.addService(Segmentation.service, {
      ImageTransfer: this.segmentation.imageTransfer.bind(this),
      JsonTransfer: this.segmentation.jsonTransfer.bind(this),
    });

    const OCR = this.proto.OCR as ServiceClientConstructor;
    server.addService(OCR.service, {
      JsonTransfer: this.OCR.jsonTransfer.bind(this),
    });

    server.bindAsync(
      this.serverUrl,
      grpc.ServerCredentials.createInsecure(),
      (error) => {
        if (error) {
          console.error(error);
          return;
        }
        console.log("start listening grpc");
        server.start();
      }
    );
    return server;
  }
}

// export const grpcSocket = new GRPCSocket("0.0.0.0:4000","host.docker.internal:4001","host.docker.internal:5001")
export const grpcSocket = new GRPCSocket(
  "0.0.0.0:4000",
  "localhost:4001",
  "localhost:5001"
);
