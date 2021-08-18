import supertest = require('supertest');
import app from 'src/app'
import { expect } from "chai"
import fs from 'fs';
import path from 'path';
import { IMAGE_DIR, JSON_DIR } from 'src/modules/const';
import { clearTestImage, clearTestJSON } from './utils';
import { TranslateBBox } from 'src/routes/upload/ocr';

describe('process OCR', function () {
	this.timeout(2 * 60 * 1000);
	var req_id = 0
	var cut_id = 0
	var bboxList: TranslateBBox[] = []
	before(async function () {
		const res = await supertest(app).post('/upload/segmentation/source')
			.attach('source', 'test/resource/test_img.png')
			.field({ title: "OCR test" })
			.expect(200)
		expect(res.body.req_ids).to.hasOwnProperty("test_img.png")
		const res_test_img = res.body.req_ids["test_img.png"]
		req_id = res_test_img["req_id"]
		cut_id = res_test_img["cut_count"]
		expect(req_id).to.be.a('number')
		expect(cut_id).to.be.a('number')

		while (true) {
			await new Promise(resolve => setTimeout(resolve, 2000));
			const res_cut = await supertest(app).get('/upload/segmentation/cut')
				.query({ req_id: req_id, cut_id: cut_id })
			if (res_cut.statusCode == 200) {
				break
			}
		}
	});
	it('OCR start', function (done) {
		supertest(app).get('/upload/OCR/select')
			.query({ req_id: req_id, cut_id: cut_id })
			.expect(200)
			.end(function (err: Error, res: supertest.Response) {
				if (err) return;
				expect(res.body.success).to.equal(true)
				done();
			});
	});

	it('OCR complete', async function () {
		while (true) {
			await new Promise(resolve => setTimeout(resolve, 2000));
			const res = await supertest(app).get('/upload/OCR/result').query({ req_id: req_id, cut_id: cut_id }).expect(200)
			expect(res.body.progress).to.be.a("number")
			if (res.body.progress == 100) {
				break
			}
		}
	});

	it('OCR get bboxes', function (done) {
		supertest(app).get('/upload/OCR/result/bbox')
			.query({ req_id: req_id, cut_id: cut_id })
			.expect(200)
			.end((err, res) => {
				expect(res.body.bboxList).to.be.an('array')
				expect(res.body.bboxList[0]).to.haveOwnProperty('bbox_id')
				expect(res.body.bboxList[0]).to.haveOwnProperty('originalX')
				expect(res.body.bboxList[0]).to.haveOwnProperty('originalY')
				expect(res.body.bboxList[0]).to.haveOwnProperty('originalWidth')
				expect(res.body.bboxList[0]).to.haveOwnProperty('originalHeight')
				expect(res.body.bboxList[0]).to.haveOwnProperty('originalText')
				bboxList = res.body.bboxList
				done()
			})
	});

	it('OCR text edit', function (done) {
		for (var bbox of bboxList) {
			bbox.translatedWidth = bbox.originalWidth
			bbox.translatedHeight = bbox.originalHeight
			bbox.translatedX = bbox.originalX
			bbox.translatedY = bbox.originalY
			bbox.translatedText = bbox.originalText
			bbox.fontColor = "#FFFFFF"
			bbox.fontFamily = "HY"
			bbox.fontSize = 14
			bbox.fontWeight = 'bold'
			bbox.fontStyle = "light"
		}
		supertest(app).post('/upload/OCR/edit')
			.send({
				req_id: req_id,
				cut_id: cut_id,
				bboxList: JSON.stringify(bboxList)
			})
			.expect(200)
			.end(function (err: Error, res: supertest.Response) {
				if (err) {
					console.error(err)
					done(err);
					return;
				}
				expect(res.body.success).to.equal(true)
				done();
			});
	});

	it('OCR complete edit', async function () {
		while (true) {
			await new Promise(resolve => setTimeout(resolve, 2000));
			const res = await supertest(app).get('/upload/OCR/result').query({ req_id: req_id, cut_id: cut_id }).expect(200)
			expect(res.body.progress).to.be.a("number")
			if (res.body.progress == 100) {
				break
			}
		}
	});

	after(function (done) {
		clearTestImage();
		clearTestJSON();
		done();
	})
});
