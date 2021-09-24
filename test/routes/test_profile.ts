/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-prototype-builtins */
import supertest from "supertest";
import app from "src/app";
import { expect } from "chai";
import rle from "test/resource/rle.json";
import sinon from "ts-sinon";
import { queryManager } from "src/sql/mysql_connection_manager";
import { grpcSocket } from "src/gRPC/grpc_socket";
import { s3 } from "src/modules/s3_wrapper";
import { mysqlConnection } from "src/sql/sql_connection";
import { getImagePath } from "src/modules/utils";
import { PostProjectResponse } from "src/routes/upload/segmentation";

describe("/api/profile", function () {
  before("make dummy profile", async () => {
    await queryManager.addDummyUser(111, "test_nickname", "test@email.com");
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  it("get profile", async () => {
    const response: supertest.Response = await supertest(app)
      .get("/api/profile/")
      .expect(200);
    const body = response.body;
    expect(body).to.hasOwnProperty("email");
    expect(body).to.hasOwnProperty("username");
    expect(body).to.hasOwnProperty("create_time");
    expect(body).to.hasOwnProperty("pic_url");
  });

  it("edit profile", async () => {
    const new_username = "new_username";
    const new_email = "new_email@address.com";
    await supertest(app)
      .put("/api/profile/edit")
      .query({ username: new_username })
      .expect(200);
    let response: supertest.Response = await supertest(app)
      .get("/api/profile/")
      .expect(200);
    expect(response.body.username).to.be.equal(new_username);
    await supertest(app)
      .put("/api/profile/edit")
      .query({ email: new_email })
      .expect(200);
    response = await supertest(app).get("/api/profile/").expect(200);
    expect(response.body.username).to.be.equal(new_username);
    expect(response.body.email).to.be.equal(new_email);
  });

  it("delete profile", async () => {
    await supertest(app).delete("/api/profile/edit").query({}).expect(200);
    await supertest(app).get("/api/profile/").expect(410);
  });
});
