import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { createApp } from "./app.js";
import { openDatabase } from "./database/init.js";
import { normalizeMeal, recipeService } from "./services/recipes.js";
const raw = {
  idMeal: "52772",
  strMeal: "Teriyaki Chicken",
  strMealThumb:
    "https://www.themealdb.com/images/media/meals/wvpsxx1468256321.jpg",
  strCategory: "Chicken",
  strArea: "Japanese",
  strInstructions: "Prepare the chicken.\nCook thoroughly.",
  strIngredient1: " Chicken ",
  strMeasure1: "500 g",
  strIngredient2: " ",
  strIngredient20: "Salt",
  strMeasure20: "a pinch",
  strYoutube: "https://www.youtube.com/watch?v=example",
};
const fetcher = async (url) => ({
  ok: true,
  json: async () =>
    url.includes("categories.php")
      ? {
          categories: [
            { strCategory: "Chicken", strCategoryThumb: raw.strMealThumb },
          ],
        }
      : url.includes("empty")
        ? { meals: null }
        : { meals: [raw] },
});
const values = (email = "one@example.com") => ({
  name: "Recipe Tester",
  email,
  password: "testpassword123",
  confirmPassword: "testpassword123",
});
async function register(agent, email) {
  const response = await agent.post("/api/auth/register").send(values(email));
  assert.equal(response.status, 201);
  return response.body.csrf;
}
const mutation = (agent, method, path, csrf, body = {}) =>
  agent[method](path).set("X-CSRF-Token", csrf).send(body);
test("normalization strips empty ingredients, keeps measures and rejects unsafe video links", () => {
  const meal = normalizeMeal(raw);
  assert.equal(meal.name, "Teriyaki Chicken");
  assert.deepEqual(meal.ingredients, [
    { name: "Chicken", measure: "500 g" },
    { name: "Salt", measure: "a pinch" },
  ]);
  assert.equal(
    normalizeMeal({ ...raw, strYoutube: "javascript:alert(1)" }).youtube,
    "",
  );
  assert.equal(
    normalizeMeal({ idMeal: "1", strMeal: "Short" }).instructions,
    "",
  );
});
test("registration, validation, duplicate account, hashed password, login, refresh and logout", async () => {
  const db = openDatabase(":memory:");
  const app = createApp({ db, fetcher });
  const agent = request.agent(app);
  assert.equal((await agent.get("/api/favorites")).status, 401);
  for (const patch of [
    { email: "invalid" },
    { name: "" },
    { password: "short", confirmPassword: "short" },
    { confirmPassword: "different" },
    { password: "x".repeat(73), confirmPassword: "x".repeat(73) },
  ])
    assert.equal(
      (await agent.post("/api/auth/register").send({ ...values(), ...patch }))
        .status,
      400,
    );
  const csrf = await register(agent);
  const user = db.prepare("SELECT * FROM users").get();
  assert.notEqual(user.password_hash, values().password);
  assert.match(user.password_hash, /^\$2/);
  assert.equal(
    (await agent.get("/api/auth/me")).body.user.email,
    "one@example.com",
  );
  assert.equal(
    (await mutation(agent, "post", "/api/auth/register", csrf, values()))
      .status,
    409,
  );
  assert.equal(
    (await mutation(agent, "post", "/api/auth/logout", csrf)).status,
    200,
  );
  assert.equal((await agent.get("/api/auth/me")).body.user, null);
  assert.equal((await agent.get("/api/planner")).status, 401);
  assert.equal(
    (
      await agent
        .post("/api/auth/login")
        .send({ email: "one@example.com", password: "wrongpassword" })
    ).status,
    401,
  );
  const login = await agent.post("/api/auth/login").send(values());
  assert.equal(login.status, 200);
  assert.match(login.headers["set-cookie"][0], /HttpOnly/);
  assert.match(login.headers["set-cookie"][0], /SameSite=Lax/);
  assert.equal((await agent.get("/api/auth/me")).body.csrf, login.body.csrf);
  db.close();
});
test("CSRF, origins, content types, session expiry and production cookies", async () => {
  const db = openDatabase(":memory:");
  const app = createApp({ db, fetcher });
  const agent = request.agent(app);
  const csrf = await register(agent);
  assert.equal(
    (await agent.post("/api/favorites").send({ mealId: "52772" })).status,
    403,
  );
  assert.equal(
    (
      await agent
        .post("/api/favorites")
        .set("X-CSRF-Token", "a".repeat(64))
        .send({ mealId: "52772" })
    ).status,
    403,
  );
  assert.equal(
    (
      await mutation(agent, "post", "/api/favorites", csrf, {
        mealId: "52772",
      }).set("Origin", "https://evil.example")
    ).status,
    403,
  );
  assert.equal(
    (await agent.post("/api/auth/login").type("form").send(values())).status,
    415,
  );
  assert.equal(
    (
      await agent
        .post("/api/auth/login")
        .set("Sec-Fetch-Site", "cross-site")
        .send(values())
    ).status,
    403,
  );
  db.prepare("UPDATE sessions SET expires=0").run();
  assert.equal((await agent.get("/api/favorites")).status, 401);
  const secure = await request(createApp({ db, fetcher, production: true }))
    .post("/api/auth/login")
    .send(values());
  assert.match(secure.headers["set-cookie"][0], /Secure/);
  db.close();
});
test("favorites and planner persist across app/database restarts, prevent duplicates and isolate users", async () => {
  const dir = mkdtempSync(join(tmpdir(), "crave-test-"));
  let db = openDatabase(join(dir, "test.sqlite"));
  try {
    let app = createApp({ db, fetcher });
    const one = request.agent(app),
      two = request.agent(app);
    const csrf = await register(one),
      csrf2 = await register(two, "two@example.com");
    assert.equal(
      (
        await mutation(one, "post", "/api/favorites", csrf, {
          mealId: "52772",
          userId: 2,
        })
      ).status,
      201,
    );
    await mutation(one, "post", "/api/favorites", csrf, { mealId: "52772" });
    assert.deepEqual((await one.get("/api/favorites")).body.ids, ["52772"]);
    assert.deepEqual((await two.get("/api/favorites")).body.ids, []);
    await mutation(two, "delete", "/api/favorites/52772", csrf2);
    assert.deepEqual((await one.get("/api/favorites")).body.ids, ["52772"]);
    assert.equal(
      (
        await mutation(one, "put", "/api/planner/Monday", csrf, {
          mealId: "52772",
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await mutation(one, "put", "/api/planner/Monday", csrf, {
          mealId: "52800",
        })
      ).status,
      200,
    );
    assert.deepEqual((await one.get("/api/planner")).body.plan, [
      { day: "Monday", mealId: "52800" },
    ]);
    assert.deepEqual((await two.get("/api/planner")).body.plan, []);
    await mutation(two, "delete", "/api/planner/Monday", csrf2);
    assert.equal((await one.get("/api/planner")).body.plan.length, 1);
    assert.equal(
      (
        await mutation(one, "put", "/api/planner/Funday", csrf, {
          mealId: "52772",
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await mutation(one, "post", "/api/favorites", csrf, {
          mealId: "1';DROP TABLE users;",
        })
      ).status,
      400,
    );
    // Reopen the same file and log in again, proving durable rows, not process state.
    db.close();
    db = openDatabase(join(dir, "test.sqlite"));
    app = createApp({ db, fetcher });
    const again = request.agent(app);
    const login = await again.post("/api/auth/login").send(values());
    const next = login.body.csrf;
    assert.deepEqual((await again.get("/api/favorites")).body.ids, ["52772"]);
    assert.equal(
      (await again.get("/api/planner")).body.plan[0].mealId,
      "52800",
    );
    await mutation(again, "delete", "/api/favorites/52772", next);
    await mutation(again, "delete", "/api/planner/Monday", next);
    assert.deepEqual((await again.get("/api/favorites")).body.ids, []);
    assert.deepEqual((await again.get("/api/planner")).body.plan, []);
    assert.equal(db.prepare("PRAGMA foreign_keys").get().foreign_keys, 1);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("real proxy routes handle search, empty results, categories, filters, random, details and validation", async () => {
  const db = openDatabase(":memory:");
  const agent = request.agent(createApp({ db, fetcher }));
  await register(agent);
  assert.equal(
    (await agent.get("/api/recipes/search?q=chicken")).body.meals[0].id,
    "52772",
  );
  assert.deepEqual(
    (await agent.get("/api/recipes/search?q=empty")).body.meals,
    [],
  );
  assert.equal(
    (await agent.get("/api/recipes/categories")).body.categories[0].name,
    "Chicken",
  );
  for (const route of [
    "filter?category=Chicken",
    "filter?ingredient=chicken_breast",
    "random",
    "52772",
  ])
    assert.equal((await agent.get(`/api/recipes/${route}`)).status, 200);
  for (const route of [
    "search",
    "filter",
    "filter?category=Chicken&ingredient=Salt",
    "not-an-id",
    "search?q=" + "a".repeat(101),
  ])
    assert.equal((await agent.get(`/api/recipes/${route}`)).status, 400);
  db.close();
});
test("upstream failure returns safe 502 and missing recipe returns 404", async () => {
  for (const [fetcher, status] of [
    [
      async () => {
        throw Error("sensitive internal failure");
      },
      502,
    ],
    [async () => ({ ok: false }), 502],
    [async () => ({ ok: true, json: async () => ({ meals: null }) }), 404],
  ]) {
    const db = openDatabase(":memory:");
    const agent = request.agent(createApp({ db, fetcher }));
    await register(agent);
    const r = await agent.get("/api/recipes/52772");
    assert.equal(r.status, status);
    assert.equal(r.body.stack, undefined);
    assert.ok(!JSON.stringify(r.body).includes("sensitive"));
    db.close();
  }
});
test("successful API responses are cached; random recipes are not", async () => {
  let count = 0;
  const service = recipeService(async () => {
    count++;
    return { ok: true, json: async () => ({ meals: [raw] }) };
  });
  await service.lookup("52772");
  await service.lookup("52772");
  assert.equal(count, 1);
  await service.request("random.php");
  await service.request("random.php");
  assert.equal(count, 3);
});
