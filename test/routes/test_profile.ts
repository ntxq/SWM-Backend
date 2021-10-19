/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-prototype-builtins */
import supertest from "supertest";
import app from "src/app";
import { expect } from "chai";
import sinon from "ts-sinon";
import { queryManager } from "src/sql/mysql_connection_manager";

describe("/upload/profile", function () {
  before("make dummy profile", async () => {
    await queryManager.addDummyUser(1, "test_nickname", "test@email.com");
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  it("get profile", async () => {
    const response: supertest.Response = await supertest(app)
      .get("/upload/profile/")
      .expect(200);
    const body = response.body;
    expect(body).to.hasOwnProperty("email");
    expect(body).to.hasOwnProperty("username");
    expect(body).to.hasOwnProperty("create_time");
    expect(body).to.hasOwnProperty("pic_path");
  });

  it("edit profile", async () => {
    const new_username = "new_username";
    const new_email = "new_email@address.com";
    await supertest(app)
      .put("/upload/profile/")
      .query({ username: new_username })
      .expect(200);
    let response: supertest.Response = await supertest(app)
      .get("/upload/profile/")
      .expect(200);
    expect(response.body.username).to.be.equal(new_username);
    await supertest(app)
      .put("/upload/profile/")
      .query({ email: new_email })
      .expect(200);
    response = await supertest(app).get("/upload/profile/").expect(200);
    expect(response.body.username).to.be.equal(new_username);
    expect(response.body.email).to.be.equal(new_email);
  });

  it("delete profile", async () => {
    await supertest(app).delete("/upload/profile/").query({}).expect(200);
    await supertest(app).get("/upload/profile/").expect(404);
  });

  it.skip("edit profile image", async () => {
    const response: supertest.Response = await supertest(app)
      .get("/upload/profile/")
      .expect(200);
    const body = response.body;
    expect(body).to.hasOwnProperty("email");
    expect(body).to.hasOwnProperty("username");
    expect(body).to.hasOwnProperty("create_time");
    expect(body).to.hasOwnProperty("pic_path");
  });
});
