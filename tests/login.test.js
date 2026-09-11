const bcrypt = require("bcryptjs");
const { after, before, describe, test } = require("node:test");
const request = require("supertest");

const app = require("../app");
const db = require("../db");
const { mintRefreshToken } = require("../controllers/auth");

const username = `login_test_${Date.now()}`;
const password = "correct_login_password";

let userId;
let refreshToken;
let rotatedRefreshToken;

before(async () => {
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await db.one(
    `INSERT INTO users(username, password_hash)
     VALUES($1, $2)
     RETURNING id`,
    [username, passwordHash],
  );

  userId = user.id;
  refreshToken = mintRefreshToken();

  await db.none(
    `INSERT INTO refresh_tokens(user_id, token_hash, expires_at)
     VALUES($1, $2, $3)`,
    [userId, refreshToken, new Date(Date.now() + 10 * 60 * 1000)],
  );
});

after(async () => {
  await db.none("DELETE FROM refresh_tokens WHERE user_id = $1", [userId]);
  await db.none("DELETE FROM users WHERE id = $1", [userId]);
});

describe("login", () => {
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
});
