/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable no-prototype-builtins */
import supertest from "supertest";
import app from "src/app";
import { expect } from "chai";
import { grpcSocket } from "src/gRPC/grpc_socket";
import sinon from "ts-sinon";
import { mysqlConnection } from "src/sql/sql_connection";
import bboxJson from "test/resource/bbox.json";
import { queryManager } from "src/sql/mysql_connection_manager";

describe.only("/oauth request", function () {
  it("/oauth/kakao", async function () {
    const response = await supertest(app).get("/oauth/kakao").expect(302);
  });
  it("/oauth", async function () {
    const response = await supertest(app).get("/oauth/kakao").expect(302);
  });
});
