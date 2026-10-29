// Uses real TheMealDB with a temporary in-memory account/database.
// No sample recipes, persistent account, or local user data are created.
import assert from "node:assert/strict";
import request from "supertest";
import { EnvHttpProxyAgent, setGlobalDispatcher } from "undici";
import { createApp } from "../server/app.js";
import { openDatabase } from "../server/database/init.js";
if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY)
  setGlobalDispatcher(new EnvHttpProxyAgent());
const db = openDatabase(":memory:");
try {
  const agent = request.agent(createApp({ db, production: false }));
  const registered = await agent
    .post("/api/auth/register")
    .send({
      name: "Live Smoke Check",
      email: "live-smoke@example.com",
      password: "temporary-smoke-password",
      confirmPassword: "temporary-smoke-password",
    });
  assert.equal(registered.status, 201);
  const csrf = registered.body.csrf;
  for (const path of [
    "categories",
    "search?q=chicken",
    "filter?category=Chicken",
    "filter?ingredient=chicken_breast",
    "random",
    "52772",
  ]) {
    const response = await agent.get(`/api/recipes/${path}`);
    assert.equal(
      response.status,
      200,
      `${path}: ${response.body.error || response.status}`,
    );
    const data = response.body;
    assert.ok(
      data.meal?.id || data.meals?.length || data.categories?.length,
      `${path}: expected recipe data`,
    );
    console.log(`PASS real API: ${path}`);
  }
  for (const [method, path] of [
    ["post", "/api/favorites"],
    ["put", "/api/planner/Monday"],
  ]) {
    const response = await agent[method](path)
      .set("X-CSRF-Token", csrf)
      .send({ mealId: "52772" });
    assert.ok(response.status === 200 || response.status === 201);
  }
  console.log(
    "PASS favorites/planner with real recipe lookup (temporary database)",
  );
} finally {
  db.close();
}
