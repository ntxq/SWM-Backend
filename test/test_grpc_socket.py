from concurrent import futures

import grpc
import asyncio
from codegen.ai_server_pb2 import *
import codegen.ai_server_pb2_grpc as service_pb2_grpc


class OCRServicer(service_pb2_grpc.OCR):
    def __init__(self,channel):
        self.stub = service_pb2_grpc.OCRStub(channel)

    def OnUpdateStep(self):
        response = self.stub.OnUpdateStep(SendStep(req_id=3,step=self.getNowStep()))
        print(response)

    def OnComplete(self):
        response = self.stub.OnComplete(SendResult(req_id=3,data="asdasdasd"))
        print(response)

    def Start(self, request: RequestStart, context):
        return ReplyRequestStart(req_id = request.req_id, status_code=200)

    #todo 최준영 현재 진행단계 받아오기
    def getNowStep(self):
        return 2

class StyleServicer(service_pb2_grpc.OCR):
    def __init__(self,channel):
        self.stub = service_pb2_grpc.OCRStub(channel)

    def OnUpdateStep(self):
        response = self.stub.OnUpdateStep(SendStep(req_id=3,step=self.getNowStep()))
        print(response)

    def OnComplete(self):
        response = self.stub.OnComplete(SendResult(req_id=3,data="asdasdasd"))
        print(response)

    def Start(self, request: RequestStart, context):
        return ReplyRequestStart(status_code=32)

    #todo 최준영 현재 진행단계 받아오기
    def getNowStep(self):
        return 2

class GRPCSocket():
    def __init__(self,url,server_port,client_port):
        self.client_url = f'{url}:{client_port}'
        self.server_url = f'{url}:{server_port}'
        self.init_servicer()
        self.async_open_server()
        
    def init_servicer(self):
        channel = grpc.insecure_channel(self.client_url) 
        self.OCRServicer = OCRServicer(channel)
        self.StyleServicer = StyleServicer(channel)

    def async_open_server(self):
        loop = asyncio.get_event_loop()
        loop.run_until_complete(self.__open_server())
        loop.close()

    async def __open_server(self):
        server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
        service_pb2_grpc.add_OCRServicer_to_server(
            self.OCRServicer, server
        )
        service_pb2_grpc.add_OCRServicer_to_server(
            self.StyleServicer, server
        )
        server.add_insecure_port(self.server_url)
        server.start()
        print("start listening")
        await server.wait_for_termination()

if __name__ == '__main__':
    GRPCSocket("localhost",50051,50050)