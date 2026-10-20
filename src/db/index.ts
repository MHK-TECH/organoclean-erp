import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import BetterSqlite3 from "better-sqlite3";
import * as fs from "node:fs";
import * as path from "node:path";
import * as schema from "./schema";

/**
 * DB engine resolver:
 * - Local/dev: single-file SQLite via better-sqlite3 (LOCAL_DB path, default ./local.db)
 * - Cloudflare: D1 binding (env.DB) — detected when running in Workers.
 * Same drizzle API both ways: business code stays portable.
 */
export type Db = ReturnType<typeof drizzleSqlite<typeof schema>>;

let _db: Db | null = null;
let _migrated = false;

function runMigrations(sqlite: unknown): void {
  if (_migrated) return;
  _migrated = true;
  const conn = sqlite as import("better-sqlite3").Database;
  conn.exec("CREATE TABLE IF NOT EXISTS _migration_history (name TEXT PRIMARY KEY, applied_at INTEGER)");
  const applied = new Set(
    conn.prepare("SELECT name FROM _migration_history").all().map((r) => (r as { name: string }).name),
  );
  const dir = path.join(process.cwd(), "drizzle");
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
    for (const f of files) {
      if (applied.has(f)) continue;
      const sqlText = fs.readFileSync(path.join(dir, f), "utf8");
      const stmts = sqlText.split("--> statement-breakpoint");
      const tx = conn.transaction(() => {
        for (const s of stmts) {
          const t = s.trim();
          if (t) conn.exec(t);
        }
        conn.prepare("INSERT INTO _migration_history (name, applied_at) VALUES (?, ?)").run(f, Date.now());
      });
      tx();
    }
  }
}

export function getDb(): Db {
  if (_db) return _db;

  if (!process.env.LOCAL_DB) {
    process.env.LOCAL_DB = "./local.db";
  }

  // Cloudflare runtime would use: getCloudflareContext().env.DB → drizzleD1(env.DB, { schema })
  const sqlite = new BetterSqlite3(process.env.LOCAL_DB);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  runMigrations(sqlite);
  _db = drizzleSqlite(sqlite, { schema });
  return _db;
}

export { schema };
