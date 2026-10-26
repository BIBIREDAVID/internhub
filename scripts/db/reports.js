#!/usr/bin/env node
/**
 * Runs a handful of reporting queries (with joins across the relational
 * tables) against the PostgreSQL mirror and writes each as a CSV under
 * reports/ — for the CSC 394 deliverable ("generate/design reports").
 *
 * Run scripts/db/export-to-postgres.js first to populate the tables.
 *
 * Usage:
 *   DATABASE_URL=postgres://user:pass@localhost:5432/internhub node scripts/db/reports.js
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "..", "reports");

if (!process.env.DATABASE_URL) {
  console.error("Set DATABASE_URL, e.g. postgres://user:pass@localhost:5432/internhub");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

function toCsv(rows) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    if (v === null || v === undefined) return "";
    const s = v instanceof Date ? v.toISOString().slice(0, 10) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

function writeReport(name, rows) {
  mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, `${name}.csv`);
  writeFileSync(file, toCsv(rows));
  console.log(`${name}: ${rows.length} rows -> reports/${name}.csv`);
}

const REPORTS = [
  {
    name: "intern_attendance_summary",
    // Joins users -> attendance, grouped per intern.
    sql: `
      SELECT
        u.uid AS intern_id,
        u.name AS intern_name,
        u.department,
        COUNT(a.*) FILTER (WHERE a.status = 'present') AS days_present,
        COUNT(a.*) FILTER (WHERE a.status = 'late') AS days_late,
        COUNT(a.*) FILTER (WHERE a.status = 'absent') AS days_absent,
        COUNT(a.*) AS days_recorded
      FROM users u
      LEFT JOIN attendance a ON a.intern_id = u.uid
      WHERE u.role = 'intern'
      GROUP BY u.uid, u.name, u.department
      ORDER BY u.name;
    `,
  },
  {
    name: "task_completion_by_manager",
    // Joins tasks -> users (manager), grouped per manager.
    sql: `
      SELECT
        m.uid AS manager_id,
        m.name AS manager_name,
        COUNT(t.*) AS total_tasks,
        COUNT(t.*) FILTER (WHERE t.status = 'completed') AS completed,
        COUNT(t.*) FILTER (WHERE t.status = 'in-progress') AS in_progress,
        COUNT(t.*) FILTER (WHERE t.status = 'pending') AS pending
      FROM users m
      LEFT JOIN tasks t ON t.manager_id = m.uid
      WHERE m.role = 'manager'
      GROUP BY m.uid, m.name
      ORDER BY m.name;
    `,
  },
  {
    name: "intern_roster",
    // Joins interns to their manager (self-join via manager_id -> users.uid).
    sql: `
      SELECT
        i.uid AS intern_id,
        i.name AS intern_name,
        i.department,
        i.start_date,
        i.end_date,
        i.active,
        mgr.name AS manager_name
      FROM users i
      LEFT JOIN users mgr ON mgr.uid = i.manager_id
      WHERE i.role = 'intern'
      ORDER BY i.department, i.name;
    `,
  },
  {
    name: "overdue_tasks",
    // Joins tasks -> intern, tasks -> manager.
    sql: `
      SELECT
        t.task_id,
        t.title,
        t.due_date,
        t.status,
        intern.name AS intern_name,
        manager.name AS manager_name
      FROM tasks t
      JOIN users intern ON intern.uid = t.intern_id
      JOIN users manager ON manager.uid = t.manager_id
      WHERE t.status <> 'completed' AND t.due_date < CURRENT_DATE
      ORDER BY t.due_date;
    `,
  },
];

async function main() {
  await client.connect();
  for (const report of REPORTS) {
    const { rows } = await client.query(report.sql);
    writeReport(report.name, rows);
  }
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
