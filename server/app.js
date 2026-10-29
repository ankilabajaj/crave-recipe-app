import express from "express";
import bcrypt from "bcryptjs";
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { resolve } from "node:path";
import { openDatabase } from "./database/init.js";
import {
  recipeService,
  normalizeMeal,
  validId,
  httpError,
} from "./services/recipes.js";
export const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const token = () => randomBytes(32).toString("hex");
const hash = (s) => createHash("sha256").update(s).digest("hex");
const emailValid = (e) =>
  typeof e === "string" &&
  e.length <= 254 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
export function createApp({
  db = openDatabase(),
  fetcher = fetch,
  production = process.env.NODE_ENV === "production",
  origin = process.env.APP_ORIGIN ||
    (production ? "http://localhost:3001" : "http://localhost:5173"),
} = {}) {
  const app = express();
  const recipes = recipeService(fetcher);
  app.disable("x-powered-by");
  app.use(express.json({ limit: "16kb" }));
  app.use((req, res, next) => {
    res.set({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Frame-Options": "DENY",
      "Content-Security-Policy":
        "default-src 'self'; img-src 'self' https://www.themealdb.com data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    });
    if (req.path.startsWith("/api")) res.set("Cache-Control", "no-store");
    next();
  });
  app.use("/api", (req, res, next) => {
    const cookie = req.headers.cookie
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("crave_session="))
      ?.slice(14);
    if (cookie && /^[a-f0-9]{64}$/.test(cookie))
      req.session = db
        .prepare(
          "SELECT s.*,u.name,u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.expires>?",
        )
        .get(hash(cookie), Date.now());
    next();
  });
  app.use("/api", (req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    // JSON-only requests plus no cross-origin CORS protect pre-login endpoints.
    if (!req.is("application/json"))
      return res.status(415).json({ error: "Use application/json." });
    if (req.headers.origin && req.headers.origin !== origin)
      return res.status(403).json({ error: "Request origin is not allowed." });
    if (req.headers["sec-fetch-site"] === "cross-site")
      return res.status(403).json({ error: "Cross-site request blocked." });
    if (req.session) {
      const supplied = req.headers["x-csrf-token"];
      if (
        typeof supplied !== "string" ||
        !/^[a-f0-9]{64}$/.test(supplied) ||
        !timingSafeEqual(Buffer.from(supplied), Buffer.from(req.session.csrf))
      )
        return res
          .status(403)
          .json({
            error: "Session security check failed. Refresh and try again.",
          });
    }
    next();
  });
  function auth(req, res, next) {
    if (!req.session)
      return res.status(401).json({ error: "Please log in to continue." });
    next();
  }
  function establish(req, res, user) {
    if (req.session)
      db.prepare("DELETE FROM sessions WHERE id=?").run(req.session.id);
    db.prepare("DELETE FROM sessions WHERE expires<=?").run(Date.now());
    const id = token(),
      csrf = token();
    db.prepare(
      "INSERT INTO sessions(id,user_id,csrf,expires) VALUES(?,?,?,?)",
    ).run(hash(id), user.id, csrf, Date.now() + 7 * 86400000);
    res.cookie("crave_session", id, {
      httpOnly: true,
      sameSite: "lax",
      secure: production,
      maxAge: 7 * 86400000,
      path: "/",
    });
    res.json({
      user: { id: user.id, name: user.name, email: user.email },
      csrf,
    });
  }
  const attempts = new Map();
  app.use("/api/auth", (req, res, next) => {
    if (req.method !== "POST" || req.path === "/logout") return next();
    const now = Date.now(),
      key = req.ip;
    for (const [k, v] of attempts) if (v.until < now) attempts.delete(k);
    if (attempts.size >= 10000 && !attempts.has(key))
      return res.status(429).json({ error: "Please try again later." });
    let a = attempts.get(key);
    if (!a) {
      a = { count: 0, until: now + 600000 };
      attempts.set(key, a);
    }
    if (++a.count > 30)
      return res
        .status(429)
        .json({ error: "Too many attempts. Please try again in ten minutes." });
    next();
  });
  app.post("/api/auth/register", async (req, res) => {
    const { name, email, password, confirmPassword } = req.body || {};
    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.trim().length > 80 ||
      !emailValid(email) ||
      typeof password !== "string" ||
      password.length < 8 ||
      Buffer.byteLength(password) > 72 ||
      password !== confirmPassword
    )
      throw httpError(
        400,
        "Enter a name, valid email, and matching passwords (at least 8 characters, at most 72 bytes).",
      );
    const normalized = email.toLowerCase();
    if (db.prepare("SELECT id FROM users WHERE email=?").get(normalized))
      throw httpError(409, "An account with this email already exists.");
    const passwordHash = await bcrypt.hash(password, 12);
    let result;
    try {
      result = db
        .prepare("INSERT INTO users(name,email,password_hash) VALUES(?,?,?)")
        .run(name.trim(), normalized, passwordHash);
    } catch (e) {
      if (String(e).includes("UNIQUE"))
        throw httpError(409, "An account with this email already exists.");
      throw e;
    }
    res.status(201);
    establish(req, res, {
      id: Number(result.lastInsertRowid),
      name: name.trim(),
      email: normalized,
    });
  });
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body || {};
    if (
      !emailValid(email) ||
      typeof password !== "string" ||
      Buffer.byteLength(password) > 72
    )
      throw httpError(400, "Enter a valid email and password.");
    const user = db
      .prepare("SELECT * FROM users WHERE email=?")
      .get(email.toLowerCase());
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      throw httpError(401, "Email or password is incorrect.");
    establish(req, res, user);
  });
  app.get("/api/auth/me", (req, res) =>
    res.json(
      req.session
        ? {
            user: {
              id: req.session.user_id,
              name: req.session.name,
              email: req.session.email,
            },
            csrf: req.session.csrf,
          }
        : { user: null, csrf: null },
    ),
  );
  app.post("/api/auth/logout", auth, (req, res) => {
    db.prepare("DELETE FROM sessions WHERE id=?").run(req.session.id);
    res.clearCookie("crave_session", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: production,
    });
    res.json({ ok: true });
  });
  app.use("/api/recipes", auth);
  app.get("/api/recipes/categories", async (req, res) => {
    const data = await recipes.request("categories.php");
    res.json({
      categories: (data.categories || []).map((c) => ({
        name: c.strCategory,
        image: c.strCategoryThumb,
      })),
    });
  });
  app.get("/api/recipes/search", async (req, res) => {
    if (typeof req.query.q !== "string" || req.query.q.length > 100)
      throw httpError(400, "Search must be at most 100 characters.");
    const data = await recipes.request(
      `search.php?s=${encodeURIComponent(req.query.q.trim())}`,
    );
    res.json({ meals: (data.meals || []).map(normalizeMeal) });
  });
  app.get("/api/recipes/filter", async (req, res) => {
    const { category, ingredient } = req.query;
    if (Boolean(category) === Boolean(ingredient))
      throw httpError(400, "Choose one category or one ingredient.");
    const value = category || ingredient;
    if (typeof value !== "string" || value.length > 100 || !value.trim())
      throw httpError(400, "Invalid filter.");
    const data = await recipes.request(
      `filter.php?${category ? "c" : "i"}=${encodeURIComponent(value.trim().replaceAll(" ", "_"))}`,
    );
    res.json({ meals: (data.meals || []).map(normalizeMeal) });
  });
  app.get("/api/recipes/random", async (req, res) => {
    const data = await recipes.request("random.php");
    if (!data.meals?.[0])
      throw httpError(502, "No random recipe available. Try again.");
    res.json({ meal: normalizeMeal(data.meals[0]) });
  });
  app.get("/api/recipes/:id", async (req, res) =>
    res.json({ meal: await recipes.lookup(req.params.id) }),
  );
  app.use("/api/favorites", auth);
  app.use("/api/planner", auth);
  app.get("/api/favorites", (req, res) => {
    const rows = db
      .prepare("SELECT meal_id FROM favorites WHERE user_id=? ORDER BY id DESC")
      .all(req.session.user_id);
    res.json({ ids: rows.map((r) => r.meal_id) });
  });
  app.post("/api/favorites", async (req, res) => {
    await recipes.lookup(req.body?.mealId);
    db.prepare(
      "INSERT OR IGNORE INTO favorites(user_id,meal_id) VALUES(?,?)",
    ).run(req.session.user_id, req.body.mealId);
    res.status(201).json({ ok: true });
  });
  app.delete("/api/favorites/:mealId", (req, res) => {
    if (!validId(req.params.mealId)) throw httpError(400, "Invalid recipe ID.");
    db.prepare("DELETE FROM favorites WHERE user_id=? AND meal_id=?").run(
      req.session.user_id,
      req.params.mealId,
    );
    res.json({ ok: true });
  });
  app.get("/api/planner", (req, res) =>
    res.json({
      plan: db
        .prepare(
          "SELECT day_of_week AS day,meal_id AS mealId FROM meal_plans WHERE user_id=?",
        )
        .all(req.session.user_id),
    }),
  );
  app.put("/api/planner/:day", async (req, res) => {
    if (!days.includes(req.params.day))
      throw httpError(400, "Invalid weekday.");
    await recipes.lookup(req.body?.mealId);
    db.prepare(
      "INSERT INTO meal_plans(user_id,day_of_week,meal_id) VALUES(?,?,?) ON CONFLICT(user_id,day_of_week) DO UPDATE SET meal_id=excluded.meal_id,updated_at=CURRENT_TIMESTAMP",
    ).run(req.session.user_id, req.params.day, req.body.mealId);
    res.json({ ok: true });
  });
  app.delete("/api/planner/:day", (req, res) => {
    if (!days.includes(req.params.day))
      throw httpError(400, "Invalid weekday.");
    db.prepare("DELETE FROM meal_plans WHERE user_id=? AND day_of_week=?").run(
      req.session.user_id,
      req.params.day,
    );
    res.json({ ok: true });
  });
  app.use("/api", (req, res) =>
    res.status(404).json({ error: "Endpoint not found." }),
  );
  if (production) {
    app.use(express.static(resolve("client/dist")));
    app.get("/{*path}", (req, res) =>
      res.sendFile(resolve("client/dist/index.html")),
    );
  }
  app.use((err, req, res, next) => {
    const status =
      Number.isInteger(err.status) && err.status >= 400 && err.status <= 599
        ? err.status
        : 500;
    res
      .status(status)
      .json({
        error:
          status === 502 || status < 500
            ? err.message
            : "Something went wrong. Please try again.",
      });
  });
  return app;
}
