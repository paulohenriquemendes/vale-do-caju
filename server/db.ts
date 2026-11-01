import "dotenv/config";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL)
  throw Error("DATABASE_URL é obrigatória em produção.");
const dataDir =
  process.env.PGLITE_DATA_DIR ||
  (process.env.LOCALAPPDATA
    ? join(process.env.LOCALAPPDATA, "ValeDoCaju", "postgres")
    : ".data/postgres");
if (!process.env.DATABASE_URL) mkdirSync(dirname(dataDir), { recursive: true });
const db = process.env.DATABASE_URL
  ? new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: true, ca: readFileSync(new URL("./certs/supabase-ca.crt", import.meta.url), "utf8") } : undefined,
    })
  : new PGlite(dataDir);
export async function query<T = any>(
  sql: string,
  params: any[] = [],
): Promise<{ rows: T[] }> {
  return (
    db instanceof PGlite
      ? await db.query(sql, params)
      : await db.query(sql, params)
  ) as { rows: T[] };
}
export async function migrate() {
  await query(
    `CREATE TABLE IF NOT EXISTS family_world(id INTEGER PRIMARY KEY,treasury INTEGER NOT NULL DEFAULT 0);`,
  );
  await query(
    `INSERT INTO family_world(id,treasury) VALUES(1,0) ON CONFLICT DO NOTHING;`,
  );
  await query(
    `CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,nickname TEXT NOT NULL,password TEXT NOT NULL);`,
  );
  await query(
    `CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id) ON DELETE CASCADE,expires BIGINT NOT NULL);`,
  );
  await query(
    `CREATE TABLE IF NOT EXISTS saves(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,state JSONB NOT NULL);`,
  );
  await query(
    `CREATE TABLE IF NOT EXISTS commands(user_id TEXT REFERENCES users(id) ON DELETE CASCADE,id TEXT NOT NULL,PRIMARY KEY(user_id,id));`,
  );
  await query(
    `CREATE TABLE IF NOT EXISTS presence(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, x REAL NOT NULL,y REAL NOT NULL,location TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'livre',seen BIGINT NOT NULL);`,
  );
  await query(
    `CREATE TABLE IF NOT EXISTS resets(token TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id) ON DELETE CASCADE,expires BIGINT NOT NULL);`,
  );
}
export async function close() {
  await ("end" in db ? db.end() : db.close());
}
