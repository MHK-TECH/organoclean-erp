import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import BetterSqlite3 from "better-sqlite3";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import * as schema from "./schema";

/**
 * DB engine resolver:
 * - Local/dev: single-file SQLite via better-sqlite3 (LOCAL_DB path, default ./local.db)
 * - Cloudflare: D1 binding (env.DB) — detected when running in Workers.
 * Same drizzle API both ways: business code stays portable.
 */
export type Db = ReturnType<typeof drizzleSqlite<typeof schema>>;

let _db: Db | null = null;

export function getDb(): Db {
  if (_db) return _db;

  if (!process.env.LOCAL_DB) {
    process.env.LOCAL_DB = "./local.db";
  }

  // Cloudflare runtime would use: getCloudflareContext().env.DB → drizzleD1(env.DB, { schema })
  const sqlite = new BetterSqlite3(process.env.LOCAL_DB);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  _db = drizzleSqlite(sqlite, { schema });
  return _db;
}

export { schema };
