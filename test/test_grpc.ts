import { grpcSocket } from 'src/gRPC/grpc_socket';
import { expect } from "chai"
import { ReplyRequestStart } from 'src/gRPC/grpc_message_interface';
import supertest from 'supertest';
import app from 'src/app';
import { JSON_DIR } from 'src/modules/const';

describe('GRPC connection', function () {
	this.timeout(300000);
	var req_id = 0
	before(function (done) {
		const image_name = "test_img_big.png"
		supertest(app).post('/upload/segmentation/source')
			.attach('source', `test/resource/${image_name}`)
			.field({ title: "GRPC test" })
			.expect(200)
			.end(function (err: Error, res: supertest.Response) {
				if (err) return done(err);
				expect(res.body.req_ids).to.hasOwnProperty(image_name)
				const res_body = res.body.req_ids[image_name]
				expect(res_body["req_id"]).to.be.a('number')
				req_id = res_body["req_id"]
				done()
			});
	});
	it('Segmentation start', function (done) {
		grpcSocket.segmentation.Start(req_id, 0).then(res=>{
			expect(res.status_code).to.equal(200)
			expect(res.req_id).to.equal(req_id)
			done()
		}).catch((err)=>{
			done(err)
		})
	});
	describe('Edit segmentation', function () {
		before(async function () {
			while (true) {
				const res = await supertest(app).get('/upload/segmentation/result').query({ req_id: req_id, cut_id: 1 }).expect(200)
				expect(res.body.progress).to.be.a("number")
				if (res.body.progress == 100) {
					break;
				}
				await new Promise(resolve => setTimeout(resolve, 2000));
			}
		});
		it('Update mask', function (done) {
			var masks = new Array<Array<number>>();
			const rle = require(`${JSON_DIR}/mask/${req_id}_1.json`)
			masks.push(rle)

			grpcSocket.segmentation.UpdateMask(req_id, 1, masks).then(()=>{
				done()
			}).catch((err)=>{
				done(err)
			})
		});
	})
});