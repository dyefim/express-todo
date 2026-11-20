const { after, afterEach, before, describe, test } = require("node:test");
const request = require("supertest");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

const app = require("../app");
const { db: prismaDb } = require("../prisma/db");
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
    patch: (url) => request(app).patch(url).set(tokenHeaderKey, authorization),
    delete: (url) =>
      request(app).delete(url).set(tokenHeaderKey, authorization),
  };
};

const createdUsers = [];

const createUser = async (username, password = "pa55w0rd") => {
  const user = await prismaDb.orm.public.Users.create({
    username,
    passwordHash: password,
  });

  user.token = mintAccessToken(user.id);

  createdUsers.push(user);

  return user;
};

after(async () => {
  await prismaDb.orm.public.Users.where((u) =>
    u.id.in(createdUsers.map((user) => user.id)),
  ).deleteAndCount();
  await prismaDb.close();
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

    const user2TodoResponse = await userBRequest
      .post("/todos")
      .send({ title: "User 2 todo" })
      .expect(201);

    const user2TodoByIdRoute = `/todos/${user2TodoResponse.body.id}`;

    await userARequest.get(user2TodoByIdRoute).expect(404);
    await userBRequest.get(user2TodoByIdRoute).expect(200);
  });
});

describe("todos can be updated", () => {
  let userA;

  before(async () => {
    userA = await createUser("UserA_todos_test_updated");
  });

  afterEach(async () => {
    await prismaDb.orm.public.Tasks.where({
      createdBy: userA.id,
    }).deleteAndCount();
  });

  test("by title", async () => {
    const userRequest = await asUser(userA);

    const createResponse = await userRequest
      .post("/todos")
      .send({ title: "Old title" });
    const todoId = createResponse.body.id;

    await userRequest
      .patch(`/todos/${todoId}`)
      .send({ title: "New title" })
      .expect(200);

    const getResponse = await userRequest.get(`/todos/${todoId}`).expect(200);
    assert.strictEqual(getResponse.body.title, "New title");
  });
});

describe("todos can be sorted", () => {
  let userA;

  before(async () => {
    userA = await createUser("UserA_todos_test_sorted");
  });

  afterEach(async () => {
    await prismaDb.orm.public.Tasks.where({
      createdBy: userA.id,
    }).deleteAndCount();
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
});

describe("todos can be searched", () => {
  let userA;
  let userB;

  before(async () => {
    userA = await createUser("UserA_todos_test_searched");
    userB = await createUser("UserB_todos_test_searched");
  });

  afterEach(async () => {
    await prismaDb.orm.public.Tasks.where((t) =>
      t.createdBy.in([userA.id, userB.id]),
    ).deleteAndCount();
  });

  const searchTitles = async (user, query) => {
    const userRequest = await asUser(user);
    const res = await userRequest
      .get(`/todos?search=${encodeURIComponent(query)}`)
      .expect(200);

    return res.body.data.map((todo) => todo.title);
  };

  test("by title", async () => {
    const userRequest = await asUser(userA);

    await userRequest.post("/todos").send({ title: "First todo" });
    await userRequest.post("/todos").send({ title: "Second todo" });

    await userRequest.get("/todos?search=First").expect((res) => {
      assert.strictEqual(res.body.data.length, 1);
      assert.strictEqual(res.body.data[0].title, "First todo");
    });
  });

  test("ignoring case", async () => {
    const userRequest = await asUser(userA);

    await userRequest.post("/todos").send({ title: "First todo" });

    assert.deepStrictEqual(await searchTitles(userA, "fIrSt"), ["First todo"]);
  });

  test("matches any word of the title", async () => {
    const userRequest = await asUser(userA);

    await userRequest.post("/todos").send({ title: "Buy fresh milk" });

    assert.deepStrictEqual(await searchTitles(userA, "milk"), [
      "Buy fresh milk",
    ]);
    assert.deepStrictEqual(await searchTitles(userA, "fresh"), [
      "Buy fresh milk",
    ]);
  });

  test("requires every word of the query", async () => {
    const userRequest = await asUser(userA);

    await userRequest.post("/todos").send({ title: "Buy milk" });
    await userRequest.post("/todos").send({ title: "Buy bread" });

    assert.deepStrictEqual(await searchTitles(userA, "buy milk"), ["Buy milk"]);
  });

  test("matches other forms of a word (stemming)", async () => {
    const userRequest = await asUser(userA);

    await userRequest.post("/todos").send({ title: "Go running" });

    assert.deepStrictEqual(await searchTitles(userA, "runs"), ["Go running"]);
  });

  test("excludes words with a leading minus", async () => {
    const userRequest = await asUser(userA);

    await userRequest.post("/todos").send({ title: "Buy milk" });
    await userRequest.post("/todos").send({ title: "Buy bread" });

    assert.deepStrictEqual(await searchTitles(userA, "buy -milk"), [
      "Buy bread",
    ]);
  });

  test("returns nothing when there is no match", async () => {
    const userRequest = await asUser(userA);

    await userRequest.post("/todos").send({ title: "First todo" });

    await userRequest.get("/todos?search=nonexistent").expect((res) => {
      assert.deepStrictEqual(res.body.data, []);
      assert.strictEqual(res.body.page.totalElements, 0);
    });
  });

  test("returns every todo for an empty search", async () => {
    const userRequest = await asUser(userA);

    await userRequest.post("/todos").send({ title: "First todo" });
    await userRequest.post("/todos").send({ title: "Second todo" });

    await userRequest.get("/todos?search=").expect((res) => {
      assert.strictEqual(res.body.data.length, 2);
    });
  });

  test("treats SQL wildcards and operators as plain text", async () => {
    const userRequest = await asUser(userA);

    await userRequest.post("/todos").send({ title: "First todo" });

    for (const query of ["%", "_", "&", "|", "!", ":*", "'", "((", "a:b"]) {
      assert.deepStrictEqual(await searchTitles(userA, query), [], query);
    }
  });

  test("only returns the current user's todos", async () => {
    const requestA = await asUser(userA);
    const requestB = await asUser(userB);

    await requestA.post("/todos").send({ title: "Shared title" });
    await requestB.post("/todos").send({ title: "Shared title" });

    const res = await requestA.get("/todos?search=shared").expect(200);

    assert.strictEqual(res.body.data.length, 1);
    assert.strictEqual(res.body.data[0].createdBy, userA.id);
  });

  test("does not return soft deleted todos", async () => {
    const userRequest = await asUser(userA);

    const { body } = await userRequest
      .post("/todos")
      .send({ title: "Deleted todo" });
    await userRequest.delete(`/todos/${body.id}`).expect(204);

    assert.deepStrictEqual(await searchTitles(userA, "deleted"), []);
  });

  test("is combined with sorting", async () => {
    const userRequest = await asUser(userA);

    await userRequest.post("/todos").send({ title: "B match" });
    await userRequest.post("/todos").send({ title: "A match" });
    await userRequest.post("/todos").send({ title: "Other" });

    const res = await userRequest
      .get("/todos?search=match&sort=title&order=desc")
      .expect(200);

    assert.deepStrictEqual(
      res.body.data.map((todo) => todo.title),
      ["B match", "A match"],
    );
  });

  test("is combined with pagination", async () => {
    const userRequest = await asUser(userA);

    for (let i = 1; i <= 7; i++) {
      await userRequest.post("/todos").send({ title: `Match ${i}` });
    }
    await userRequest.post("/todos").send({ title: "Other" });

    const res = await userRequest
      .get("/todos?search=match&size=5&page=2")
      .expect(200);

    assert.strictEqual(res.body.data.length, 2);
    assert.strictEqual(res.body.page.totalElements, 7);
    assert.strictEqual(res.body.page.totalPages, 2);
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

    const userRequest = await asUser(userA);

    // Create a todo
    const createResponse = await userRequest
      .post("/todos")
      .send({ title: "Todo to be deleted" });
    todoId = createResponse.body.id;
  });

  after(async () => {
    await prismaDb.orm.public.Tasks.where({ id: todoId }).deleteAndCount();
  });

  test("another user cannot delete the todo", async () => {
    const userB = await createUser("UserB_todos_test_soft_deleted");
    const userBRequest = await asUser(userB);
    await userBRequest.delete(`/todos/${todoId}`).expect(404);
  });

  test("soft delete a todo", async () => {
    const userRequest = await asUser(userA);

    // Soft delete the todo
    await userRequest.delete(`/todos/${todoId}`).expect(204);

    // Verify the todo is not returned in the list
    await userRequest.get("/todos").expect((res) => {
      assert.notStrictEqual(res.body.data, []);
    });

    // Verify the todo still exists in the database with a deleted flag
    const dbResult = await prismaDb.orm.public.Tasks.where({
      id: todoId,
    }).first();
    assert.strictEqual(dbResult.isDeleted, true);
  });

  test("deleted todo is not accessible by ID", async () => {
    const userRequest = await asUser(userA);
    await userRequest.get(`/todos/${todoId}`).expect(404);
  });

  test("deleted todo is not returned in the list", async () => {
    const userRequest = await asUser(userA);
    const response = await userRequest.get("/todos");
    const todoIds = response.body.data.map((todo) => todo.id);
    assert.strictEqual(todoIds.includes(todoId), false);
  });
});
