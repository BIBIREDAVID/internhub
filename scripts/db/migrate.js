#!/usr/bin/env node
/**
 * Applies schema.sql to the target PostgreSQL database (drops and
 * recreates every table).
 *
 * Usage:
 *   DATABASE_URL=postgres://user:pass@localhost:5432/internhub node scripts/db/migrate.js
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  console.error("Set DATABASE_URL, e.g. postgres://user:pass@localhost:5432/internhub");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
const schema = readFileSync(path.join(__dirname, "schema.sql"), "utf8");

await client.connect();
try {
  await client.query(schema);
  console.log("Schema applied.");
} finally {
  await client.end();
}
