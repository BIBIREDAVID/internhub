import pg from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("Set DATABASE_URL, e.g. postgres://user:pass@localhost:5432/internhub");
}

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

export function query(text, params) {
  return pool.query(text, params);
}
