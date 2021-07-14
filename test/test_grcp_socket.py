from concurrent import futures

import grpc
import asyncio
from gRPC.ai_server_pb2 import *
import gRPC.ai_server_pb2_grpc as service_pb2_grpc


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


async def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    service_pb2_grpc.add_OCRServicer_to_server(
        OCRServicer(), server
    )
    server.add_insecure_port('[::]:50051')
    server.start()
    print("start listening")
    await server.wait_for_termination()

def client():
    channel = grpc.insecure_channel('localhost:50050') 
    stub = service_pb2_grpc.OCRStub(channel)
    response = stub.GetProgress(SendProgress(req_id=3,step=2))
    print(response.status_code)

if __name__ == '__main__':
    loop = asyncio.new_event_loop()  # 10
    asyncio.set_event_loop(loop)
    client()
    result = loop.run_until_complete(serve())  # 11
    loop.close()
