# Project Cleanup Checklist

This is the prioritized list of work needed to turn the app into a more complete, maintainable project.

## P0 — Must Fix

- [ ] Define the Firestore data model for `users`, `tasks`, `attendance`, and `applications`
  - Decide required fields, optional fields, and ownership rules for each role.
- [ ] Add Firestore security rules
  - Lock reads/writes by role so HR, managers, and interns only access what they should.
- [ ] Replace the remaining placeholder `Reports` screen
  - Build a real HR reports page or remove the nav item until it exists.
- [ ] Add shared error handling for Firestore writes
  - Show user-friendly messages for failed saves, permission errors, and missing data.

## P1 — High Priority

- [ ] Extract shared theme tokens
  - Move repeated colors, spacing, and card styles into one shared theme file.
- [ ] Add validation to all forms
  - Require important fields, prevent invalid dates, and block incomplete submissions.
- [ ] Add empty states and retry states
  - Make each page graceful when there is no data or the network fails.
- [ ] Add pagination or collection limits
  - Avoid loading entire collections at once on large datasets.
- [ ] Document setup in `README.md`
  - Include env vars, role setup, Firestore structure, and seed data instructions.

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
