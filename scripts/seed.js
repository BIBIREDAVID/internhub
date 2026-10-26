#!/usr/bin/env node
/**
 * Seeds InternHub's Postgres database with realistic demo data: HR, managers,
 * interns, tasks, two weeks of attendance history, and a handful of
 * applications. This is NOT part of the deployed app; it's a one-off local
 * script for trying InternHub out with real-looking data instead of an empty
 * database.
 *
 * Usage:
 *   DATABASE_URL=postgres://user:pass@localhost:5432/internhub node scripts/seed.js
 *
 * Run scripts/db/migrate.js first to create the schema.
 *
 * Safe to re-run: existing demo accounts (matched by email) are reused
 * rather than duplicated, though it will keep adding new attendance/task
 * records each run — pass --wipe to delete every seeded user first.
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import { pool, query } from "../server/db.js";

const DEMO_PASSWORD = "Password123!";
const WIPE = process.argv.includes("--wipe");
// Every seeded login gets written here (gitignored) so you don't have to
// remember them.
const CREDENTIALS_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "seed-credentials.md");
const seededAccounts = [];

const departments = ["Engineering", "Design", "Data", "Product", "Marketing"];

const managers = [
  { email: "manager.priya@example.com", name: "Priya Nair" },
  { email: "manager.sam@example.com", name: "Sam Okafor" },
];

const hr = { email: "hr.jordan@example.com", name: "Jordan Blake" };

const internNames = [
  "Alex Chen", "Riya Patel", "Marcus Webb", "Sofia Torres", "Liam Nguyen",
  "Ava Johnson", "Noah Kim", "Ella Martin", "Ethan Brooks", "Maya Singh",
];

function todayMinus(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

async function upsertUser({ email, name, role, department, managerId, cohortId }) {
  seededAccounts.push({ role, name, email, department });
  const { rows: existingRows } = await query("SELECT uid FROM users WHERE email = $1", [email]);
  if (existingRows[0]) {
    return existingRows[0].uid;
  }

  const uid = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  await query(
    `INSERT INTO users (uid, email, name, role, password_hash, department, manager_id, cohort_id, start_date, end_date, onboarding_step, onboarding_checklist, active, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, TRUE, now())`,
    [
      uid,
      email,
      name,
      role,
      passwordHash,
      department || null,
      managerId || null,
      cohortId || null,
      role === "intern" ? todayMinus(30) : null,
      role === "intern" ? todayMinus(-60) : null,
      role === "intern" ? Math.floor(Math.random() * 6) : 0,
      JSON.stringify([]),
    ]
  );

  return uid;
}

async function wipeDemoData() {
  console.log("Wiping previously seeded demo accounts...");
  const allEmails = [hr.email, ...managers.map((m) => m.email), ...internNames.map((_, i) => `intern${i + 1}@example.com`)];
  await query("DELETE FROM users WHERE email = ANY($1::text[])", [allEmails]);
}

async function seed() {
  if (WIPE) await wipeDemoData();

  console.log("Seeding HR...");
  await upsertUser({ ...hr, role: "hr" });

  console.log("Seeding managers...");
  const managerUids = [];
  for (const manager of managers) {
    managerUids.push(await upsertUser({ ...manager, role: "manager" }));
  }

  console.log("Seeding interns...");
  const internUids = [];
  for (let i = 0; i < internNames.length; i++) {
    const uid = await upsertUser({
      email: `intern${i + 1}@example.com`,
      name: internNames[i],
      role: "intern",
      department: departments[i % departments.length],
      managerId: managerUids[i % managerUids.length],
      cohortId: i < 5 ? "2026-spring" : "2026-summer",
    });
    internUids.push(uid);
  }

  console.log("Seeding tasks...");
  const taskTitles = [
    "Set up dev environment", "Write onboarding doc", "Fix login bug",
    "Design landing page", "Review PR #42", "Prepare demo",
  ];
  for (const internUid of internUids) {
    const { rows } = await query("SELECT manager_id FROM users WHERE uid = $1", [internUid]);
    const managerUid = rows[0]?.manager_id;
    for (let t = 0; t < 3; t++) {
      await query(
        `INSERT INTO tasks (task_id, title, description, due_date, priority, status, intern_id, manager_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())`,
        [
          crypto.randomUUID(),
          taskTitles[Math.floor(Math.random() * taskTitles.length)],
          "Seeded demo task.",
          todayMinus(-7 * (t + 1)),
          ["low", "medium", "high"][t % 3],
          ["pending", "in-progress", "completed"][Math.floor(Math.random() * 3)],
          internUid,
          managerUid,
        ]
      );
    }
  }

  console.log("Seeding two weeks of attendance...");
  for (const internUid of internUids) {
    for (let d = 0; d < 14; d++) {
      const date = todayMinus(d);
      const roll = Math.random();
      const status = roll < 0.08 ? "absent" : roll < 0.18 ? "late" : "present";
      await query(
        `INSERT INTO attendance (attendance_id, intern_id, date, status, check_in, check_out, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (attendance_id) DO NOTHING`,
        [
          `${internUid}_${date}`,
          internUid,
          date,
          status,
          status === "absent" ? null : `${date}T09:1${Math.floor(Math.random() * 5)}:00.000Z`,
          status === "absent" ? null : `${date}T17:0${Math.floor(Math.random() * 5)}:00.000Z`,
          "",
        ]
      );
    }
  }

  console.log("Seeding applications...");
  const stages = ["new", "screening", "interview", "offer", "rejected"];
  for (let a = 0; a < 12; a++) {
    await query(
      `INSERT INTO applications (application_id, candidate_name, candidate_email, department, stage, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())`,
      [
        crypto.randomUUID(),
        `Applicant ${a + 1}`,
        `applicant${a + 1}@example.com`,
        departments[a % departments.length],
        stages[a % stages.length],
        stages[a % stages.length],
      ]
    );
  }

  console.log("\nDone. Demo accounts (all use password: %s):", DEMO_PASSWORD);
  console.log(`  HR:      ${hr.email}`);
  managers.forEach((m) => console.log(`  Manager: ${m.email}`));
  console.log(`  Interns: intern1@example.com .. intern${internNames.length}@example.com`);

  writeCredentialsFile();
  console.log(`\nCredentials saved to ${CREDENTIALS_FILE}`);
}

function writeCredentialsFile() {
  const lines = [
    "# InternHub demo login credentials",
    "",
    `Generated by \`scripts/seed.js\` on ${new Date().toISOString()}. Local demo data only — do not commit.`,
    "",
    `All accounts use the password: \`${DEMO_PASSWORD}\``,
    "",
    "| Role | Name | Email | Password | Department |",
    "| --- | --- | --- | --- | --- |",
    ...seededAccounts.map(
      (a) => `| ${a.role} | ${a.name} | ${a.email} | ${DEMO_PASSWORD} | ${a.department || "—"} |`
    ),
    "",
  ];
  fs.writeFileSync(CREDENTIALS_FILE, lines.join("\n"));
}

seed()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
