const { after, before, describe, test } = require("node:test");
const request = require("supertest");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

const app = require("../app");
const db = require("../db");

const tokenHeaderKey = process.env.TOKEN_HEADER_KEY;
const jwtSecretKey = process.env.JWT_SECRET_KEY;

const mintAccessToken = (userId) =>
  jwt.sign({ data: { id: userId } }, jwtSecretKey, {
    expiresIn: "5m",
  });

const asUser = async (user) => {
  const authorization = `Bearer ${user.token}`;

  return {
    get: (url) => request(app).get(url).set(tokenHeaderKey, authorization),
    post: (url) => request(app).post(url).set(tokenHeaderKey, authorization),
  };
};

const createdUsers = [];
const createdTodoIds = [];
const createdCategoryIds = [];

const createUser = async (username, password = "pa55w0rd") => {
  const user = await db.one(
    "INSERT INTO users(username, password_hash) VALUES($1, $2) RETURNING id;",
    [username, password],
  );

  user.token = mintAccessToken(user.id);

  createdUsers.push(user);

  return user;
};

const createCategory = async (user, categoryName) => {
  const userRequest = await asUser(user);
  const category = await userRequest
    .post("/categories")
    .send({ name: categoryName })
    .expect(201);

  createdCategoryIds.push(category.body.id);

  return category;
};

after(async () => {
  await db.none("DELETE FROM users WHERE id = ANY($1::int[])", [
    createdUsers.map((user) => user.id),
  ]);
  await db.none("DELETE FROM todo_categories WHERE id = ANY($1::int[])", [
    createdCategoryIds,
  ]);
  await db.none("DELETE FROM todo_list WHERE id = ANY($1::int[])", [
    createdTodoIds,
  ]);
  await db.$pool.end();
});

describe("categories are protected", () => {
  let userA;
  let userB;

  before(async () => {
    userA = await createUser("UserA_categories_test_protected");
    userB = await createUser("UserB_categories_test_protected");
  });

  test("user 1 can see their categories", async () => {
    const userARequest = await asUser(userA);

    await createCategory(userA, "Groceries");

    const categoriesResponse = await userARequest
      .get("/categories")
      .expect(200);
    assert.equal(categoriesResponse.body.data[0].name, "Groceries");
  });

  test("user 2 can see their categories", async () => {
    const userBRequest = await asUser(userB);

    await createCategory(userB, "Chores");

    const categoriesResponse = await userBRequest
      .get("/categories")
      .expect(200);
    assert.equal(categoriesResponse.body.data[0].name, "Chores");
  });

  test("user 1 cannot see user 2's categories", async () => {
    const userARequest = await asUser(userA);
    const userBRequest = await asUser(userB);

    const categoryResponse = await createCategory(userB, "School");

    await userARequest
      .get(`/categories/${categoryResponse.body.id}`)
      .expect(404);
  });
});

describe("categories can be assigned to todo items", () => {
  let userC;
  let categoryIds = [];

  before(async () => {
    userC = await createUser("User_categories_test_assignment");
    const userRequest = await asUser(userC);

    await Promise.all(
      ["Work", "Urgent", "Documents", "Marketing"].map(async (name) => {
        const categoryResponse = await createCategory(userC, name);

        categoryIds.push(categoryResponse.body.id);
      }),
    );
  });

  test("user can assign a category to a todo item", async () => {
    const userRequest = await asUser(userC);
    const todoResponse1 = await userRequest
      .post("/todos")
      .send({ title: "Finish report", categories: categoryIds.slice(0, 2) })
      .expect(201);

    const todoResponse2 = await userRequest
      .post("/todos")
      .send({
        title: "Prepare presentation",
        categories: categoryIds.slice(2, 4),
      })
      .expect(201);

    createdTodoIds.push(todoResponse1.body.id, todoResponse2.body.id);

    const todoItemResponse1 = await userRequest.get(
      `/todos/${todoResponse1.body.id}`,
    );
    assert.notStrictEqual(
      todoItemResponse1.body.categories,
      categoryIds.slice(0, 2),
    );

    const todoItemResponse2 = await userRequest.get(
      `/todos/${todoResponse2.body.id}`,
    );
    assert.notStrictEqual(
      todoItemResponse2.body.categories,
      categoryIds.slice(2, 4),
    );
  });
});
