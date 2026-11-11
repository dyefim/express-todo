const bcrypt = require("bcryptjs");
const { after, before, describe, test } = require("node:test");
const request = require("supertest");

const app = require("../app");
const { mintRefreshToken } = require("../controllers/auth");
const { db: prismaDb } = require("../prisma/db");

const username = `login_test_${Date.now()}`;
const password = "correct_login_password";

let userId;
let refreshToken;

before(async () => {
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prismaDb.orm.public.Users.create({
    username,
    passwordHash,
  });

  userId = user.id;
  refreshToken = mintRefreshToken();

  await prismaDb.orm.public.RefreshTokens.create({
    userId,
    tokenHash: refreshToken,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
});

after(async () => {
  await prismaDb.orm.public.RefreshTokens.where({ userId }).deleteAndCount();
  await prismaDb.orm.public.Users.where({ id: userId }).deleteAndCount();
  await prismaDb.close();
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

  test("missing password fails", async () => {
    await request(app).post("/auth/login").send({ username }).expect(400);
  });

  test("missing username fails", async () => {
    await request(app).post("/auth/login").send({ password }).expect(400);
  });
});
