import supertest = require('supertest');
import app from 'src/app'
import { expect } from "chai"
import fs from 'fs';
import path from 'path';
import { IMAGE_DIR, JSON_DIR } from 'src/modules/const';
import { clearTestImage, clearTestJSON } from './utils';

describe('process OCR', function() {
	this.timeout(300000); 
    var req_id = 0
    before(function(done) {
        supertest(app).post('/upload/segmentation/source')
            .attach('source', 'test/resource/test_img.png')
            .field({title:"OCR test"})
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
    it('OCR start', async function() {
        supertest(app).get('/upload/OCR/select')
            .query({req_id:req_id})
            .expect(200)
            .end(function(err:Error, res:supertest.Response) {
                if (err) return;
                expect(res.body.success).to.equal(true)
                // done()`;
            });
        while(true){
            await new Promise(resolve => setTimeout(resolve, 2000));
            const bbox = `${JSON_DIR}/bbox/${req_id}.json`
            const complete = fs.existsSync(bbox)
            if(complete)
                break;
        }
    });
    it('OCR complete', async function() {
        while(true){
            await new Promise(resolve => setTimeout(resolve, 2000));
            const res = await supertest(app).get('/upload/OCR/result').query({req_id:req_id}).expect(200)
            expect(res.body.complete).to.be.a('boolean')
            if(res.body.complete == true){
                break
            }
        }
    });

    after(function(done){
        clearTestImage();
        clearTestJSON();
        done();
    })
});
