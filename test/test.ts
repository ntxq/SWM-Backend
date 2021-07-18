var supertest = require('supertest');
var expect = require("chai").expect;
import app from '../src/app'
// describe('App', function() {
//   it('has the default page', function(done) {
//     request(app)
//       .get('/')
//       .expect(/Welcome to Express/, done);
//   });
// }); 

describe('upload', function() {
    it('valid file', function(done) {
        supertest(app).post('/upload/OCR/source')
            // .send({data:'x'})
            .attach('source', 'test/yano.jpg')
            .expect(200)
            .end(function(err, res) {
                if (err) return done(err);
                done();
            });
              // .field('extra_info', '{"in":"case you want to send json along with your file"}')
    });
    it('invalid file', function(done) {
        supertest(app).post('/upload/OCR/source')
            // .send({data:'x'})
            .attach('source', 'test/test_txt.txt')
            .expect(415)
            .end(function(err, res) {
                if (err) return done(err);
                done();
            });
              // .field('extra_info', '{"in":"case you want to send json along with your file"}')
    });
});