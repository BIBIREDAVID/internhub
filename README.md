# InternHub

A role-based intern management portal (HR / Manager / Intern) built with React, Vite, React Router, and Firebase (Auth + Firestore).

## Setup

1. Install dependencies:
   ```
   npm install
   ```
2. Copy `.env` and fill in your Firebase web app config (already present for this project — see Firebase console → Project settings → General → Your apps):
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
   `.env` is gitignored — never commit it. (Firebase web API keys are not secret by design, but access is only actually restricted by the security rules below, so treat rules — not the key — as the real boundary.)
3. Run the dev server:
   ```
   npm run dev
   ```

## Deploying

This repo includes `firestore.rules`, `firestore.indexes.json`, `firebase.json`, and `.firebaserc` (pinned to `internhub-217a6`). **The app has no server — every access-control decision that matters is enforced by the Firestore rules, not by the React code.** The `ProtectedRoute` component only hides UI; it does not stop a signed-in user from calling Firestore directly.

```
npm install -g firebase-tools   # once
firebase login
npm run build
firebase deploy --only firestore:rules   # security rules
firebase deploy --only hosting           # the built app (dist/)
```

Live at https://internhub-217a6.web.app. Whatever ruleset is currently deployed governs access — check the Firebase console (Firestore → Rules) if you're unsure what's live, and redeploy `firestore.rules` any time it changes; it is not applied automatically.

## Data model

All collections are top-level. Roles and ownership are enforced in `firestore.rules`.

### `users/{uid}`
Doc id = Firebase Auth UID.

| Field | Type | Notes |
|---|---|---|
| `role` | `"hr" \| "manager" \| "intern"` | Set by HR at provisioning time; immutable by the user themselves. |
| `name`, `department` | string | Editable by HR, or by the user themselves for their own doc (**Onboarding → Your Details → Edit** for interns). |
| `email` | string | |
| `managerId` | string (uid) | Interns only. Set by HR via **HR → All Interns**; rules reject pointing it at anyone but an active `role == "manager"` user. |
| `active` | boolean | Defaults to true when absent. HR deactivates instead of deleting (**HR → All Interns**, both the intern roster and the Managers list) — a deactivated user keeps their historical tasks/attendance/activityLog entries intact but loses read/write access everywhere except their own `users/{uid}` doc. |
| `onboardingChecklist` | array | Intern-owned; onboarding-specific fields an intern may write on their own doc besides `onboardingStep`. |
| `onboardingStep` | number | |

New accounts are provisioned through an invite, not directly: HR sends one from **HR → Invites**, which writes an `invites/{email}` doc; the invitee then signs up at `/signup` with that exact email, and the client self-provisions its own `users/{uid}` doc — allowed only because a matching invite exists (enforced in `firestore.rules`, not just the UI). See `invites` below.

### `tasks/{taskId}`
| Field | Type | Notes |
|---|---|---|
| `title`, `description`, `dueDate`, `priority` | string | Set by the assigning manager (or HR). |
| `status` | `"pending" \| "in-progress" \| "completed"` | Manager/HR can change any field; the assigned intern may only change `status`. |
| `internId` | string (uid) | Must belong to an intern managed by the creating manager. |
| `managerId` | string (uid) | Must equal the creator's uid (unless HR). |
| `createdAt`, `updatedAt` | ISO string | |

#### `tasks/{taskId}/comments/{commentId}`
Immutable comment thread (no update/delete in `firestore.rules`) visible to whoever can read the parent task — HR, the assigning manager, and the assigned intern. Shown via a "Comments" toggle on each task card/list item (`src/components/TaskComments.jsx`).

| Field | Type | Notes |
|---|---|---|
| `authorId`, `authorName`, `authorRole` | string | Set from the signed-in user; rules require `authorId == request.auth.uid`. |
| `text` | string | |
| `createdAt` | ISO string | |

### `attendance/{internId}_{yyyy-mm-dd}`
Doc id is deterministic (`internId_date`) so an intern can only ever have one record per day, and rules can verify the id matches the writer.

| Field | Type | Notes |
|---|---|---|
| `internId` | string (uid) | Owner; only that intern (or HR) can create the record. |
| `date` | `yyyy-mm-dd` | |
| `status` | `"present" \| "late" \| "absent"` | Intern sets on check-in; manager/HR may correct it. |
| `checkIn`, `checkOut` | ISO string \| null | |
| `note` | string | Intern-authored. |
| `managerComment`, `managerCommentUpdatedAt`, `reviewedByManagerAt` | | Manager/HR-authored only. |

### `applications/{applicationId}`
HR-only recruitment pipeline (`status`/`stage`, `reviewedAt`, `reviewedBy`, candidate fields). Nothing in this app writes new applications — they're expected to be seeded/imported by HR.

### `invites/{email}`
Doc id = lowercased email (not a uid — the account doesn't exist yet).

| Field | Type | Notes |
|---|---|---|
| `email`, `name`, `role` | string | What the new `users/{uid}` doc will get on signup. |
| `managerId` | string (uid) \| null | Optional; HR can also assign a manager later from **All Interns**. |
| `invitedBy` | string (uid) | The HR user who last sent/resent it. |
| `invitedAt` | ISO string | |
| `expiresAt` | Timestamp | 7 days from send/resend. Enforced in `firestore.rules` — signup fails once passed, not just hidden in the UI. |

Only HR can create/update invites. The signup page reads the invite matching the signed-in user's own email (rules restrict that read to HR or the matching email), checks it hasn't expired, and deletes it once redeemed. If no invite exists (or it's expired) for the email someone tries to sign up with, the just-created Firebase Auth account is deleted immediately and they're shown an error — there's no way to self-register without a live invite. **HR → Invites** shows "Expires in N days" per pending invite and a "Resend" action that extends it another 7 days and copies sign-up instructions to the clipboard (there's no email backend, so HR pastes them into an email/Slack message themselves).

### `activityLog/{entryId}`
Append-only audit trail, HR-only (read and create; `firestore.rules` blocks update/delete entirely). Written via `src/utils/activityLog.js` whenever HR reassigns a manager, changes an application's status, or sends/resends/cancels an invite. Viewable at **HR → Activity Log**.

| Field | Type | Notes |
|---|---|---|
| `action` | string | e.g. `reassign_manager`, `application_status_change`, `invite_sent` |
| `actorId`, `actorEmail` | string | The HR user who performed it. |
| `targetType`, `targetId` | string | What was acted on. |
| `details` | object | Action-specific context (e.g. old/new manager name). |
| `createdAt` | ISO string | |

## Testing

- **Unit/component**: `npm test` (Vitest + Testing Library). Covers `ProtectedRoute` and `AuthContext` role/redirect logic.
- **E2E smoke**: `npm run test:e2e` (Playwright). Builds and serves `dist/` via `vite preview`, then checks the public pages render (Login, Signup, Forgot Password) and that unauthenticated visits to protected routes redirect to `/login`. It does **not** cover a real login → dashboard flow for any role — that needs seeded Firebase Auth test accounts (see "Demo data" below) plus either the Firebase emulator or credentials injected into CI, which isn't wired up yet.
- **CI**: `.github/workflows/ci.yml` runs lint, unit tests, and the build on every push/PR, plus the Playwright suite in a separate job (needs `npx playwright install --with-deps chromium`, which downloads real browser binaries — this fails in network-restricted environments, which is why local Playwright runs may need `npx playwright install chromium` run somewhere with normal internet access first).

## Demo data

`scripts/seed.js` (Node, uses `firebase-admin`) populates the project with an HR user, two managers, ten interns, tasks, two weeks of attendance history, and a dozen applications — useful for trying the app out without manually sending invites one at a time.

1. Firebase console → Project settings → Service accounts → **Generate new private key**. Save the JSON somewhere outside the repo (never commit it — `.gitignore` blocks `*serviceAccount*.json` / `*service-account*.json` as a safety net, but don't rely on the filename matching).
2. Run:
   ```
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json npm run seed
   ```
3. All seeded accounts share the password `Password123!` (see the script's output for the exact email list). Sign in at `/login`.

Pass `--wipe` to delete the previously-seeded demo accounts (matched by email) before reseeding. This is a local dev tool only — it uses the Admin SDK to bypass the invite flow entirely, which is exactly what `firestore.rules` exists to prevent from the client, so never run it against a database with real user data you care about without checking `--wipe`'s effect first.

## Known gaps

- No real email delivery — invite/resend and password-reset both rely on Firebase's own transactional emails (password reset) or a clipboard-copy workaround (invites), since automated invite email would need a Cloud Function + paid plan + mail provider.
- Bulk actions (HR → Applications, HR → All Interns) update each selected record with a separate write via `Promise.allSettled`, not a single Firestore batch — fine at this app's scale, but a batch write would be more efficient past a few hundred records.
- No true E2E coverage of an authenticated flow (see "Testing" above) — would need seeded test accounts plus the Firebase emulator or CI credentials.
- A deactivated user (`active: false`) is locked out at the rules level (reads/writes to anything but their own `users/{uid}` doc fail) but the UI doesn't detect this and show a clear "your account was deactivated" message — they'll just see load-failure toasts.
