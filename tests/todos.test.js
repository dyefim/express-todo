const path = require("node:path");
const { after, before, describe, test } = require("node:test");
const request = require("supertest");

const app = require("../app");
const db = require("../db");

before(async () => {
  await request(app)
    .post("/auth/sign-up")
    .send({ username: "user1", password: "password1" });

  await request(app)
    .post("/auth/sign-up")
    .send({ username: "user2", password: "password2" });
});

after(async () => {
  await db.any("DELETE FROM users");
});

describe("todos are protected", () => {
  test("user 1 can see their todos", async () => {
    const loginResponse = await request(app)
      .post("/auth/login")
      .send({ username: "user1", password: "password1" });
    await request(app)
      .get("/todos")
      .set("Authorization", `Bearer ${loginResponse.body.token}`)
      .expect(200, []);
  });

  test("user 2 can see their todos", async () => {
    const loginResponse = await request(app)
      .post("/auth/login")
      .send({ username: "user2", password: "password2" });
    await request(app)
      .get("/todos")
      .set("Authorization", `Bearer ${loginResponse.body.token}`)
      .expect(200, []);
  });

  test("user 1 cannot see user 2's todos", async () => {
    const loginResponse = await request(app)
      .post("/auth/login")
      .send({ username: "user1", password: "password1" });

    await request(app)
      .get("/todos/2")
      .set("Authorization", `Bearer ${loginResponse.body.token}`)
      .expect(404);
  });
});
