const bcrypt = require("bcryptjs");
const { after, before, test } = require("node:test");
const request = require("supertest");

const app = require("../app");
const db = require("../db");

const username = `auth_test_${Date.now()}`;
const password = "correct_password";

before(async () => {
  const passwordHash = await bcrypt.hash(password, 10);

  await db.none("INSERT INTO users(username, password_hash) VALUES($1, $2)", [
    username,
    passwordHash,
  ]);
});

after(async () => {
  await db.none("DELETE FROM users WHERE username = $1", [username]);
});

test("correct password succeeds", async () => {
  await request(app)
    .post("/auth/login")
    .send({ username, password })
    .expect(200);
});

test("incorrect password fails", async () => {
  await request(app)
    .post("/auth/login")
    .send({ username, password: "wrong_password" })
    .expect(401);
});

test("unknown username", async () => {
  await request(app)
    .post("/auth/login")
    .send({ username: "unknown_username", password })
    .expect(401);
});

test("login attempts are rate limited", async () => {
  for (let i = 0; i < 10; i++) {
    await request(app)
      .post("/auth/login")
      .send({ username, password: "wrong_password" });
  }

  await request(app)
    .post("/auth/login")
    .send({ username, password: "wrong_password" })
    .expect(429);
});
