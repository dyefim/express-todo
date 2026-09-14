const path = require("node:path");
const { after, afterEach, before, describe, test } = require("node:test");
const request = require("supertest");
const assert = require("node:assert/strict");

const app = require("../app");
const db = require("../db");

const createdUsers = [];
let userCounter = 0;

const createUser = async (username, password = "password1") => {
  const response = await request(app)
    .post("/auth/sign-up")
    .send({ username, password })
    .expect(201);

  const user = {
    username,
    password,
    id: response.body.user.id,
  };

  createdUsers.push(user);
  return user;
};

after(async () => {
  const userIds = createdUsers.map((user) => user.id);
  if (userIds.length > 0) {
    await db.none("DELETE FROM users WHERE id = ANY($1::int[])", [userIds]);
  }
  await db.$pool.end();
});

describe("todos are protected", () => {
  let userA;
  let userB;

  before(async () => {
    const suffix = ++userCounter;
    userA = await createUser(`protected_userA_${suffix}`, "password1");
    userB = await createUser(`protected_userB_${suffix}`, "password2");
  });

  test("user 1 can see their todos", async () => {
    const loginResponse = await request(app)
      .post("/auth/login")
      .send({ username: userA.username, password: userA.password });
    await request(app)
      .get("/todos")
      .set("Authorization", `Bearer ${loginResponse.body.token}`)
      .expect(200, []);
  });

  test("user 2 can see their todos", async () => {
    const loginResponse = await request(app)
      .post("/auth/login")
      .send({ username: userB.username, password: userB.password });
    await request(app)
      .get("/todos")
      .set("Authorization", `Bearer ${loginResponse.body.token}`)
      .expect(200, []);
  });

  test("user 1 cannot see user 2's todos", async () => {
    const userALogin = await request(app)
      .post("/auth/login")
      .send({ username: userA.username, password: userA.password });

    const userBLogin = await request(app)
      .post("/auth/login")
      .send({ username: userB.username, password: userB.password });

    const todoResponse = await request(app)
      .post("/todos")
      .set("Authorization", `Bearer ${userBLogin.body.token}`)
      .send({ title: "User 2 todo" })
      .expect(201);

    await request(app)
      .get(`/todos/${todoResponse.body.id}`)
      .set("Authorization", `Bearer ${userALogin.body.token}`)
      .expect(404);
  });
});

describe("todos can be sorted", () => {
  let user;

  before(async () => {
    user = await createUser(`sorting_user_${++userCounter}`);
  });

  afterEach(async () => {
    await db.none("DELETE FROM todo_list WHERE created_by = $1", [user.id]);
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

  test("by creation date", async () => {
    const loginResponse = await request(app)
      .post("/auth/login")
      .send({ username: user.username, password: user.password });

    await request(app)
      .post("/todos")
      .set("Authorization", `Bearer ${loginResponse.body.token}`)
      .send({ title: "First todo" });
    await request(app)
      .post("/todos")
      .set("Authorization", `Bearer ${loginResponse.body.token}`)
      .send({ title: "Second todo" });

    await request(app)
      .get("/todos?sort=created_at")
      .set("Authorization", `Bearer ${loginResponse.body.token}`)
      .expect((res) => {
        const firstIndex = res.body.findIndex(
          (todo) => todo.title === "First todo",
        );
        const secondIndex = res.body.findIndex(
          (todo) => todo.title === "Second todo",
        );

        assert.strictEqual(res.body[firstIndex].title, "First todo");
        assert.strictEqual(res.body[secondIndex].title, "Second todo");
      });

    await request(app)
      .get("/todos?sort=created_at&order=desc")
      .set("Authorization", `Bearer ${loginResponse.body.token}`)
      .expect((res) => {
        const firstIndex = res.body.findIndex(
          (todo) => todo.title === "First todo",
        );
        const secondIndex = res.body.findIndex(
          (todo) => todo.title === "Second todo",
        );

        assert.strictEqual(res.body[firstIndex].title, "First todo");
        assert.strictEqual(res.body[secondIndex].title, "Second todo");
      });
  });

  test("by completion status", async () => {
    const loginResponse = await request(app)
      .post("/auth/login")
      .send({ username: user.username, password: user.password });

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
      .expect((res) => {
        assert.strictEqual(res.body[0].title, "Incomplete todo");
        assert.strictEqual(res.body[1].title, "Completed todo");
      });

    await request(app)
      .get("/todos?sort=completed&order=desc")
      .set("Authorization", `Bearer ${loginResponse.body.token}`)
      .expect((res) => {
        assert.strictEqual(res.body[0].title, "Completed todo");
        assert.strictEqual(res.body[1].title, "Incomplete todo");
      });
  });
});
