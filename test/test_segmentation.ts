import supertest = require('supertest');
import app from 'src/app'
import { expect } from "chai"
import fs from 'fs';
import path from 'path';

function clearDirectory(directory:string){
    console.log(directory)
    fs.readdir(directory, (err, files) => {
        if (err) throw err;
      
        for (const file of files) {
            const file_path = path.join(directory, file)
            if(!fs.lstatSync(file_path).isDirectory()){
                fs.unlink(file_path, err => {
                    if (err) throw err;
                });
            }
            else{
                clearDirectory(directory)
            }
        }
    });
}
function clearTestImage(){
    const directory = "src/images/"
    fs.readdir(directory, (err, files) => {
        if (err) throw err;
      
        for (const file of files) {
            const file_path = path.join(directory, file)
            if(!fs.lstatSync(file_path).isDirectory()){
                fs.unlink(file_path, err => {
                    if (err) throw err;
                });
            }
            else{
                clearDirectory(file_path)
            }
        }
    });
}

describe('upload source only', function() {
    it('valid file', function(done) {
        supertest(app).post('/upload/segmentation/source')
            .attach('source', 'test/resource/test_img.png')
            .expect(200)
            .end(function(err:Error, res:supertest.Response) {
                clearTestImage()
                if (err) return done(err);
                expect(res.body.req_ids).to.hasOwnProperty("test_img.png")
                expect(res.body.req_ids["test_img.png"]).to.be.a('number')
                done();
            });
    });
    it('multiple file', function(done) {
        supertest(app).post('/upload/segmentation/source')
            // .send({data:'x'})
            .attach('source', 'test/resource/test_img.png')
            .attach('source', 'test/resource/test_img copy.png')
            .attach('source', 'test/resource/test_img copy 2.png')
            .expect(200)
            .end(function(err:Error, res:supertest.Response) {
                clearTestImage()
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
            .expect(415)
            .end(function(err, res) {
                clearTestImage()
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
            .expect(415)
            .end(function(err:Error, res:supertest.Response) {
                clearTestImage()
                if (err) return done(err);
                done();
            });
              // .field('extra_info', '{"in":"case you want to send json along with your file"}')
    });
});


describe('upload blank file', function() {
    it('with source file', function(done) {
        var req_id = 0
        supertest(app).post('/upload/segmentation/source')
            .attach('source', 'test/resource/test_img.png')
            .expect(200)
            .end(function(err:Error, res:supertest.Response) {
                if (err) return done(err);
                expect(res.body.req_ids).to.hasOwnProperty("test_img.png")
                expect(res.body.req_ids["test_img.png"]).to.be.a('number')
                req_id = res.body.req_ids["test_img.png"]

                supertest(app).post('/upload/segmentation/blank')
                .field('map_ids',`[${req_id}]`)
                .attach('blank', 'test/resource/test_img.png')
                .expect(200)
                .end(function(err:Error, res:supertest.Response) {
                    clearTestImage()
                    if (err) return done(err);
                    expect(res.body.req_ids).to.hasOwnProperty("test_img.png")
                    expect(res.body.req_ids["test_img.png"]).to.be.a('number')
                    done();
                });
            })

    });
    it('only blank file', function(done) {
        supertest(app).post('/upload/segmentation/blank')
            .field('map_ids',`[${9999999999}]`)
            .attach('blank', 'test/resource/test_img.png')
            .expect(400)
            .end(()=>{
                clearTestImage()
                done()
            });
    });
});


describe.only('get result', function() {
    it('get reulst sucess', function(done) {
        var req_id = 0
        supertest(app).get('/upload/segmentation/result')
            .query({req_id:300})
            .expect(200)
            .end(function(err:Error, res:supertest.Response) {
                console.log(res.body)
                if (err) return done(err);
                expect(res.body.complete).to.equal(true)
                done();
        })
    });
    it('get reulst mask', function(done) {
        var req_id = 0
        supertest(app).get('/upload/segmentation/result/mask')
            .query({req_id:300})
            .expect(200)
            .end(function(err:Error, res:supertest.Response) {
                if (err) return done(err);
                expect(res.body.mask).to.be.instanceof(Array)
                done();
        })
    });
    it('get reulst inpaint', function(done) {
        var req_id = 0
        supertest(app).get('/upload/segmentation/result/inpaint')
        .query({req_id:300})
            .expect(200)
            .end(function(err:Error, res:supertest.Response) {
                if (err) return done(err);
                expect(res.body).to.be.instanceof(Buffer)
                done();
        })
    });
});