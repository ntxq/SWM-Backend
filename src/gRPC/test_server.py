from concurrent import futures

import grpc

from python_out.ai_server_pb2 import *
import python_out.ai_server_pb2_grpc as service_pb2_grpc


class OCRServicer(service_pb2_grpc.OCR):
    def __init__(self):
        pass

    def GetProgress(self, request: SendProgress, context):
        return ReplyGetProgress(message="asdasd")

    def GetResult(self, request: SendResult, context):
        return ReplyGetResult(message="asdasd")

    def RunModel(self, request: RequestRunModel, context):
        return ReplyRunModel(status_code=32)
        # return Sum(sum=request.a + request.b)


def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    service_pb2_grpc.add_OCRServicer_to_server(
        OCRServicer(), server
    )
    server.add_insecure_port('[::]:50051')
    server.start()
    print("start listening")
    server.wait_for_termination()


if __name__ == '__main__':
    serve()