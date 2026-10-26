# Testing guide

How to test InternHub — automated tests, and a manual walkthrough of each role's features using seeded demo data. See `README.md` for setup/deploy and the full data model. For a screenshot-driven version of the walkthrough below, see [`docs/TESTING_VISUAL.md`](docs/TESTING_VISUAL.md).

## 1. Automated tests

```
npm test           # Vitest + Testing Library (unit/component)
npm run test:e2e   # Playwright (builds + serves dist/, checks public pages)
npm run lint
npm run build
```

- **Unit tests** (`src/components/ProtectedRoute.test.jsx`, `src/contexts/AuthContext.test.jsx`) cover role/redirect logic in isolation, against a mocked `src/api.js` — no real backend/database calls.
- **E2E tests** check Login/Signup/Forgot Password render and that unauthenticated visits to protected routes redirect to `/login`. They do **not** exercise a real login → dashboard flow (that needs a running Postgres instance, a running API, and seeded accounts — not wired into CI, see README > Known gaps).
- CI (`.github/workflows/ci.yml`) runs all of the above on every push/PR.

None of this covers actual role-based behavior with real data — that needs the manual walkthrough below.

## 2. Set up seeded demo data

Automated tests don't touch the database, so testing any real workflow (HR inviting someone, a manager assigning a task, an intern checking in) needs a running Postgres instance, a running API, and seeded accounts:

```
createdb internhub                      # once, if the database doesn't exist yet
npm run db:migrate                      # creates the schema (drops and recreates all tables)
npm run seed                            # seeds HR, 2 managers, 10 interns, tasks, attendance, applications
npm run server                          # terminal 1 — Express API on :4000
npm run dev                             # terminal 2 — Vite dev server on :5173
```

Make sure `.env` has `DATABASE_URL` pointing at your Postgres instance and `JWT_SECRET`/`VITE_API_URL` set (see README > Setup). Then sign in at `/login`. All seeded accounts use password `Password123!` (exact emails printed by the seed script, also listed in README > Demo data).

Re-run `npm run seed -- --wipe` any time to reset to a clean state.

## 3. Manual walkthrough by role

### HR (`hr.jordan@example.com`)
- **All Interns** — view roster, reassign an intern to a different manager, deactivate/reactivate an intern (confirm a deactivated intern can't sign in, and any request they're already mid-session for starts getting 403s).
- **Managers** — view the manager list.
- **Invites** — send a new invite to an unused email, confirm it appears with an "Expires in 7 days" countdown; try **Resend** and confirm the expiry resets and instructions copy to the clipboard; sign up as that email at `/signup` in an incognito window/second browser and confirm the invite is consumed (deleted) and the new user gets the right role.
- **Pipeline** (Applications) — change an application's status/stage; confirm it's reflected immediately and an `activity_log` entry is written.
- **Activity Log** — confirm entries appear for the reassignment, invite, and application actions above, and that the log itself has no edit/delete controls.
- **Dashboard** — spot-check the summary counts (interns/managers/tasks) match the roster.
- **Forgot password** — go to `/forgot-password`, submit an email; confirm the API responds the same way whether or not the email exists, and check the server console for the logged reset link (`[password reset] ...`) since there's no real email delivery. Open that link, set a new password, and confirm you can log in with it.

### Manager (`manager.priya@example.com` / `manager.sam@example.com`)
- **Dashboard** — confirm only your own interns/tasks/attendance show (not the other manager's).
- **Interns** — view your assigned interns' tasks and attendance from one place.
- **Tasks** — create a task for one of your interns; edit its title/description/priority/due date; confirm your intern sees it appear on their side; add a comment and confirm it's visible to the intern.
- **Attendance** — review an intern's check-in/out for a date, add a manager comment, correct a status (e.g. absent → present) and confirm the intern sees the correction.
- Confirm you **cannot** see or act on interns assigned to the other manager (try navigating directly if the UI doesn't expose them).

### Intern (`intern1@example.com` .. `intern10@example.com`)
- **Dashboard** — confirm it shows only your own tasks/progress.
- **Tasks** — open an assigned task, change its status (pending → in-progress → completed); confirm you **cannot** edit title/description/due date; add a comment and confirm your manager sees it.
- **Attendance** — check in for today, check out later, add a note; confirm you can't edit a manager's comment or a past record's status once set (beyond what the API allows).
- **Onboarding** — advance the onboarding step / edit your own details (name/department) and confirm it saves.
- Confirm you **cannot** reach any HR or other-manager/-intern route (`/hr/*`, another intern's data) — `ProtectedRoute` should redirect, and even a direct API call (e.g. via devtools) should be rejected by the server with a 403.

### Cross-cutting
- **Light/dark mode** — toggle it and check readability across all three roles' pages.
- **Sign out / session** — sign out from each role and confirm protected routes redirect to `/login`; sign back in and land on the correct role's dashboard.
- **Authorization** — the real access control lives in `server/routes/*.js` and `server/middleware/authorize.js`, not the UI (see README). If you change an authorization rule, re-test the specific role/action it affects, not just the one page you were editing.

## 4. Reports

`scripts/db/reports.js` runs SQL reports against the same Postgres database the app uses, writing CSVs to `reports/`:

```
npm run db:reports
```

Sanity checks: each intern's attendance days should sum to `days_recorded`; every intern in `intern_roster.csv` should have a `manager_name`; each manager's task counts should sum to `total_tasks`. Open the generated CSVs in Excel/LibreOffice/Google Sheets to view or print as a formatted report.
