const { after, before, describe, test } = require("node:test");
const request = require("supertest");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

const app = require("../app");
const db = require("../config/db");
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
const createdTodoIds = [];
const createdCategoryIds = [];

const createUser = async (username, password = "pa55w0rd") => {
  const user = await db.one(
    "INSERT INTO users(username, password_hash) VALUES($1, $2) RETURNING id;",
    [username, password],
  );

  user.token = mintAccessToken(user.id);

  createdUsers.push(user.id);

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
  await db.none("DELETE FROM users WHERE id = ANY($1::int[])", [createdUsers]);
  await db.none("DELETE FROM categories WHERE id = ANY($1::int[])", [
    createdCategoryIds,
  ]);
  await db.none("DELETE FROM tasks WHERE id = ANY($1::int[])", [
    createdTodoIds,
  ]);
  await db.$pool.end();
  await prismaDb.close();
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

    const category = await createCategory(userB, "Chores");

    const categoriesResponse = await userBRequest
      .get("/categories")
      .expect(200);
    assert.equal(categoriesResponse.body.data[0].name, "Chores");

    const categoryResponse = await userBRequest
      .get(`/categories/${category.body.id}`)
      .expect(200);
    assert.equal(categoryResponse.body.name, "Chores");
  });

  test("user 1 cannot see user 2's categories", async () => {
    const userARequest = await asUser(userA);

    const categoryResponse = await createCategory(userB, "School");

    await userARequest
      .get(`/categories/${categoryResponse.body.id}`)
      .expect(404);
  });
});

describe("categories can be assigned to todo items", () => {
  let userC;
  const categoryIds = [];

  before(async () => {
    userC = await createUser("User_categories_test_assignment");

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

describe("category can be updated", () => {
  let userG;
  let categoryToUpdate;

  before(async () => {
    userG = await createUser("UserG_categories_test_update");
    categoryToUpdate = await createCategory(userG, "Initial");
  });

  test("user can update a category", async () => {
    const userRequest = await asUser(userG);

    const updatedCategoryResponse = await userRequest
      .patch(`/categories/${categoryToUpdate.body.id}`)
      .send({ name: "Updated" })
      .expect(200);

    assert.equal(updatedCategoryResponse.body.name, "Updated");
  });

  test("another user cannot update the category", async () => {
    const userH = await createUser("UserH_categories_test_update");
    const userRequest = await asUser(userH);

    await userRequest
      .patch(`/categories/${categoryToUpdate.body.id}`)
      .send({ name: "Malicious Update" })
      .expect(404);
  });
});

describe("categories can be deleted", () => {
  let userD;
  let categoryToDelete;

  before(async () => {
    userD = await createUser("User_categories_test_deletion");
    categoryToDelete = await createCategory(userD, "Temporary");
  });

  test("another user cannot delete the category", async () => {
    const userE = await createUser("UserE_categories_test_deletion");
    const userRequest = await asUser(userE);

    await userRequest
      .delete(`/categories/${categoryToDelete.body.id}`)
      .expect(404);
  });

  test("user can delete a category", async () => {
    const userRequest = await asUser(userD);

    await userRequest
      .delete(`/categories/${categoryToDelete.body.id}`)
      .expect(204);

    await userRequest
      .get(`/categories/${categoryToDelete.body.id}`)
      .expect(404);
  });
});
