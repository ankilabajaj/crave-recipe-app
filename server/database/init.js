import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
export function openDatabase(
  path = process.env.DATABASE_PATH || "./server/database/crave.sqlite",
) {
  if (path !== ":memory:")
    mkdirSync(dirname(resolve(path)), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
  db.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
  return db;
}
if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  const db = openDatabase();
  db.close();
  console.log("Database initialized.");
}
