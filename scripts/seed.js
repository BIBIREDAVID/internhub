#!/usr/bin/env node
/**
 * Seeds InternHub with realistic demo data: HR, managers, interns, tasks,
 * two weeks of attendance history, and a handful of applications.
 *
 * Requires a Firebase service account key (Admin SDK access) — see the
 * "Demo data" section of README.md for how to get one. This is NOT part of
 * the deployed app; it's a one-off local script for trying InternHub out
 * with real-looking data instead of an empty database.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json node scripts/seed.js
 *
 * Safe to re-run: existing demo accounts (matched by email) are reused
 * rather than duplicated, though it will keep adding new attendance/task
 * records each run — pass --wipe to delete every seeded user first.
 */

import admin from "firebase-admin";

const DEMO_PASSWORD = "Password123!";
const WIPE = process.argv.includes("--wipe");

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !admin.apps.length) {
  console.error(
    "Set GOOGLE_APPLICATION_CREDENTIALS to the path of a Firebase service account JSON key first.\n" +
    "See README.md > Demo data for how to generate one."
  );
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.applicationDefault() });
const auth = admin.auth();
const db = admin.firestore();

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
  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
  } catch {
    userRecord = await auth.createUser({ email, password: DEMO_PASSWORD, displayName: name });
  }

  await db.collection("users").doc(userRecord.uid).set(
    {
      email,
      name,
      role,
      department: department || null,
      managerId: managerId || null,
      cohortId: cohortId || null,
      startDate: role === "intern" ? todayMinus(30) : null,
      endDate: role === "intern" ? todayMinus(-60) : null,
      onboardingChecklist: [],
      onboardingStep: role === "intern" ? Math.floor(Math.random() * 6) : 0,
      active: true,
      createdAt: new Date().toISOString(),
    },
    { merge: true }
  );

  return userRecord.uid;
}

async function wipeDemoData() {
  console.log("Wiping previously seeded demo accounts...");
  const allEmails = [hr.email, ...managers.map((m) => m.email), ...internNames.map((_, i) => `intern${i + 1}@example.com`)];
  for (const email of allEmails) {
    try {
      const user = await auth.getUserByEmail(email);
      await db.collection("users").doc(user.uid).delete();
      await auth.deleteUser(user.uid);
    } catch {
      // Wasn't seeded before — nothing to remove.
    }
  }
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
    const managerUid = (await db.collection("users").doc(internUid).get()).data().managerId;
    for (let t = 0; t < 3; t++) {
      await db.collection("tasks").add({
        title: taskTitles[Math.floor(Math.random() * taskTitles.length)],
        description: "Seeded demo task.",
        dueDate: todayMinus(-7 * (t + 1)),
        priority: ["low", "medium", "high"][t % 3],
        status: ["pending", "in-progress", "completed"][Math.floor(Math.random() * 3)],
        internId: internUid,
        managerId: managerUid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  console.log("Seeding two weeks of attendance...");
  for (const internUid of internUids) {
    for (let d = 0; d < 14; d++) {
      const date = todayMinus(d);
      const roll = Math.random();
      const status = roll < 0.08 ? "absent" : roll < 0.18 ? "late" : "present";
      await db.collection("attendance").doc(`${internUid}_${date}`).set({
        internId: internUid,
        date,
        status,
        checkIn: status === "absent" ? null : `${date}T09:1${Math.floor(Math.random() * 5)}:00.000Z`,
        checkOut: status === "absent" ? null : `${date}T17:0${Math.floor(Math.random() * 5)}:00.000Z`,
        note: "",
      });
    }
  }

  console.log("Seeding applications...");
  const stages = ["new", "screening", "interview", "offer", "rejected"];
  for (let a = 0; a < 12; a++) {
    await db.collection("applications").add({
      name: `Applicant ${a + 1}`,
      email: `applicant${a + 1}@example.com`,
      department: departments[a % departments.length],
      status: stages[a % stages.length],
      cohortId: "2026-summer",
      educationLevel: "Bachelor's",
      notes: "Seeded demo application.",
      createdAt: new Date().toISOString(),
    });
  }

  console.log("\nDone. Demo accounts (all use password: %s):", DEMO_PASSWORD);
  console.log(`  HR:      ${hr.email}`);
  managers.forEach((m) => console.log(`  Manager: ${m.email}`));
  console.log(`  Interns: intern1@example.com .. intern${internNames.length}@example.com`);
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
