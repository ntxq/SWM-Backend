import grpc = require("@grpc/grpc-js");
import protoLoader = require("@grpc/proto-loader");
import { SegmentationInterface, OCRInterface } from "src/gRPC/grpc_interface";
import { GrpcObject } from "@grpc/grpc-js";
import { ServiceClientConstructor } from "@grpc/grpc-js/build/src/make-client";
import path = require("path");
import { SegmentaionIP, RecognitionIP } from "src/hosts";

const PROTO_PATH = path.join(
  path.resolve(),
  "src",
  "gRPC",
  "protos",
  "ai_server.proto"
);

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
      InpaintComplete: this.segmentation.inpaintComplete.bind(
        this.segmentation
      ),
    });

    const OCR = this.proto.OCR as ServiceClientConstructor;
    server.addService(OCR.service, {
      SendBBoxes: this.OCR.sendBBoxes.bind(this.OCR),
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
  SegmentaionIP,
  RecognitionIP
);
