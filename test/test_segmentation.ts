import supertest = require('supertest');
import app from 'src/app'
import { expect } from "chai"
import path from 'path';
import { JSON_DIR } from 'src/modules/const';
import { clearTestImage, clearTestJSON } from 'test/utils';

describe('upload source', function () {
	this.timeout(10 * 1000); 
	it('valid file', function (done) {
		supertest(app).post('/upload/segmentation/source')
			.attach('source', 'test/resource/test_img.png')
			.field({ title: "test project" })
			.expect(200)
			.end(function (err: Error, res: supertest.Response) {
				if (err) return done(err);
				expect(res.body.req_ids).to.hasOwnProperty("test_img.png")
				var res_body = res.body.req_ids["test_img.png"]
				expect(res_body["req_id"]).to.be.a('number')
				expect(res_body["cut_count"]).to.be.a('number')
				done();
			});
	});
	it('multiple file', function (done) {
		const image_list = ["test_img.png", "test_img copy.png", "test_img copy 2.png"]
		supertest(app).post('/upload/segmentation/source')
			.attach('source', `test/resource//${image_list[0]}`)
			.attach('source', `test/resource//${image_list[1]}`)
			.attach('source', `test/resource/${image_list[2]}`)
			.field({ title: "test project" })
			.expect(200)
			.end(function (err: Error, res: supertest.Response) {
				if (err) return done(err);
				for (const image_name of image_list) {
					expect(res.body.req_ids).to.hasOwnProperty(image_name)
					var res_body = res.body.req_ids[image_name]
					expect(res_body["req_id"]).to.be.a('number')
					expect(res_body["cut_count"]).to.be.a('number')
				}
				done();
			});
		// .field('extra_info', '{"in":"case you want to send json along with your file"}')
	});
	it('invalid file', function (done) {
		supertest(app).post('/upload/segmentation/source')
			.attach('source', 'test/resource/test_txt.txt')
			.field({ title: "test project" })
			.expect(415)
			.end(function (err, res) {
				if (err) return done(err);
				done();
			});
	});
	it('valid and invalid file mix', function (done) {
		supertest(app).post('/upload/segmentation/source')
			.attach('source', 'test/resource/test_img.png')
			.attach('source', 'test/resource/test_txt.txt')
			.attach('source', 'test/resource/test_img copy.png')
			.attach('source', 'test/resource/test_txt.txt')
			.field({ title: "test project" })
			.expect(415)
			.end(function (err: Error, res: supertest.Response) {
				if (err) return done(err);
				done();
			});
		// .field('extra_info', '{"in":"case you want to send json along with your file"}')
	});

	after(function (done) {
		clearTestImage();
		clearTestJSON();
		done();
	})
});

describe('upload blank', function () {
	this.timeout(10 * 1000); 
	var req_ids: number[] = []
	const image_list = ["test_img.png", "test_img copy.png", "test_img copy 2.png"]
	before(function (done) {
		supertest(app).post('/upload/segmentation/source')
			.attach('source', `test/resource/${image_list[0]}`)
			.attach('source', `test/resource/${image_list[1]}`)
			.attach('source', `test/resource/${image_list[2]}`)
			.field({ title: "blank test" })
			.expect(200)
			.end(function (err: Error, res: supertest.Response) {
				if (err) return done(err);
				for (const image_name of image_list) {
					expect(res.body.req_ids).to.hasOwnProperty(image_name)
					var res_body = res.body.req_ids[image_name]
					expect(res_body["req_id"]).to.be.a('number')
					expect(res_body["cut_count"]).to.be.a('number')
					req_ids.push(res_body["req_id"])
				}
				done();
			});
	});

	it('blank file', function (done) {
		supertest(app).post('/upload/segmentation/blank')
			.field('map_ids', `[${req_ids[0]}, ${req_ids[1]}]`)
			.field('empty_id', `[]`)
			.attach('blank', 'test/resource/test_img.png')
			.attach('blank', 'test/resource/test_img copy 2.png')
			.expect(200)
			.end(function (err: Error, res: supertest.Response) {
				if (err) return done(err);
				expect(res.body.success).to.be.a("boolean")
				done();
			});
	});

	it('not blank file', function (done) {
		supertest(app).post('/upload/segmentation/blank')
			.field('map_ids', `[]`)
			.field('empty_id', `[${req_ids[2]}]`)
			.attach('blank', '')
			.expect(200)
			.end(function (err: Error, res: supertest.Response) {
				if (err) return done(err);
				expect(res.body.success).to.be.a("boolean")
				done();
			});
	});

	it('invalid file', function (done) {
		supertest(app).post('/upload/segmentation/source')
			.attach('source', 'test/resource/test_txt.txt')
			.field({ title: "blank test" })
			.expect(415)
			.end(function (err, res) {
				if (err) return done(err);
				done();
			});
	});

	after(function (done) {
		clearTestImage();
		clearTestJSON();
		done();
	})
});

describe('get result', function () {
	this.timeout(1000 * 60 * 5);
	var req_id: number = NaN
	var cut_count: number = NaN
	const image_name = "test_img_big.png"
	before(function (done) {
		supertest(app).post('/upload/segmentation/source')
			.attach('source', `test/resource/${image_name}`)
			.field({ title: "masking test" })
			.expect(200)
			.end(function (err: Error, res: supertest.Response) {
				if (err) return done(err);
				expect(res.body.req_ids).to.hasOwnProperty(image_name)
				const res_body = res.body.req_ids[image_name]
				expect(res_body['req_id']).to.be.a('number')
				req_id = res_body['req_id']
				cut_count = res_body['cut_count']

				supertest(app).post('/upload/segmentation/blank')
					.field('map_ids', `[]`)
					.field('empty_id', `[${req_id}]`)
					.attach('blank', '')
					.expect(200)
					.end(function (err: Error, res: supertest.Response) {
						if (err) return done(err);
						expect(res.body.success).to.be.a("boolean")
						done();
					});
			});
	});

	it.only('get cuts', async function (done) {
		try{
			for(var i = 1; i<= cut_count;i++){
				while (true){
					const res = await supertest(app).get('/upload/segmentation/cut')
					.query({ req_id: req_id, cut_id: i })
					if(res.statusCode == 200){
						break;
					}
					else if(res.statusCode !== 500 && res.statusCode !== 400){
						expect(res.statusCode).to.be.equal(500)
					}
					await new Promise(resolve => setTimeout(resolve, 2000));
				}
			}
			done();
		}
		catch(err){
			done(err);
		}
	});

	it('get result sucess', function (done) {
		supertest(app).get('/upload/segmentation/result')
			.query({ req_id: req_id, cut_id: 1 })
			.expect(200)
			.end(function (err: Error, res: supertest.Response) {
				if (err) return done(err);
				expect(res.body.progress).to.be.a("number")
				done();
			})
	});

	describe('result success check', function () {
		before('wait sucess', async function () {
			this.timeout(1000 * 60 * 5);
			while (true) {
				const res = await supertest(app).get('/upload/segmentation/result').query({ req_id: req_id, cut_id: 1 }).expect(200)
				console.log(res.body)
				expect(res.body.progress).to.be.a("number")
				if (res.body.progress == 100) {
					break;
				}
				await new Promise(resolve => setTimeout(resolve, 2000));
			}
		});
		it('get reulst inpaint', function (done) {
			supertest(app).get('/upload/segmentation/result/inpaint')
				.query({ req_id: req_id, cut_id: 1 })
				.expect(200)
				.end(function (err: Error, res: supertest.Response) {
					if (err) return done(err);
					expect(res.body).to.be.instanceof(Buffer)
					done();
				})
		});
		it('get reulst mask', function (done) {
			supertest(app).get('/upload/segmentation/result/mask')
				.query({ req_id: req_id, cut_id: 1 })
				.expect(200)
				.end(function (err: Error, res: supertest.Response) {
					if (err) return done(err);
					expect(res.body.mask).to.be.instanceof(Array)
					done();
				})
		});
	})

	after(function (done) {
		clearTestImage();
		clearTestJSON();
		done();
	})
});


describe('update mask', function () {
	this.timeout(10000);
	var req_id: number = NaN
	before(async function () {
		this.timeout(1000 * 60 * 5);
		{
			var res = await supertest(app).post('/upload/segmentation/source')
				.attach('source', 'test/resource/test_img.png')
				.field({ title: "masking update test" })
				.expect(200)
			expect(res.body.req_ids).to.hasOwnProperty("test_img.png")
			const res_body = res.body.req_ids["test_img.png"]
			expect(res_body["req_id"]).to.be.a('number')
			req_id = res_body["req_id"]

			res = await supertest(app).post('/upload/segmentation/blank')
				.field('map_ids', `[]`)
				.field('empty_id', `[${req_id}]`)
				.attach('blank', '')
				.expect(200)
			expect(res.body.success).to.be.a("boolean")
		}
		while (true) {
			const res = await supertest(app).get('/upload/segmentation/result').query({ req_id: req_id, cut_id: 1 }).expect(200)
			expect(res.body.progress).to.be.a("number")
			if (res.body.progress == 100) {
				break;
			}
			await new Promise(resolve => setTimeout(resolve, 2000));
		}
	});
	it('update mask', async function () {
		const rle = require(path.join(JSON_DIR, 'mask', `${req_id}_1.json`))
		const mask = { "result": [{ "value": { "rle": rle } }] }

		var res = await supertest(app).post('/upload/segmentation/mask')
			.send({ req_id: req_id, cut_id: 1, mask: JSON.stringify(mask) })
			.expect(200)
		expect(res.body.success).to.equal(true)

		await new Promise(resolve => setTimeout(resolve, 2000));

		res = await supertest(app).get('/upload/segmentation/result').query({ req_id: req_id, cut_id: 1 }).expect(200)
		expect(res.body.progress).to.be.a("number")
	});

	after(function (done) {
		clearTestImage();
		clearTestJSON();
		done();
	})
});