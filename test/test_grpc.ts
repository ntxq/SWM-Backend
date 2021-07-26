import { grpcSocket } from 'src/gRPC/grpc_socket';
import { expect } from "chai"
import rle from "./resource/rle.json"
import { ReplyRequestStart } from 'src/gRPC/grpc_message_interface';

describe('GRPC connection', function() {
	this.timeout(300000); 
    it('Segmentation start', function(done) {
        grpcSocket.segmentation.Start(300,(err:Error,res:ReplyRequestStart)=>{
            expect(res.status_code).to.equal(200)
            expect(res.req_id).to.equal("300")
            // done()
        })
    });
    it('Update mask', function(done) {
        var masks = new Array<Array<number>>();
        rle.result.forEach(mask=>{
            masks.push(mask.value.rle)
        })
        grpcSocket.segmentation.UpdateMask(300,masks,(err:Error,res:ReplyRequestStart)=>{
        })
        // done()
    });
    // UpdateMask
});