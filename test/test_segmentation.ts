import supertest = require('supertest');
import app from 'src/app'
import { expect } from "chai"
import fs from 'fs';
import path from 'path';
import { IMAGE_DIR, JSON_DIR } from 'src/modules/const';
import { clearTestImage, clearTestJSON } from './utils';

describe('upload source', function() {
    it('valid file', function(done) {
        supertest(app).post('/upload/segmentation/source')
            .attach('source', 'test/resource/test_img.png')
            .field({title:"test project"})
            .expect(200)
            .end(function(err:Error, res:supertest.Response) {
                if (err) return done(err);
                expect(res.body.req_ids).to.hasOwnProperty("test_img.png")
                expect(res.body.req_ids["test_img.png"]).to.be.a('number')
                done();
            });
    });
    it('multiple file', function(done) {
        supertest(app).post('/upload/segmentation/source')
            .attach('source', 'test/resource/test_img.png')
            .attach('source', 'test/resource/test_img copy.png')
            .attach('source', 'test/resource/test_img copy 2.png')
            .field({title:"test project"})
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
            .attach('source', 'test/resource/test_txt.txt')
            .field({title:"test project"})
            .expect(415)
            .end(function(err, res) {
                if (err) return done(err);
                done();
            });
    });
    it('valid and invalid file mix', function(done) {
        supertest(app).post('/upload/segmentation/source')
            .attach('source', 'test/resource/test_img.png')
            .attach('source', 'test/resource/test_txt.txt')
            .attach('source', 'test/resource/test_img copy.png')
            .attach('source', 'test/resource/test_txt.txt')
            .field({title:"test project"})
            .expect(415)
            .end(function(err:Error, res:supertest.Response) {
                if (err) return done(err);
                done();
            });
              // .field('extra_info', '{"in":"case you want to send json along with your file"}')
    });

    after(function(done){
        clearTestImage();
        clearTestJSON();
        done();
    })
});

describe('upload blank', function() {
    var req_ids:number[] = []
    before(function(done) {
        supertest(app).post('/upload/segmentation/source')
            .attach('source', 'test/resource/test_img.png')
            .attach('source', 'test/resource/test_img copy.png')
            .attach('source', 'test/resource/test_img copy 2.png')
            .field({title:"blank test"})
            .expect(200)
            .end(function(err:Error, res:supertest.Response) {
                if (err) return done(err);
                expect(res.body.req_ids).to.hasOwnProperty("test_img.png")
                expect(res.body.req_ids["test_img.png"]).to.be.a('number')
                expect(res.body.req_ids).to.hasOwnProperty("test_img copy.png")
                expect(res.body.req_ids["test_img copy.png"]).to.be.a('number')
                expect(res.body.req_ids).to.hasOwnProperty("test_img copy 2.png")
                expect(res.body.req_ids["test_img copy 2.png"]).to.be.a('number')
                const _req_ids = res.body.req_ids
                req_ids = [_req_ids["test_img.png"],_req_ids["test_img copy.png"],_req_ids["test_img copy 2.png"]]
                done();
            });
    }); 

    it('blank file', function(done) {
        supertest(app).post('/upload/segmentation/blank')
        .field('map_ids',`[${req_ids[0]}, ${req_ids[1]}]`)
        .field('empty_id',`[]`)
        .attach('blank', 'test/resource/test_img.png')
        .attach('blank', 'test/resource/test_img copy 2.png')
        .expect(200)
        .end(function(err:Error, res:supertest.Response) {
            if (err) return done(err);
            expect(res.body.req_ids).to.hasOwnProperty("test_img.png")
            expect(res.body.req_ids["test_img.png"]).to.be.a('number')
            done();
        });
    });

    it('not blank file', function(done) {
        supertest(app).post('/upload/segmentation/blank')
        .field('map_ids',`[]`)
        .field('empty_id',`[${req_ids[2]}]`)
        .attach('blank', '')
        .expect(200)
        .end(function(err:Error, res:supertest.Response) {
            if (err) return done(err);
            expect(res.body.req_ids).to.be.empty//.empty().equal({})
            done();
        });
    });
    
    it('invalid file', function(done) {
        supertest(app).post('/upload/segmentation/source')
            .attach('source', 'test/resource/test_txt.txt')
            .field({title:"blank test"})
            .expect(415)
            .end(function(err, res) {
                if (err) return done(err);
                done();
            });
    });

    after(function(done){
        clearTestImage();
        clearTestJSON();
        done();
    })
});

describe('get result', function() {
    var req_id:number = NaN
    before(function(done) {
        supertest(app).post('/upload/segmentation/source')
            .attach('source', 'test/resource/test_img.png')
            .field({title:"masking test"})
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

    it('get result sucess', function(done) {
        supertest(app).get('/upload/segmentation/result')
            .query({req_id:req_id})
            .expect(200)
            .end(function(err:Error, res:supertest.Response) {
                if (err) return done(err);
                expect(res.body.complete).to.be.a("boolean")
                done();
        })
    });

    describe('result success check',function() {
        before('wait sucess', async function() {
            this.timeout(1000 * 60 * 5); 
            while(true){
                const res = await supertest(app).get('/upload/segmentation/result').query({req_id:req_id}).expect(200)
                expect(res.body.complete).to.be.a("boolean")
                if(res.body.complete == true){
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        });
        it('get reulst inpaint', function(done) {
            supertest(app).get('/upload/segmentation/result/inpaint')
            .query({req_id:req_id})
                .expect(200)
                .end(function(err:Error, res:supertest.Response) {
                    if (err) return done(err);
                    expect(res.body).to.be.instanceof(Buffer)
                    done();
            })
        });
        it('get reulst mask', function(done) {
            supertest(app).get('/upload/segmentation/result/mask')
                .query({req_id:req_id})
                .expect(200)
                .end(function(err:Error, res:supertest.Response) {
                    if (err) return done(err);
                    expect(res.body.mask).to.be.instanceof(Array)
                    done();
            })
        });
    })

    after(function(done){
        clearTestImage();
        clearTestJSON();
        done();
    })
});


describe('update mask', function(){
    var req_id:number = NaN
    before(async function() {
        this.timeout(1000 * 60 * 5); 
        {
            var res = await supertest(app).post('/upload/segmentation/source')
                .attach('source', 'test/resource/test_img.png')
                .field({title:"masking update test"})
                .expect(200)
            expect(res.body.req_ids).to.hasOwnProperty("test_img.png")
            expect(res.body.req_ids["test_img.png"]).to.be.a('number')
            const _req_ids = res.body.req_ids
            req_id = _req_ids["test_img.png"]

            res = await supertest(app).post('/upload/segmentation/blank')
                .field('map_ids',`[]`)
                .field('empty_id',`[${req_id}]`)
                .attach('blank', '')
                .expect(200)
            expect(res.body.req_ids).to.be.empty
        }
        while(true){
            const res = await supertest(app).get('/upload/segmentation/result').query({req_id:req_id}).expect(200)
            expect(res.body.complete).to.be.a("boolean")
            if(res.body.complete == true){
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }); 
    it('update mask', async function() {
        const rle = require(path.join(JSON_DIR,'mask',`${req_id}.json`))
        const mask = {"result":[{"value":{"rle":rle}}]}

        var res = await supertest(app).post('/upload/segmentation/mask')
            .send({req_id:req_id, mask:JSON.stringify(mask)})
            .expect(200)
        expect(res.body.success).to.equal(true)
        
        await new Promise(resolve => setTimeout(resolve, 2000));

        res = await supertest(app).get('/upload/segmentation/result').query({req_id:req_id}).expect(200)
        expect(res.body.complete).to.equal(false)
    });

    after(function(done){
        clearTestImage();
        clearTestJSON();
        done();
    })
});