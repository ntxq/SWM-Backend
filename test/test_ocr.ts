import supertest = require('supertest');
import app from 'src/app'
import { expect } from "chai"
import fs from 'fs';
import path from 'path';
import { IMAGE_DIR, JSON_DIR } from 'src/modules/const';
import { clearTestImage, clearTestJSON } from './utils';

describe.only('process OCR', function() {
    var req_id = 0
    before(function(done) {
        supertest(app).post('/upload/segmentation/source')
            .attach('source', 'test/resource/test_img.png')
            .expect(200)
            .end(function(err:Error, res:supertest.Response) {
                if (err) return done(err);
                expect(res.body.req_ids).to.hasOwnProperty("test_img.png")
                expect(res.body.req_ids["test_img.png"]).to.be.a('number')
                const _req_ids = res.body.req_ids
                req_id = _req_ids["test_img.png"]

                supertest(app).post('/upload/segmentation/blank')
                .field('map_ids',`[]`)
                .field('empty_id',`[${req_id}]`)
                .attach('blank', '')
                .expect(200)
                .end(function(err:Error, res:supertest.Response) {
                    if (err) return done(err);
                    expect(res.body.req_ids).to.be.empty//.empty().equal({})
                    done();
                });
            });
    }); 
    it('OCR start', function(done) {
        supertest(app).get('/upload/OCR/select')
            .query({req_id:req_id})
            .expect(200)
            .end(function(err:Error, res:supertest.Response) {
                if (err) return done(err);
                expect(res.body.success).to.equal(true)
                done();
            });
    });

    after(function(done){
        clearTestImage();
        clearTestJSON();
        done();
    })
});
