#!/usr/bin/env node
/**
 * Seeds InternHub's Postgres database with a large, realistic-looking demo
 * dataset: HR, managers, a full roster of interns across two cohorts, tasks
 * with history and comments, ~2 months of attendance, a recruitment
 * pipeline full of applications, a few invites, and an activity log. This
 * is NOT part of the deployed app; it's a one-off local script for trying
 * InternHub out with data dense enough to make the Reports page and
 * dashboards look like a real, active program instead of an empty one.
 *
 * Usage:
 *   DATABASE_URL=postgres://user:pass@localhost:5432/internhub node scripts/seed.js
 *
 * Run scripts/db/migrate.js first to create the schema.
 *
 * Safe to re-run: existing demo accounts (matched by email) are reused
 * rather than duplicated, though it will keep adding new attendance/task
 * records each run — pass --wipe to delete every seeded row first.
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

// One shared password hash — hashing per-account is needlessly slow and
// every demo account uses the same password anyway.
let sharedPasswordHash = null;

function todayMinus(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function pick(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

function weightedPick(weighted) {
  // weighted: [[value, weight], ...]
  const total = weighted.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [value, w] of weighted) {
    roll -= w;
    if (roll <= 0) return value;
  }
  return weighted[weighted.length - 1][0];
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function isWeekday(d) {
  const day = d.getDay();
  return day !== 0 && day !== 6;
}

// ---------------------------------------------------------------------------
// Roster definitions
// ---------------------------------------------------------------------------

const hr = { email: "hr.jordan@example.com", name: "Jordan Blake" };

const managerDefs = [
  { email: "manager.priya@example.com", name: "Priya Nair", department: "Engineering" },
  { email: "manager.sam@example.com", name: "Sam Okafor", department: "Engineering" },
  { email: "manager.devon@example.com", name: "Devon Clarke", department: "Design" },
  { email: "manager.wei@example.com", name: "Wei Zhang", department: "Data" },
  { email: "manager.harper@example.com", name: "Harper Lewis", department: "Product" },
  { email: "manager.noemi@example.com", name: "Noemi Alvarez", department: "Marketing" },
];

// 40 interns: first 25 are "veterans" (started ~5-7 months ago, further
// along), the rest are recent joiners (started 2-8 weeks ago). Spread
// across departments roughly matching how many managers cover each one.
const internNames = [
  "Alex Chen", "Riya Patel", "Marcus Webb", "Sofia Torres", "Liam Nguyen",
  "Ava Johnson", "Noah Kim", "Ella Martin", "Ethan Brooks", "Maya Singh",
  "Daniel Osei", "Grace Lindqvist", "Omar Haddad", "Chloe Dubois", "Felix Baumann",
  "Isla Fraser", "Jamal Carter", "Nina Petrova", "Theo Andersson", "Zara Malik",
  "Lucas Silva", "Hana Suzuki", "Benjamin Okoro", "Priya Raman", "Mateo Garcia",
  "Freya Larsen", "Kwame Asante", "Yuki Tanaka", "Sienna Wallace", "Diego Morales",
  "Amara Johnson", "Leo Fischer", "Nadia Rahman", "Owen Fitzgerald", "Camille Laurent",
  "Ravi Shankar", "Ingrid Solberg", "Tariq Jensen", "Lily Zhou", "Carlos Mendoza",
];

const internDeptPlan = [
  { department: "Engineering", count: 12 },
  { department: "Design", count: 6 },
  { department: "Data", count: 8 },
  { department: "Product", count: 8 },
  { department: "Marketing", count: 6 },
];

const taskTitlePool = [
  "Set up dev environment", "Write onboarding doc", "Fix login bug",
  "Design landing page", "Review PR #42", "Prepare demo",
  "Draft API documentation", "Investigate flaky test suite", "Build analytics dashboard widget",
  "Audit accessibility on signup flow", "Migrate config to new format", "Write unit tests for billing module",
  "Research competitor pricing", "Create onboarding survey", "Optimize image loading pipeline",
  "Pair with senior engineer on refactor", "Prepare sprint retro notes", "Update design system tokens",
  "Clean up stale feature flags", "Shadow customer support call",
];

const taskDescriptions = [
  "Picked up during the weekly sprint planning session.",
  "Follow-up from the manager 1:1 this week.",
  "Carried over from last sprint, still in progress.",
  "Assigned as part of the onboarding checklist.",
  "Requested by the team lead ahead of the demo.",
  "Logged after a bug report from QA.",
  "Part of the quarterly goals for this intern's track.",
  "Small scoped task to build familiarity with the codebase.",
];

const applicantFirstNames = [
  "Jordan", "Taylor", "Morgan", "Casey", "Avery", "Reese", "Jamie", "Rowan",
  "Quinn", "Peyton", "Harper", "Sawyer", "Emerson", "Dakota", "Skylar", "Blair",
  "Cameron", "Devon", "Elliot", "Finley",
];
const applicantLastNames = [
  "Bennett", "Coleman", "Reyes", "Hughes", "Price", "Foster", "Simmons", "Russell",
  "Patterson", "Hayes", "Myers", "Ford", "Graham", "Sullivan", "Wallace", "West",
  "Jordan", "Owens", "Reid", "Dunn",
];

// ---------------------------------------------------------------------------
// User helpers
// ---------------------------------------------------------------------------

async function upsertUser({ email, name, role, department, managerId, cohortId, startDate, endDate, onboardingStep, active }) {
  seededAccounts.push({ role, name, email, department });
  const { rows: existingRows } = await query("SELECT uid FROM users WHERE email = $1", [email]);
  if (existingRows[0]) {
    return existingRows[0].uid;
  }

  const uid = crypto.randomUUID();

  await query(
    `INSERT INTO users (uid, email, name, role, password_hash, department, manager_id, cohort_id, start_date, end_date, onboarding_step, onboarding_checklist, active, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now())`,
    [
      uid,
      email,
      name,
      role,
      sharedPasswordHash,
      department || null,
      managerId || null,
      cohortId || null,
      startDate ? toDateStr(startDate) : null,
      endDate ? toDateStr(endDate) : null,
      onboardingStep ?? 0,
      JSON.stringify([]),
      active !== false,
    ]
  );

  return uid;
}

async function wipeDemoData() {
  console.log("Wiping previously seeded demo data...");
  const allEmails = [
    hr.email,
    ...managerDefs.map((m) => m.email),
    ...internNames.map((_, i) => `intern${i + 1}@example.com`),
  ];
  await query("DELETE FROM users WHERE email = ANY($1::text[])", [allEmails]);
  // These tables have no FK tying them back to seeded users, and they only
  // ever hold demo data in local dev, so a full clear is safe on --wipe.
  await query("DELETE FROM applications");
  await query("DELETE FROM invites");
  await query("DELETE FROM activity_log");
}

// ---------------------------------------------------------------------------
// Seed steps
// ---------------------------------------------------------------------------

async function seedPeople() {
  console.log("Seeding HR...");
  const hrUid = await upsertUser({ ...hr, role: "hr", active: true });

  console.log("Seeding managers...");
  const managerUids = {};
  for (const manager of managerDefs) {
    const uid = await upsertUser({ ...manager, role: "manager", active: true });
    managerUids[manager.department] = managerUids[manager.department] || [];
    managerUids[manager.department].push(uid);
  }

  console.log("Seeding interns...");
  const interns = []; // { uid, department, managerId, isVeteran, active }
  let nameIndex = 0;
  let deptManagerCursor = {};
  let internIndex = 0;

  for (const plan of internDeptPlan) {
    for (let n = 0; n < plan.count; n++) {
      const i = internIndex;
      const isVeteran = i < 25;
      const cursor = deptManagerCursor[plan.department] || 0;
      const managerPool = managerUids[plan.department];
      const managerId = managerPool[cursor % managerPool.length];
      deptManagerCursor[plan.department] = cursor + 1;

      const name = internNames[nameIndex % internNames.length];
      nameIndex += 1;

      const startDate = isVeteran ? todayMinus(randomInt(150, 210)) : todayMinus(randomInt(15, 55));
      const willHaveLeft = isVeteran && i >= 23; // a couple of veterans already finished up
      const endDate = willHaveLeft
        ? todayMinus(randomInt(5, 20))
        : todayMinus(-(isVeteran ? randomInt(30, 90) : randomInt(90, 180)));
      const onboardingStep = isVeteran ? 5 : randomInt(1, 4);
      const active = !willHaveLeft;

      const uid = await upsertUser({
        email: `intern${i + 1}@example.com`,
        name,
        role: "intern",
        department: plan.department,
        managerId,
        cohortId: isVeteran ? "2026-spring" : "2026-fall",
        startDate,
        endDate,
        onboardingStep,
        active,
      });

      interns.push({ uid, department: plan.department, managerId, isVeteran, active, startDate, endDate });
      internIndex += 1;
    }
  }

  return { hrUid, managerUids, interns };
}

async function seedTasksAndComments(interns) {
  console.log("Seeding tasks...");
  const tasks = []; // { taskId, internUid, managerId, status, createdAt }

  for (const intern of interns) {
    const numTasks = intern.isVeteran ? randomInt(6, 10) : randomInt(2, 4);
    const daysSinceStart = Math.max(1, Math.round((Date.now() - intern.startDate.getTime()) / 86400000));
    const maxLookback = Math.min(59, daysSinceStart);

    for (let t = 0; t < numTasks; t++) {
      const createdDaysAgo = randomInt(0, maxLookback);
      const createdAt = todayMinus(createdDaysAgo);
      const dueDate = new Date(createdAt.getTime() + randomInt(3, 21) * 86400000);

      const status = intern.isVeteran
        ? weightedPick([["completed", 0.6], ["in-progress", 0.25], ["pending", 0.15]])
        : weightedPick([["completed", 0.25], ["in-progress", 0.35], ["pending", 0.4]]);
      const priority = weightedPick([["low", 0.3], ["medium", 0.45], ["high", 0.25]]);

      const taskId = crypto.randomUUID();
      const updatedAt = status === "pending" ? createdAt : new Date(createdAt.getTime() + randomInt(1, Math.max(1, createdDaysAgo)) * 86400000);

      await query(
        `INSERT INTO tasks (task_id, title, description, due_date, priority, status, intern_id, manager_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          taskId,
          pick(taskTitlePool),
          pick(taskDescriptions),
          toDateStr(dueDate),
          priority,
          status,
          intern.uid,
          intern.managerId,
          createdAt.toISOString(),
          updatedAt.toISOString(),
        ]
      );

      tasks.push({ taskId, internUid: intern.uid, managerId: intern.managerId, status, createdAt, dueDate });
    }
  }

  console.log("Seeding task comments...");
  const internById = new Map(interns.map((i) => [i.uid, i]));
  for (const task of tasks) {
    if (task.status === "pending") continue; // not much to discuss yet
    if (Math.random() > 0.5) continue;

    const numComments = task.status === "completed" ? randomInt(1, 2) : randomInt(0, 2);
    let lastTime = task.createdAt.getTime();
    for (let c = 0; c < numComments; c++) {
      lastTime += randomInt(1, 3) * 3600 * 1000 * randomInt(1, 8);
      const createdAt = new Date(Math.min(lastTime, Date.now()));
      const fromManager = c % 2 === 0;
      const text = fromManager
        ? pick([
            "How's this coming along?",
            "Let me know if you're blocked on anything.",
            "Looks good so far — ship it when ready.",
            "Can you add a few notes on your approach here?",
          ])
        : pick([
            "Making progress, should be done soon.",
            "Ran into a blocker, looking into it now.",
            "Just pushed an update, ready for review.",
            "Thanks, I'll have this wrapped up by tomorrow.",
          ]);

      const intern = internById.get(task.internUid);
      await query(
        `INSERT INTO task_comments (comment_id, task_id, author_id, author_name, author_role, text, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          crypto.randomUUID(),
          task.taskId,
          fromManager ? task.managerId : task.internUid,
          fromManager ? managerName(task.managerId) : intern?.name || "Intern",
          fromManager ? "manager" : "intern",
          text,
          createdAt.toISOString(),
        ]
      );
    }
  }

  return tasks;
}

// Small cache so comment seeding doesn't need an extra query per comment.
const managerNameCache = new Map();
function managerName(uid) {
  return managerNameCache.get(uid) || "Manager";
}

async function seedAttendance(interns) {
  console.log("Seeding ~2 months of attendance history...");
  const horizon = todayMinus(59);

  for (const intern of interns) {
    const windowStart = intern.startDate > horizon ? intern.startDate : horizon;
    const windowEnd = intern.endDate < new Date() ? intern.endDate : new Date();
    if (windowStart >= windowEnd) continue;

    // Each intern gets a consistent "reliability" personality rather than
    // uniform randomness, so attendance reports show real variance.
    const pAbsent = randomFloat(0.02, 0.09);
    const pLate = randomFloat(0.05, 0.16);

    const cursor = new Date(windowStart);
    while (cursor <= windowEnd) {
      if (isWeekday(cursor)) {
        const date = toDateStr(cursor);
        const roll = Math.random();
        const status = roll < pAbsent ? "absent" : roll < pAbsent + pLate ? "late" : "present";

        const checkIn = status === "absent" ? null : `${date}T${status === "late" ? `09:${randomInt(25, 50)}` : `08:${randomInt(50, 59)}`}:00.000Z`;
        const checkOut = status === "absent" ? null : `${date}T17:${randomInt(0, 55).toString().padStart(2, "0")}:00.000Z`;

        const hasFollowUp = status !== "present" && Math.random() < 0.3;
        const note = status === "late" ? pick(["Traffic delay", "Transit delay", ""]) : status === "absent" ? pick(["Sick day", "Personal appointment", ""]) : "";
        const managerComment = hasFollowUp ? pick(["Excused, thanks for the heads up.", "Please remember to message ahead next time.", "Noted, all good."]) : null;
        const reviewedAt = hasFollowUp ? `${date}T19:00:00.000Z` : null;

        await query(
          `INSERT INTO attendance (attendance_id, intern_id, date, status, check_in, check_out, note, manager_comment, reviewed_by_manager_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (attendance_id) DO NOTHING`,
          [`${intern.uid}_${date}`, intern.uid, date, status, checkIn, checkOut, note, managerComment, reviewedAt]
        );
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }
}

async function seedApplications(hrUid) {
  console.log("Seeding recruitment pipeline...");
  const stagePlan = [
    ...Array(15).fill("new"),
    ...Array(10).fill("screening"),
    ...Array(8).fill("interview"),
    ...Array(5).fill("offer"),
    ...Array(3).fill("onboarding"),
    ...Array(4).fill("rejected"),
  ];
  const stages = shuffle(stagePlan);

  const lookbackByStage = {
    new: [0, 14],
    screening: [7, 30],
    interview: [14, 45],
    offer: [30, 60],
    onboarding: [45, 75],
    rejected: [5, 60],
  };

  const applications = [];
  const usedNames = new Set();
  for (let a = 0; a < stages.length; a++) {
    const stage = stages[a];
    let candidateName;
    do {
      candidateName = `${pick(applicantFirstNames)} ${pick(applicantLastNames)}`;
    } while (usedNames.has(candidateName));
    usedNames.add(candidateName);

    const [minDays, maxDays] = lookbackByStage[stage];
    const createdAt = todayMinus(randomInt(minDays, maxDays));
    const reviewed = stage !== "new";
    const reviewedAt = reviewed ? new Date(Math.min(createdAt.getTime() + randomInt(1, 10) * 86400000, Date.now())) : null;

    const applicationId = crypto.randomUUID();
    await query(
      `INSERT INTO applications (application_id, candidate_name, candidate_email, department, stage, status, reviewed_by, reviewed_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        applicationId,
        candidateName,
        `${candidateName.toLowerCase().replace(/\s+/g, ".")}@example.com`,
        departments[a % departments.length],
        stage,
        stage,
        reviewed ? hrUid : null,
        reviewedAt ? reviewedAt.toISOString() : null,
        createdAt.toISOString(),
      ]
    );
    applications.push({ applicationId, candidateName, stage, createdAt });
  }

  return applications;
}

async function seedInvites(hrUid, managerUids) {
  console.log("Seeding invites...");
  const allManagerUids = Object.values(managerUids).flat();
  const invitePlan = [
    { email: "invite.jess@example.com", name: "Jess Carter", role: "intern", daysAgo: 2, expiresInDays: 5 },
    { email: "invite.sam@example.com", name: "Sam Kowalski", role: "intern", daysAgo: 10, expiresInDays: -3 },
    { email: "invite.tori@example.com", name: "Tori Blackwell", role: "intern", daysAgo: 1, expiresInDays: 6 },
    { email: "invite.renee@example.com", name: "Renee Martel", role: "manager", daysAgo: 4, expiresInDays: 3 },
    { email: "invite.kian@example.com", name: "Kian Mehta", role: "intern", daysAgo: 20, expiresInDays: -13 },
    { email: "invite.paulo@example.com", name: "Paulo Ribeiro", role: "intern", daysAgo: 0, expiresInDays: 7 },
  ];

  for (const invite of invitePlan) {
    const { rows: existing } = await query("SELECT email FROM invites WHERE email = $1", [invite.email]);
    if (existing[0]) continue;
    const invitedAt = todayMinus(invite.daysAgo);
    const expiresAt = new Date(Date.now() + invite.expiresInDays * 86400000);
    await query(
      `INSERT INTO invites (email, name, role, manager_id, invited_by, invited_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        invite.email,
        invite.name,
        invite.role,
        invite.role === "intern" ? pick(allManagerUids) : null,
        hrUid,
        invitedAt.toISOString(),
        expiresAt.toISOString(),
      ]
    );
  }
}

async function seedActivityLog(hrUid, interns, applications, managerUids) {
  console.log("Seeding activity log...");
  const entries = [];

  const inactiveInterns = interns.filter((i) => !i.active);
  for (const intern of inactiveInterns) {
    entries.push({ action: "deactivate_intern", targetId: intern.uid, details: {}, daysAgo: randomInt(3, 15) });
  }

  const allManagerUids = Object.values(managerUids).flat();
  const reassigned = shuffle(interns.filter((i) => i.isVeteran)).slice(0, 5);
  for (const intern of reassigned) {
    const otherManagers = allManagerUids.filter((uid) => uid !== intern.managerId);
    if (otherManagers.length === 0) continue;
    entries.push({
      action: "reassign_intern",
      targetId: intern.uid,
      details: { from: intern.managerId, to: pick(otherManagers) },
      daysAgo: randomInt(5, 55),
    });
  }

  for (const app of shuffle(applications).slice(0, 25)) {
    if (app.stage === "new") continue;
    entries.push({
      action: "update_application_status",
      targetId: app.applicationId,
      details: { status: app.stage, stage: app.stage },
      daysAgo: Math.max(0, Math.round((Date.now() - app.createdAt.getTime()) / 86400000) - randomInt(0, 3)),
    });
  }

  entries.push({ action: "send_invite", targetId: "invite.jess@example.com", details: { role: "intern" }, daysAgo: 2 });
  entries.push({ action: "send_invite", targetId: "invite.renee@example.com", details: { role: "manager" }, daysAgo: 4 });
  entries.push({ action: "resend_invite", targetId: "invite.kian@example.com", details: { role: "intern" }, daysAgo: 1 });

  for (const entry of entries) {
    await query(
      `INSERT INTO activity_log (entry_id, action, actor_id, actor_email, target_type, target_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        crypto.randomUUID(),
        entry.action,
        hrUid,
        hr.email,
        entry.action.includes("intern") ? "user" : entry.action.includes("application") ? "application" : "invite",
        entry.targetId,
        JSON.stringify(entry.details || {}),
        todayMinus(entry.daysAgo).toISOString(),
      ]
    );
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function seed() {
  sharedPasswordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  if (WIPE) await wipeDemoData();

  const { hrUid, managerUids, interns } = await seedPeople();

  // Populate the manager-name cache used by task-comment seeding.
  for (const def of managerDefs) {
    const { rows } = await query("SELECT uid, name FROM users WHERE email = $1", [def.email]);
    if (rows[0]) managerNameCache.set(rows[0].uid, rows[0].name);
  }

  await seedTasksAndComments(interns);
  await seedAttendance(interns);
  const applications = await seedApplications(hrUid);
  await seedInvites(hrUid, managerUids);
  await seedActivityLog(hrUid, interns, applications, managerUids);

  console.log("\nDone. Demo accounts (all use password: %s):", DEMO_PASSWORD);
  console.log(`  HR:      ${hr.email}`);
  managerDefs.forEach((m) => console.log(`  Manager: ${m.email}`));
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
