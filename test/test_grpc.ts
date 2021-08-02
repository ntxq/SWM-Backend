import { grpcSocket } from 'src/gRPC/grpc_socket';
import { expect } from "chai"
import { ReplyRequestStart } from 'src/gRPC/grpc_message_interface';
import supertest from 'supertest';
import app from 'src/app';
import { JSON_DIR } from 'src/modules/const';

describe('GRPC connection', function() {
	this.timeout(300000); 
    var req_id = 0
    before(function(done) {
        supertest(app).post('/upload/segmentation/source')
            .attach('source', 'test/resource/test_img.png')
            .field({title:"GRPC test"})
            .expect(200)
            .end(function(err:Error, res:supertest.Response) {
                if (err) return done(err);
                expect(res.body.req_ids).to.hasOwnProperty("test_img.png")
                expect(res.body.req_ids["test_img.png"]).to.be.a('number')
                const _req_ids = res.body.req_ids
                req_id = _req_ids["test_img.png"]
                done()
            });
    }); 
    it('Segmentation start', function(done) {
        grpcSocket.segmentation.Start(req_id,(err:Error,res:ReplyRequestStart)=>{
            expect(res.status_code).to.equal(200)
            expect(res.req_id).to.equal(`${req_id}`)
            done()
        })
    });
    describe('Edit segmentation', function() {
        before(async function() {
            while(true){
                const res = await supertest(app).get('/upload/segmentation/result').query({req_id:req_id}).expect(200)
                expect(res.body.complete).to.be.a("boolean")
                if(res.body.complete == true){
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }); 
        it('Update mask', function(done) {
            var masks = new Array<Array<number>>();
            const rle = require(`${JSON_DIR}/mask/${req_id}.json`)
            masks.push(rle)

            grpcSocket.segmentation.UpdateMask(req_id,masks,(err:Error,res:ReplyRequestStart)=>{
                done()
            })
        });
    })
});