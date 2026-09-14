const path = require("node:path");
const { after, before, describe, test } = require("node:test");
const request = require("supertest");
const assert = require("node:assert/strict");


const app = require("../app");
const db = require("../db");

const createUser = async (username, password = "password1") => {
  const response = await request(app)
    .post("/auth/sign-up")
    .send({ username, password })
    .expect(201);

  return {
    username,
    password,
    id: response.body.user.id,
  };
};

after(async () => {
  await db.any("DELETE FROM users");
  await db.$pool.end();
});

describe("todos are protected", () => {
  before(async () => {
    await createUser("user1", "password1");
    await createUser("user2", "password2");
  });

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

describe("todos can be sorted", () => {
  let user;

  before(async () => {
    user = await createUser(`sorting_user_${Date.now()}`);
  });

  after(async () => {
    await db.none("DELETE FROM users WHERE id = $1", [user.id]);
  });

  test("by title", async () => {
    const loginResponse = await request(app)
      .post("/auth/login")
      .send({ username: user.username, password: user.password });

    await request(app)
      .post("/todos")
      .set("Authorization", `Bearer ${loginResponse.body.token}`)
      .send({ title: "A todo" });
    await request(app)
      .post("/todos")
      .set("Authorization", `Bearer ${loginResponse.body.token}`)
      .send({ title: "C todo" });
    await request(app)
      .post("/todos")
      .set("Authorization", `Bearer ${loginResponse.body.token}`)
      .send({ title: "B todo" });

    await request(app)
      .get("/todos?sort=title")
      .set("Authorization", `Bearer ${loginResponse.body.token}`)
      .expect((res) => {
        assert.strictEqual(res.body[0].title, "A todo");
        assert.strictEqual(res.body[1].title, "B todo");
        assert.strictEqual(res.body[2].title, "C todo");
      });

    await request(app)
      .get("/todos?sort=title&order=desc")
      .set("Authorization", `Bearer ${loginResponse.body.token}`)
      .expect((res) => {
        assert.strictEqual(res.body[0].title, "C todo");
        assert.strictEqual(res.body[1].title, "B todo");
        assert.strictEqual(res.body[2].title, "A todo");
      });
  });

  // TODO add created_at column to the todo_list table
  // test("by creation date", async () => {
  //   const loginResponse = await request(app)
  //     .post("/auth/login")
  //     .send({ username: "user1", password: "password1" });

  //   await request(app)
  //     .post("/todos")
  //     .set("Authorization", `Bearer ${loginResponse.body.token}`)
  //     .send({ title: "First todo" });
  //   await request(app)
  //     .post("/todos")
  //     .set("Authorization", `Bearer ${loginResponse.body.token}`)
  //     .send({ title: "Second todo" });

  //   await request(app)
  //     .get("/todos?sort=created_at")
  //     .set("Authorization", `Bearer ${loginResponse.body.token}`)
  //     .expect([{ title: "First todo" }, { title: "Second todo" }]);

  //   await request(app)
  //     .get("/todos?sort=created_at&order=desc")
  //     .set("Authorization", `Bearer ${loginResponse.body.token}`)
  //     .expect([{ title: "Second todo" }, { title: "First todo" }]);
  // });

  test("by completion status", async () => {
    const loginResponse = await request(app)
      .post("/auth/login")
      .send({ username: "user1", password: "password1" });

    await request(app)
      .post("/todos")
      .set("Authorization", `Bearer ${loginResponse.body.token}`)
      .send({ title: "Incomplete todo" });
    await request(app)
      .post("/todos")
      .set("Authorization", `Bearer ${loginResponse.body.token}`)
      .send({ title: "Completed todo", done: true });

    await request(app)
      .get("/todos?sort=completed")
      .set("Authorization", `Bearer ${loginResponse.body.token}`)
      .expect(res => {
        assert.strictEqual(res.body[0].title, "Incomplete todo");
        assert.strictEqual(res.body[1].title, "Completed todo");
      });

    await request(app)
      .get("/todos?sort=completed&order=desc")
      .set("Authorization", `Bearer ${loginResponse.body.token}`)
      .expect(res => {
        assert.strictEqual(res.body[0].title, "Completed todo");
        assert.strictEqual(res.body[1].title, "Incomplete todo");
      });
  });
});
