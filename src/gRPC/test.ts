var PROTO_PATH = __dirname + '/protos/ai_server.proto';

var parseArgs = require('minimist');
var grpc = require('@grpc/grpc-js');
var protoLoader = require('@grpc/proto-loader');
var packageDefinition = protoLoader.loadSync(
    PROTO_PATH,
    {keepCase: true,
     longs: String,
     enums: String,
     defaults: true,
     oneofs: true
    });
var ai_server_proto = grpc.loadPackageDefinition(packageDefinition).ai_server;

function main() {
  var argv = parseArgs(process.argv.slice(2), {
    string: 'target'
  });
  var target = 'localhost:50051'
  var client = new ai_server_proto.OCR(target,
                                       grpc.credentials.createInsecure());
  var user = 'world'

  client.RunModel({req_id: 1}, function(err, response) {
    console.log('Greeting:', response.status_code);
  });
}

main();