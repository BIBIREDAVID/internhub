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

- [ ] Add tests for auth and routing
  - Cover role-based redirects and key page access rules.
- [ ] Split large pages into smaller components
  - Reduce duplication in dashboard cards, tables, modals, and filters.
- [ ] Improve loading skeletons
  - Replace generic text loaders with layout-matching placeholders.
- [ ] Review bundle size
  - Add code-splitting for large routes if needed.

## Color / UI Review

- [x] Keep the current dark blue/slate direction
  - Unchanged — `src/theme.js` codifies the existing palette rather than replacing it.
- [x] Standardize it into tokens
  - `src/theme.js` exports primary, success, warning, danger, bg, surface, border, and text.
- [x] Reduce hardcoded colors in pages
  - Mechanically replaced the repeated hex literals across every page with `theme.*` references.

## Remaining work

- Tests for auth/routing, splitting large pages, loading skeletons, and bundle code-splitting (P2) are still open.
- Form validation beyond the manager task form hasn't been reviewed.
- No in-app account-provisioning flow (see README "Known gaps").
