const path = require("node:path");
const { test } = require("node:test");
const request = require("supertest");

const app = require("../app");

test("a sample test", async () => {
  await request(app)
    .get("/todos")
    .expect("Content-Type", /json/)
    // .expect()
    .expect(401);
});
