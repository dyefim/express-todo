const { after, afterEach, before, describe, test } = require("node:test");
const request = require("supertest");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

const app = require("../app");
const db = require("../config/db");
const { jwtSecretKey, tokenHeaderKey } = require("../config/env");

const mintAccessToken = (userId) =>
  jwt.sign({ data: { id: userId } }, jwtSecretKey, {
    expiresIn: "5m",
  });

const asUser = async (user) => {
  const authorization = `Bearer ${user.token}`;

  return {
    get: (url) => request(app).get(url).set(tokenHeaderKey, authorization),
    post: (url) => request(app).post(url).set(tokenHeaderKey, authorization),
    delete: (url) =>
      request(app).delete(url).set(tokenHeaderKey, authorization),
  };
};

const createdUsers = [];

const createUser = async (username, password = "pa55w0rd") => {
  const user = await db.one(
    "INSERT INTO users(username, password_hash) VALUES($1, $2) RETURNING id;",
    [username, password],
  );

  user.token = mintAccessToken(user.id);

  createdUsers.push(user);

  return user;
};

after(async () => {
  await db.none("DELETE FROM users WHERE id = ANY($1::int[])", [
    createdUsers.map((user) => user.id),
  ]);
  await db.$pool.end();
});

describe("todos are protected", () => {
  let userA;
  let userB;

  before(async () => {
    userA = await createUser("UserA_todos_test_protected");
    userB = await createUser("UserB_todos_test_protected");
  });

  test("user 1 can see their todos", async () => {
    const userARequest = await asUser(userA);

    await userARequest.get("/todos").expect(200);
  });

  test("user 2 can see their todos", async () => {
    const userBRequest = await asUser(userB);

    await userBRequest.get("/todos").expect(200);
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
  let userA;

  before(async () => {
    userA = await createUser("UserA_todos_test_sorted");
  });

  afterEach(async () => {
    await db.none("DELETE FROM tasks WHERE created_by = $1", [userA.id]);
  });

  test("by title", async () => {
    const userRequest = await asUser(userA);

    await userRequest.post("/todos").send({ title: "A todo" });
    await userRequest.post("/todos").send({ title: "C todo" });
    await userRequest.post("/todos").send({ title: "B todo" });

    await userRequest.get("/todos?sort=title").expect((res) => {
      assert.strictEqual(res.body.data[0].title, "A todo");
      assert.strictEqual(res.body.data[1].title, "B todo");
      assert.strictEqual(res.body.data[2].title, "C todo");
    });

    await userRequest.get("/todos?sort=title&order=desc").expect((res) => {
      assert.strictEqual(res.body.data[0].title, "C todo");
      assert.strictEqual(res.body.data[1].title, "B todo");
      assert.strictEqual(res.body.data[2].title, "A todo");
    });
  });

  test("by creation date", async () => {
    const userRequest = await asUser(userA);

    await userRequest.post("/todos").send({ title: "First todo" });
    await userRequest.post("/todos").send({ title: "Second todo" });

    await userRequest.get("/todos?sort=created_at").expect((res) => {
      const firstIndex = res.body.data.findIndex(
        (todo) => todo.title === "First todo",
      );
      const secondIndex = res.body.data.findIndex(
        (todo) => todo.title === "Second todo",
      );

      assert.strictEqual(res.body.data[firstIndex].title, "First todo");
      assert.strictEqual(res.body.data[secondIndex].title, "Second todo");
    });

    await userRequest.get("/todos?sort=created_at&order=desc").expect((res) => {
      const firstIndex = res.body.data.findIndex(
        (todo) => todo.title === "First todo",
      );
      const secondIndex = res.body.data.findIndex(
        (todo) => todo.title === "Second todo",
      );

      assert.strictEqual(res.body.data[firstIndex].title, "First todo");
      assert.strictEqual(res.body.data[secondIndex].title, "Second todo");
    });
  });

  test("by completion status", async () => {
    const userRequest = await asUser(userA);

    await userRequest.post("/todos").send({ title: "Incomplete todo" });
    await userRequest
      .post("/todos")
      .send({ title: "Completed todo", done: true });

    await userRequest.get("/todos?sort=completed").expect((res) => {
      assert.strictEqual(res.body.data[0].title, "Incomplete todo");
      assert.strictEqual(res.body.data[1].title, "Completed todo");
    });

    await userRequest.get("/todos?sort=completed&order=desc").expect((res) => {
      assert.strictEqual(res.body.data[0].title, "Completed todo");
      assert.strictEqual(res.body.data[1].title, "Incomplete todo");
    });
  });
});

describe("todos can be searched", () => {
  let userA;

  before(async () => {
    userA = await createUser("UserA_todos_test_searched");
  });

  test("by title", async () => {
    const userRequest = await asUser(userA);

    await userRequest.post("/todos").send({ title: "First todo" });
    await userRequest.post("/todos").send({ title: "Second todo" });

    await userRequest.get("/todos?search=First").expect((res) => {
      assert.strictEqual(res.body.data.length, 1);
      assert.strictEqual(res.body.data[0].title, "First todo");
    });
  });
});

describe("todos are paginated", () => {
  let userA;

  before(async () => {
    userA = await createUser("UserA_todos_test_paginated");
  });

  test("returns the correct number of todos per page", async () => {
    const userRequest = await asUser(userA);

    // Create 15 todos
    for (let i = 1; i <= 15; i++) {
      await userRequest.post("/todos").send({ title: `Todo ${i}` });
    }

    // Request the first 5 todos
    await userRequest.get("/todos?size=5").expect((res) => {
      assert.strictEqual(res.body.data.length, 5);
      assert.strictEqual(res.body.page.number, 0); // zero based pagination
      assert.strictEqual(res.body.data[0].title, "Todo 1");
      assert.strictEqual(res.body.data[4].title, "Todo 5");
    });

    // Request the second page with 10 todos per page
    await userRequest.get("/todos?page=2").expect((res) => {
      assert.strictEqual(res.body.data.length, 5);
      assert.strictEqual(res.body.page.number, 1); // zero based pagination
      assert.strictEqual(res.body.data[0].title, "Todo 11");
      assert.strictEqual(res.body.data[4].title, "Todo 15");
    });

    // Request the third page, which should be empty
    await userRequest.get("/todos?page=3").expect((res) => {
      assert.strictEqual(res.body.data.length, 0);
      assert.strictEqual(res.body.page.number, 2); // zero based pagination
      assert.strictEqual(res.body.page.totalElements, 15);
    });
  });
});

describe("todos are soft deleted", () => {
  let userA;
  let todoId;

  before(async () => {
    userA = await createUser("UserA_todos_test_soft_deleted");
  });

  after(async () => {
    await db.none("DELETE FROM tasks WHERE id = $1", [todoId]);
  });

  test("soft delete a todo", async () => {
    const userRequest = await asUser(userA);

    // Create a todo
    const createResponse = await userRequest
      .post("/todos")
      .send({ title: "Todo to be deleted" });
    todoId = createResponse.body.id;

    // Soft delete the todo
    await userRequest.delete(`/todos/${todoId}`).expect(204);

    // Verify the todo is not returned in the list
    await userRequest.get("/todos").expect((res) => {
      assert.notStrictEqual(res.body.data, []);
    });

    // Verify the todo still exists in the database with a deleted flag
    const dbResult = await db.one(
      "SELECT is_deleted FROM tasks WHERE id = $1",
      [todoId],
    );
    assert.strictEqual(dbResult.is_deleted, true);
  });
});
