# Project Cleanup Checklist

This is the prioritized list of work needed to turn the app into a more complete, maintainable project.

## P0 — Must Fix

- [x] Define the Firestore data model for `users`, `tasks`, `attendance`, and `applications`
  - Documented in `README.md` (fields, ownership, who can write what).
- [x] Add Firestore security rules
  - Added `firestore.rules` (+ `firebase.json`, `firestore.indexes.json`). **Not deployed automatically — see README "Deploying Firestore security rules". Until deployed, the app has no real access control.**
- [x] Replace the remaining placeholder `Reports` screen
  - `src/pages/hr/HRReports.jsx` — recruitment pipeline funnel, task breakdown, onboarding progress, and 7-day attendance, computed from the same collections other HR pages already read.
- [x] Add shared error handling for Firestore writes
  - Added `src/utils/toast.js` + `src/components/Toaster.jsx`; wired into every Firestore write and read listener across HR/Manager/Intern pages.

## P1 — High Priority

- [x] Extract shared theme tokens
  - Added `src/theme.js` (dark blue/slate palette: primary, success, warning, danger, bg, surface, border, text). All page-level `styles` objects now import it instead of hardcoding hex; a handful of one-off accent shades were left as-is deliberately.
- [x] Add validation to all forms
  - Every form that writes to Firestore now validates: Login/Signup (email format, password length/match), HRInvites (name/email required, email regex), ManagerTasks and ManagerDashboard's task forms (title + assigned intern required, due date can't be in the past on create). Reviewed every remaining `<input>`/`<select>`/`<textarea>` in the app (search boxes, status dropdowns, optional comments) — the rest don't need validation since they're either constrained to a fixed option set or intentionally optional free text.
- [x] Add empty states and retry states
  - Firestore listeners now surface load failures via toast instead of failing silently.
- [x] Add pagination or collection limits
  - Added `src/hooks/usePaginatedCollection.js` (Firestore `limit()` + "Load more"). Applied to the four HR list pages that previously loaded a full collection with no bound: Applications, All Interns, Onboarding, Attendance. `HRPipeline`'s board view and manager-scoped pages were left as full fetches — they're already bounded by a `where` clause or a small dataset.
- [x] Document setup in `README.md`
  - Env vars, Firestore data model, rules deployment, and known gaps documented.

## P2 — Important Polish

- [x] Add tests for auth and routing
  - `vitest` + Testing Library. `ProtectedRoute.test.jsx` covers the three redirect/access outcomes; `AuthContext.test.jsx` covers role resolution, signed-out state, and a missing `users/{uid}` doc. Run with `npm test`.
- [x] Split large pages into smaller components
  - Extracted the modal/list-item/derived-stats pieces out of the four biggest pages into colocated `components/` and `hooks/` folders: `HRApplications` → `ApplicationDetailModal`; `ManagerTasks` → `TaskFormModal` + `TaskCard`; `ManagerDashboard` → `AssignTaskModal` + `InternProgressCard`; `InternAttendance` → `useAttendanceStats` hook + `WeekStrip` + `AttendanceHistoryList`; `InternOnboarding` → `useOnboardingChecklist` hook + `ChecklistStep`. Biggest page went from 429 lines to 237. Also added `src/components/StatsRow.jsx`, deduping the near-identical stat-card block that was copy-pasted into 14 pages.
- [x] Improve loading skeletons
  - Added `src/components/Skeleton.jsx` (`Skeleton`, `StatsRowSkeleton`, `ListSkeleton`, `PageSkeleton`) with a CSS pulse animation (`index.css`); every page's plain "Loading..." text now renders a layout-shaped skeleton instead.
- [x] Review bundle size
  - Routes are now `React.lazy`-loaded (`src/App.jsx`) behind one `Suspense` boundary, so each page ships as its own chunk instead of one ~700KB bundle. The remaining ~590KB entry chunk is mostly the Firebase SDK; further reduction would mean swapping SDKs, not app code.

## Color / UI Review

- [x] Keep the current dark blue/slate direction
  - Unchanged — `src/theme.js` codifies the existing palette rather than replacing it. It's still the default.
- [x] Standardize it into tokens
  - `src/theme.js` exports primary, success, warning, danger, bg, surface, border, and text.
- [x] Reduce hardcoded colors in pages
  - Mechanically replaced the repeated hex literals across every page with `theme.*` references. (Hit and fixed a Perl string-interpolation bug along the way — `${theme.border}` inside a Perl double-quoted replacement string got silently evaluated as a Perl variable and emptied out in ~9 files; caught by rebuilding after the sweep, not just trusting the diff.)
- [x] Full light/dark mode
  - The structural tokens (`bg`/`surface`/`surfaceAlt`/`border`/`text`/`muted`/`faint`) now resolve to CSS custom properties (`index.css`, `:root` vs `:root[data-theme="light"]`) instead of hardcoded hex, so the whole app — not just the sidebar chrome — repaints on toggle. Accent/semantic colors (primary, success, warning, danger, info, and status-badge backgrounds) intentionally stay constant across both themes, same as a brand color would. Added `src/contexts/ThemeContext.jsx` (persists to `localStorage`, defaults to system `prefers-color-scheme`) and wired `Layout`'s existing 🌙/☀️ button to it, replacing the old setup where the toggle only changed the sidebar/topbar and page content stayed dark regardless.

## Account & Access (added after the original list)

- [x] In-app account provisioning
  - Added an invite flow: **HR → Invites** writes an `invites/{email}` doc; the invitee signs up at `/signup` and self-provisions their own `users/{uid}` doc, which `firestore.rules` only allows when a matching invite exists. No more manual Firebase-console account creation.
- [x] Password reset
  - Added `/forgot-password` (`src/pages/auth/ForgotPassword.jsx`) using Firebase Auth's `sendPasswordResetEmail`. Linked from the login page. Deliberately shows the same "check your inbox" message whether or not the email has an account, to avoid leaking which emails are registered.
- [x] Resend invite
  - **HR → Invites** now has a "Resend" button per pending invite: it bumps `invitedAt`/`invitedBy`/`expiresAt` on the existing invite doc and copies ready-to-send sign-up instructions to the clipboard (there's no email backend, so HR pastes them into an email/Slack message themselves). Each row also shows "Invited Xm/h/d ago" so stale invites are easy to spot.
- [x] Invite expiry
  - Invites now carry `expiresAt` (7 days from send/resend). Enforced in `firestore.rules` (`hasMatchingInvite()` checks `expiresAt > request.time`), not just hidden in the UI — a leaked invite email stops working on its own after a week. `Signup.jsx` checks expiry client-side too and cleans up the orphaned Firebase Auth account if the invite has lapsed.
- [x] Audit log
  - Added `activityLog` collection (HR-only read/create, rules block update/delete entirely) and `src/utils/activityLog.js`. Logs manager reassignment (`HRInterns`), application status changes (`HRApplications`), and invite send/resend/cancel (`HRInvites`). Viewable at **HR → Activity Log** (`src/pages/hr/HRActivityLog.jsx`).
- [x] Bulk actions
  - **HR → Applications**: select multiple, bulk shortlist/reject. **HR → All Interns**: select multiple, bulk-assign (or unassign) a manager. Both use `Promise.allSettled` and report partial failures rather than silently dropping them.
- [x] Manager reassignment guardrail
  - `firestore.rules` now rejects any HR write to `users/{uid}.managerId` unless it's `null` or points to a user that still has `role == "manager"` — closes the gap where a manager's role changes (or the doc is deleted) but interns still point at them. `HRInterns` also flags existing interns whose `managerId` no longer resolves to an active manager ("Assigned manager no longer has manager access").
- [ ] Real email delivery
  - Deliberately skipped — needs a Blaze-plan Cloud Function plus a mail provider (SendGrid/Resend) and its API key, which requires an account/billing decision only the project owner can make. Invites and password resets both work today; invites just require HR to paste the copied text somewhere instead of it being emailed automatically.
- [x] Rate-limit messaging
  - Login, Signup, and Forgot Password all now show a specific "Too many attempts, wait a few minutes" message for Firebase Auth's `auth/too-many-requests` instead of a generic error — Firebase Auth already throttles repeated attempts server-side; this just surfaces it clearly instead of confusing users with "something went wrong."

## Product & Ops (round 3)

- [x] Intern self-service profile edit
  - **Onboarding → Your Details → Edit** lets an intern update their own `name`/`department`. `firestore.rules` widened the self-update allowlist accordingly (still can't touch `role`, `managerId`, or `active`). No avatar upload — no Storage rules/bucket set up for it.
- [x] Task comments
  - New `tasks/{taskId}/comments` subcollection (immutable, no update/delete) and `src/components/TaskComments.jsx`, wired into both the manager's `TaskCard` and the intern's `InternTaskItem` behind a "Comments" toggle.
- [x] Cohort/department views
  - **HR → All Interns** now has department and cohort filter dropdowns (derived from the currently-loaded roster) plus a "Clear filters" button.
- [x] Manager weekly digest
  - New `WeeklyDigest` card at the top of the Manager Dashboard: overdue tasks, tasks due within 7 days, and attendance flags (absences or a missing check-in today) across the manager's team — computed client-side from data the dashboard already loads.
- [x] Soft-delete for users
  - Added `active` (boolean, defaults true) to `users`. HR toggles Deactivate/Reactivate from **HR → All Interns** (both the intern roster and a new Managers list on the same page) instead of hard-deleting. `firestore.rules`' `isHR()`/`isManager()`/`isIntern()` helpers now also require `active != false`, so a deactivated account loses read/write access everywhere except its own `users/{uid}` doc — existing tasks/attendance/activityLog rows stay intact and resolvable instead of pointing at a vanished user.
- [x] Export (CSV)
  - Added `src/utils/csv.js` and "Export CSV" buttons on HR → Applications (loaded rows), HR → Attendance (loaded rows), and HR → Reports (the aggregate summary numbers).
- [x] Seed/demo data script
  - `scripts/seed.js` (Node + `firebase-admin`) creates an HR user, two managers, ten interns, tasks, two weeks of attendance, and a dozen applications. Requires a Firebase service-account key (documented in README "Demo data") — this session has no admin credentials for the project, so the script is written and documented but not run.
- [x] CI
  - `.github/workflows/ci.yml`: lint + unit tests + build on every push/PR, plus a separate Playwright job.
- [x] E2E smoke test
  - Playwright (`e2e/smoke.spec.js`): public pages render, unauthenticated visits to 5 protected routes redirect to `/login`. Browser binary download is blocked in this sandbox's network, so these are written and reviewed but not executed here — CI (open network) runs them for real. Does not cover an authenticated login → dashboard flow per role; that needs seeded test accounts plus the Firebase emulator or CI credentials (documented as a known gap).
- [x] Error boundary
  - `src/components/ErrorBoundary.jsx` wraps the whole app in `main.jsx` (outside `AuthProvider`, so an auth-init crash is caught too) — a JS error in any one page now shows a "reload" screen instead of a blank white page.
- [ ] Real email delivery
  - Still deliberately skipped (owner's call, round 2) — needs a Blaze-plan Cloud Function, a mail provider, and API keys.

## Notes

- `src/index.css` had unused Vite-template CSS (`#root` capped at 1126px, centered, bordered) that fought the app's actual full-height sidebar layout — removed along with the dead `App.css` and unused template assets (`react.svg`, `vite.svg`, `hero.png`).
- Everything on this list is done except real email delivery, which needs an owner decision on billing/mail provider before it can be built, and true authenticated E2E coverage, which needs seeded test accounts and either the Firebase emulator or CI credentials. Future work should get its own tracking rather than reusing this file.
