const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { after, before, describe, test } = require("node:test");
const request = require("supertest");

const app = require("../app");
const db = require("../db");

const username = `token_test_${Date.now()}`;
const password = "correct_password";

const expiredToken = jwt.sign({ data: { id: 0 } }, process.env.JWT_SECRET_KEY, {
  expiresIn: "0s",
});

const tamperedToken = jwt.sign({ data: { id: 0 } }, "wrong_secret_key", {
  expiresIn: "10m",
});

const validToken = jwt.sign({ data: { id: 0 } }, process.env.JWT_SECRET_KEY, {
  expiresIn: "10m",
});

describe("token authentication", () => {
  test("missing token", async () => {
    await request(app).get("/todos").expect(401);
  });

  test("expired token", async () => {
    await request(app)
      .get("/todos")
      .set("Authorization", `Bearer ${expiredToken}`)
      .expect(401);
  });

  test("malformed token", async () => {
    await request(app)
      .get("/todos")
      .set("Authorization", `Bearer invalid_token`)
      .expect(401);
  });

  test("tampered token", async () => {
    await request(app)
      .get("/todos")
      .set("Authorization", `Bearer ${tamperedToken}`)
      .expect(401);
  });

  test("valid token", async () => {
    await request(app)
      .get("/todos")
      .set("Authorization", `Bearer ${validToken}`)
      .expect(200);
  });
});
