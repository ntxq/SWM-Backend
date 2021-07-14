from grpc_tools import protoc
import pathlib
directory = f"{str(pathlib.Path(__file__).parent.resolve().parent.resolve())}/src/gRPC/protos"
file = f"{directory}/ai_server.proto"
protoc.main((
    '',
    '-Iprotos',
    '--python_out=gRPC',
    '--grpc_python_out=gRPC',
    f'--proto_path={directory}',
    file
))