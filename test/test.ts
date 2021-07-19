import supertest = require('supertest');
import app from 'src/app'
import { expect } from "chai"
// var expect = require("chai").expect;

describe('upload source', function() {
    it('valid file', function(done) {
        supertest(app).post('/upload/segmentation/source')
            // .send({data:'x'})
            .attach('source', 'test/test_img.png')
            .expect(200)
            .end(function(err:Error, res:supertest.Response) {
                if (err) return done(err);
                expect(res.body.req_ids).to.hasOwnProperty("test_img.png")
                expect(res.body.req_ids["test_img.png"]).to.be.a('number')
                done();
            });
              // .field('extra_info', '{"in":"case you want to send json along with your file"}')
    });
    it('multiple file', function(done) {
        supertest(app).post('/upload/segmentation/source')
            // .send({data:'x'})
            .attach('source', 'test/test_img.png')
            .attach('source', 'test/test_img copy.png')
            .attach('source', 'test/test_img copy 2.png')
            .expect(200)
            .end(function(err:Error, res:supertest.Response) {
                if (err) return done(err);
                expect(res.body.req_ids).to.hasOwnProperty("test_img.png")
                expect(res.body.req_ids["test_img.png"]).to.be.a('number')
                expect(res.body.req_ids).to.hasOwnProperty("test_img copy.png")
                expect(res.body.req_ids["test_img copy.png"]).to.be.a('number')
                expect(res.body.req_ids).to.hasOwnProperty("test_img copy 2.png")
                expect(res.body.req_ids["test_img copy 2.png"]).to.be.a('number')
                done();
            });
              // .field('extra_info', '{"in":"case you want to send json along with your file"}')
    });
    it('invalid file', function(done) {
        supertest(app).post('/upload/segmentation/source')
            // .send({data:'x'})
            .attach('source', 'test/test_txt.txt')
            .expect(415)
            .end(function(err, res) {
                if (err) return done(err);
                done();
            });
              // .field('extra_info', '{"in":"case you want to send json along with your file"}')
    });
    it('valid and invalid file mix', function(done) {
        supertest(app).post('/upload/segmentation/source')
            // .send({data:'x'})
            .attach('source', 'test/test_img.png')
            .attach('source', 'test/test_txt.txt')
            .attach('source', 'test/test_img copy.png')
            .attach('source', 'test/test_txt.txt')
            .expect(415)
            .end(function(err:Error, res:supertest.Response) {
                if (err) return done(err);
                done();
            });
              // .field('extra_info', '{"in":"case you want to send json along with your file"}')
    });
});