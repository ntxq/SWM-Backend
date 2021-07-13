from grpc_tools import protoc

protoc.main((
    '',
    '-Iprotos',
    '--python_out=python_out',
    '--grpc_python_out=python_out',
    'protos/ai_server.proto',
))