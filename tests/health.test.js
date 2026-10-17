const { after, describe, test } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const db = require("../config/db");
const { db: prismaDb } = require("../prisma/db");
const app = require("../app");

after(async () => {
  await db.$pool.end();
  await prismaDb.close();
});

describe("health check", () => {
  test("GET /health returns 200", async () => {
    const response = await request(app).get("/health");

    assert.equal(response.status, 200);
    assert.equal(response.body.status, "ok");
  });
});
