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
- [ ] Add validation to all forms
  - Manager task form now requires a title and an assigned intern; other forms still need review.
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
  - Unchanged — `src/theme.js` codifies the existing palette rather than replacing it.
- [x] Standardize it into tokens
  - `src/theme.js` exports primary, success, warning, danger, bg, surface, border, and text.
- [x] Reduce hardcoded colors in pages
  - Mechanically replaced the repeated hex literals across every page with `theme.*` references.

- [x] In-app account provisioning
  - Added an invite flow: **HR → Invites** writes an `invites/{email}` doc; the invitee signs up at `/signup` and self-provisions their own `users/{uid}` doc, which `firestore.rules` only allows when a matching invite exists. No more manual Firebase-console account creation.

## Remaining work

- Form validation beyond the manager task form and the invite form hasn't been fully reviewed.
- No password-reset / resend-invite flow yet.
- `src/index.css` had unused Vite-template CSS (`#root` capped at 1126px, centered, bordered) that fought the app's actual full-height sidebar layout — removed along with the dead `App.css` and unused template assets (`react.svg`, `vite.svg`, `hero.png`). Worth a visual smoke-test after this change since no one may have noticed the constraint before.
