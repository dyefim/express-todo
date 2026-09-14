const { after, afterEach, before, describe, test } = require("node:test");
const request = require("supertest");
const assert = require("node:assert/strict");

const app = require("../app");
const db = require("../db");

const tokenHeaderKey = process.env.TOKEN_HEADER_KEY;

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

const asUser = async (user) => {
  const response = await request(app)
    .post("/auth/login")
    .send({ username: user.username, password: user.password })
    .expect(200);
  const authorization = `Bearer ${response.body.token}`;

  return {
    get: (url) => request(app).get(url).set(tokenHeaderKey, authorization),
    post: (url) => request(app).post(url).set(tokenHeaderKey, authorization),
  };
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
    const userARequest = await asUser(userA);

    await userARequest.get("/todos").expect(200, []);
  });

  test("user 2 can see their todos", async () => {
    const userBRequest = await asUser(userB);

    await userBRequest.get("/todos").expect(200, []);
  });

  test("user 1 cannot see user 2's todos", async () => {
    const userARequest = await asUser(userA);
    const userBRequest = await asUser(userB);

    const todoResponse = await userBRequest
      .post("/todos")
      .send({ title: "User 2 todo" })
      .expect(201);

    await userARequest.get(`/todos/${todoResponse.body.id}`).expect(404);
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
    const userRequest = await asUser(user);

    await userRequest.post("/todos").send({ title: "A todo" });
    await userRequest.post("/todos").send({ title: "C todo" });
    await userRequest.post("/todos").send({ title: "B todo" });

    await userRequest.get("/todos?sort=title").expect((res) => {
      assert.strictEqual(res.body[0].title, "A todo");
      assert.strictEqual(res.body[1].title, "B todo");
      assert.strictEqual(res.body[2].title, "C todo");
    });

    await userRequest.get("/todos?sort=title&order=desc").expect((res) => {
      assert.strictEqual(res.body[0].title, "C todo");
      assert.strictEqual(res.body[1].title, "B todo");
      assert.strictEqual(res.body[2].title, "A todo");
    });
  });

  test("by creation date", async () => {
    const userRequest = await asUser(user);

    await userRequest.post("/todos").send({ title: "First todo" });
    await userRequest.post("/todos").send({ title: "Second todo" });

    await userRequest.get("/todos?sort=created_at").expect((res) => {
      const firstIndex = res.body.findIndex(
        (todo) => todo.title === "First todo",
      );
      const secondIndex = res.body.findIndex(
        (todo) => todo.title === "Second todo",
      );

      assert.strictEqual(res.body[firstIndex].title, "First todo");
      assert.strictEqual(res.body[secondIndex].title, "Second todo");
    });

    await userRequest.get("/todos?sort=created_at&order=desc").expect((res) => {
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
    const userRequest = await asUser(user);

    await userRequest.post("/todos").send({ title: "Incomplete todo" });
    await userRequest
      .post("/todos")
      .send({ title: "Completed todo", done: true });

    await userRequest.get("/todos?sort=completed").expect((res) => {
      assert.strictEqual(res.body[0].title, "Incomplete todo");
      assert.strictEqual(res.body[1].title, "Completed todo");
    });

    await userRequest.get("/todos?sort=completed&order=desc").expect((res) => {
      assert.strictEqual(res.body[0].title, "Completed todo");
      assert.strictEqual(res.body[1].title, "Incomplete todo");
    });
  });
});
