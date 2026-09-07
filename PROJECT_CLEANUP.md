# Project Cleanup Checklist

This is the prioritized list of work needed to turn the app into a more complete, maintainable project.

## P0 — Must Fix

- [x] Define the Firestore data model for `users`, `tasks`, `attendance`, and `applications`
  - Documented in `README.md` (fields, ownership, who can write what).
- [x] Add Firestore security rules
  - Added `firestore.rules` (+ `firebase.json`, `firestore.indexes.json`). **Not deployed automatically — see README "Deploying Firestore security rules". Until deployed, the app has no real access control.**
- [ ] Replace the remaining placeholder `Reports` screen
  - Build a real HR reports page or remove the nav item until it exists.
- [x] Add shared error handling for Firestore writes
  - Added `src/utils/toast.js` + `src/components/Toaster.jsx`; wired into every Firestore write and read listener across HR/Manager/Intern pages.

## P1 — High Priority

- [ ] Extract shared theme tokens
  - Move repeated colors, spacing, and card styles into one shared theme file.
- [ ] Add validation to all forms
  - Manager task form now requires a title and an assigned intern; other forms still need review.
- [x] Add empty states and retry states
  - Firestore listeners now surface load failures via toast instead of failing silently.
- [ ] Add pagination or collection limits
  - Avoid loading entire collections at once on large datasets.
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

- [ ] Keep the current dark blue/slate direction
  - The palette is good and already feels professional.
- [ ] Standardize it into tokens
  - Use one primary, success, warning, danger, background, surface, border, and text set.
- [ ] Reduce hardcoded colors in pages
  - This will make the UI look more consistent and easier to maintain.

## Suggested Order

1. Firestore data model
2. Security rules
3. Replace Reports placeholder
4. Shared theme tokens
5. Validation and error handling
6. Empty states and pagination
7. Documentation and tests
8. Component cleanup and bundle tuning
