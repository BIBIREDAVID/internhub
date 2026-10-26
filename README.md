# InternHub

A role-based intern management portal (HR / Manager / Intern) built with React, Vite, React Router, an Express API, and PostgreSQL.

## Setup

1. Install dependencies:
   ```
   npm install
   ```
2. Install PostgreSQL and create a database (locally, or any hosted instance):
   ```
   createdb internhub
   ```
3. Copy `.env.example` to `.env` and fill in the values:
   ```
   DATABASE_URL=postgres://user:pass@localhost:5432/internhub
   JWT_SECRET=a-long-random-secret
   PORT=4000
   CORS_ORIGIN=http://localhost:5173
   VITE_API_URL=http://localhost:4000
   ```
   `.env` is gitignored — never commit it. `JWT_SECRET` signs session cookies; use a long random value, especially in production.
4. Create the schema:
   ```
   npm run db:migrate
   ```
5. (Optional) load demo data — see "Demo data" below.
6. Run the API and the frontend in separate terminals:
   ```
   npm run server   # Express API on :4000
   npm run dev      # Vite dev server on :5173
   ```

## Architecture

```
React (Vite SPA)  --fetch, credentials:'include'-->  Express API (server/)  --pg-->  PostgreSQL
```

There is no direct database access from the browser. The React app calls the Express API (`src/api.js`, a thin `fetch` wrapper) for everything; the API is the only thing that talks to PostgreSQL and the only place authorization is enforced (`server/middleware/authorize.js`, `server/routes/*.js`). `ProtectedRoute` on the frontend only hides UI for a better UX — it is not a security boundary.

**Auth**: `POST /auth/login` and `POST /auth/signup` set an httpOnly, `SameSite=Strict` JWT cookie (`server/middleware/auth.js`); the frontend never touches the token directly. Passwords are hashed with bcrypt. Every authenticated request re-checks the user's `active` flag against the database (not just the JWT payload), so a deactivation by HR takes effect on the user's very next request rather than waiting for their session to expire. `/auth/login`, `/auth/signup`, and `/auth/forgot-password` are rate-limited (10 requests / 15 min per IP via `express-rate-limit`) to slow down credential guessing and reset-link spam.

**Password reset**: `POST /auth/forgot-password` issues a single-use token (`password_reset_tokens` table, 1h expiry) and `POST /auth/reset-password` consumes it. No email provider is wired up, so the reset link is currently logged to the server console instead of emailed — see "Known gaps".

## Deploying

Deployment of the Express API process itself (hosting target, process manager, TLS termination, etc.) is not covered here — pick whatever fits (a small VM, Render, Fly.io, etc.) and set `DATABASE_URL`/`JWT_SECRET`/`CORS_ORIGIN` as environment variables there. The frontend is a static Vite build (`npm run build` → `dist/`) that can be served from any static host, pointed at the API via `VITE_API_URL`.

## Data model

All tables are defined in `scripts/db/schema.sql`. Roles and ownership are enforced by the Express routes in `server/routes/`, not by the database itself.

### `users`
| Column | Type | Notes |
|---|---|---|
| `uid` | text, PK | |
| `role` | `hr` \| `manager` \| `intern` | Set by HR at provisioning time; a user can never change their own role. |
| `password_hash` | text | bcrypt hash; never returned by the API. |
| `name`, `department` | text | Editable by HR, or by the user themselves for their own row (**Onboarding → Your Details → Edit** for interns). |
| `email` | text, unique | |
| `manager_id` | text (FK → `users.uid`) | Interns only. Set by HR via **HR → All Interns**; the API rejects pointing it at anyone but an active `role = 'manager'` user. |
| `active` | boolean, default true | HR deactivates instead of deleting (**HR → All Interns**) — a deactivated user keeps their historical tasks/attendance/activity_log rows intact but every authenticated request they make is rejected with 403 until reactivated. |
| `onboarding_checklist` | jsonb | Intern-owned. |
| `onboarding_step` | integer | |

New accounts are provisioned through an invite, not directly: HR sends one from **HR → Invites** (`POST /invites`), which creates an `invites` row; the invitee then signs up at `/signup` with that exact email (`POST /auth/signup`), which validates a matching, unexpired invite exists, creates the `users` row, and deletes the invite. See `invites` below.

### `tasks`
| Column | Type | Notes |
|---|---|---|
| `task_id` | text, PK | |
| `title`, `description`, `due_date`, `priority` | | Set by the assigning manager (or HR). |
| `status` | `pending` \| `in-progress` \| `completed` | Manager/HR can change any field; the assigned intern may only change `status`. |
| `intern_id` | FK → `users.uid` | Must belong to an intern managed by the creating manager. |
| `manager_id` | FK → `users.uid` | Forced to the creator's uid on create (unless HR). |
| `created_at`, `updated_at` | timestamptz | |

#### `task_comments`
Immutable comment thread (no update/delete route exists) visible to whoever can read the parent task — HR, the assigning manager, and the assigned intern. Shown via a "Comments" toggle on each task card/list item (`src/components/TaskComments.jsx`).

| Column | Type | Notes |
|---|---|---|
| `comment_id` | text, PK | |
| `task_id` | FK → `tasks.task_id` | |
| `author_id`, `author_name`, `author_role` | | Forced from the signed-in user server-side. |
| `text` | text | |
| `created_at` | timestamptz | |

### `attendance`
`attendance_id` is deterministic (`{intern_id}_{yyyy-mm-dd}`) so an intern can only ever have one record per day; also enforced by a `UNIQUE (intern_id, date)` constraint.

| Column | Type | Notes |
|---|---|---|
| `attendance_id` | text, PK | |
| `intern_id` | FK → `users.uid` | Owner; only that intern (or HR) can create the record. |
| `date` | date | |
| `status` | `present` \| `late` \| `absent` | Intern sets on check-in; manager/HR may correct it. |
| `check_in`, `check_out` | timestamptz, nullable | |
| `note` | text | Intern-authored. |
| `manager_comment`, `reviewed_by_manager_at` | | Manager/HR-authored only. |

### `applications`
HR-only recruitment pipeline (`status`/`stage`, `reviewed_at`, `reviewed_by`, candidate fields). Nothing in this app creates new applications from the UI — they're expected to be seeded/imported by HR.

### `invites`
Primary key is the lowercased email (not a uid — the account doesn't exist yet).

| Column | Type | Notes |
|---|---|---|
| `email`, `name`, `role` | | What the new `users` row will get on signup. |
| `manager_id` | FK → `users.uid`, nullable | Optional; HR can also assign a manager later from **All Interns**. |
| `invited_by` | FK → `users.uid` | The HR user who last sent/resent it. |
| `invited_at` | timestamptz | |
| `expires_at` | timestamptz | 7 days from send/resend. Enforced server-side — signup fails once passed, not just hidden in the UI. |

Only HR can create/update invites (`server/routes/invites.js`). The signup endpoint looks up the invite matching the submitted email, checks it hasn't expired, creates the user, and deletes the invite. **HR → Invites** shows "Expires in N days" per pending invite and a "Resend" action that extends it another 7 days and copies sign-up instructions to the clipboard (there's no email backend, so HR pastes them into an email/Slack message themselves).

### `activity_log`
Append-only audit trail, HR-only (`GET /activity-log`; no create/update/delete route exists for clients — rows are only ever written server-side, via `server/utils/activityLog.js`, as a side effect of HR reassigning a manager, deactivating/reactivating a user, changing an application's status, or sending/resending an invite). Viewable at **HR → Activity Log**.

| Column | Type | Notes |
|---|---|---|
| `action` | text | e.g. `reassign_intern`, `deactivate_intern`, `update_application_status`, `send_invite` |
| `actor_id`, `actor_email` | | The HR user who performed it. |
| `target_type`, `target_id` | | What was acted on. |
| `details` | jsonb | Action-specific context (e.g. old/new manager name). |
| `created_at` | timestamptz | |

### `password_reset_tokens`
Single-use tokens backing `/auth/forgot-password` and `/auth/reset-password`. `token` (PK), `uid` (FK → `users.uid`), `expires_at`, `used_at`.

## Testing

- **Unit/component**: `npm test` (Vitest + Testing Library). Covers `ProtectedRoute` and `AuthContext` role/redirect logic against a mocked `src/api.js`.
- **E2E**: `npm run test:e2e` (Playwright). `playwright.config.js` starts both the Express API (`npm run server`) and a static preview of the frontend (`vite preview`).
  - `smoke.spec.js` — public pages render (Login, Signup, Forgot Password) and unauthenticated visits to protected routes redirect to `/login`. No database needed.
  - `auth-flows.spec.js` — a real login → dashboard flow per role (HR, Manager, Intern), a failed-login error message, and a cross-role access check. Needs a migrated + seeded Postgres database reachable via `DATABASE_URL` (see "Demo data" below) and `JWT_SECRET`/`CORS_ORIGIN` set to match the Playwright ports (`CORS_ORIGIN=http://localhost:4173`).
- **CI**: `.github/workflows/ci.yml` runs lint, unit tests, and the build on every push/PR, plus a separate `e2e` job that spins up a Postgres service container, migrates and seeds it, then runs the full Playwright suite (needs `npx playwright install --with-deps chromium`, which downloads real browser binaries — this fails in network-restricted environments, which is why local Playwright runs may need `npx playwright install chromium` run somewhere with normal internet access first).

See `TESTING.md` for the full manual walkthrough by role.

## Demo data

`scripts/seed.js` connects directly to Postgres (via `DATABASE_URL`) and populates an HR user, two managers, ten interns, tasks, two weeks of attendance history, and a dozen applications:

```
npm run seed
```

All seeded accounts share the password `Password123!` (see the script's output for the exact email list). Pass `--wipe` to delete the previously-seeded demo rows before reseeding.

## Known gaps

- No real email delivery — invite/resend relies on a clipboard-copy workaround (HR pastes the instructions into an email/Slack message themselves), and password-reset links are logged to the server console instead of emailed (see `server/routes/auth.js`). Wiring in a real provider (e.g. SES, Postmark) is a small, isolated change.
- No refresh-token rotation — sessions are an 8h JWT; once it expires the user simply has to log in again. Fine for this app's low sensitivity and small user base, but worth hardening before a larger/higher-stakes deployment.
- Bulk actions (HR → Applications, HR → All Interns) issue one API request per selected record via `Promise.allSettled`, not a single batched call — fine at this app's scale.
- A deactivated user (`active = false`) is locked out at the API level (every authenticated request gets 403) but the frontend doesn't specifically detect this and show a clear "your account was deactivated" message — they'll just see load-failure toasts.
