const jwt = require("jsonwebtoken");
const { after, before, describe, test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const request = require("supertest");

const app = require("../app");
const db = require("../db");

const username = `token_test_${Date.now()}`;
const password = "correct_password";

const mintRefreshToken = () => crypto.randomBytes(64).toString("hex");

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

describe("refresh token", () => {
  const refreshToken = mintRefreshToken();

  before(async () => {
    await db.none(
      "INSERT INTO refresh_tokens(user_id, token_hash, expires_at) VALUES($1, $2, $3)",
      [
        1,
        refreshToken,
        new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
      ],
    );
  });

  after(async () => {
    await db.none("DELETE FROM refresh_tokens WHERE token_hash IN ($1, $2)", [
      refreshToken,
      rotatedRefreshToken,
    ]);
  });

  let rotatedRefreshToken;

  test("valid refresh token", async () => {
    const response = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken });

    assert.equal(response.status, 200);
    assert.equal(typeof response.body.token, "string");
    assert.equal(typeof response.body.refreshToken, "string");
    assert.notEqual(response.body.refreshToken, refreshToken);

    rotatedRefreshToken = response.body.refreshToken;
  });

  test("rotated token can be used once", async () => {
    const response = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken: rotatedRefreshToken });

    assert.equal(response.status, 200);
    assert.equal(typeof response.body.token, "string");
    assert.equal(typeof response.body.refreshToken, "string");
    assert.notEqual(response.body.refreshToken, rotatedRefreshToken);
  });

  test("rotated token can not be used again", async () => {
    const response = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken: rotatedRefreshToken });

    assert.equal(response.status, 401);
  });
});
