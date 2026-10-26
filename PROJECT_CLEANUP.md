# Project Cleanup Checklist

This is the prioritized list of work needed to turn the app into a more complete, maintainable project.

## Open items

- [ ] Real email delivery
  - Deliberately skipped — needs a mail provider (e.g. SES, Postmark) and an API key, which requires an account/billing decision only the project owner can make. Invites and password resets both work today without it: invites copy sign-up instructions to the clipboard for HR to paste elsewhere, and reset links are logged to the server console (see README "Known gaps"). A small, isolated change once a provider is chosen.
- [x] True authenticated E2E coverage
  - Added `e2e/auth-flows.spec.js`: real login → dashboard per role (HR/Manager/Intern), a failed-login error case, and a cross-role access check. `playwright.config.js` now starts both the API (`npm run server`) and the frontend preview as Playwright's `webServer`. CI's `e2e` job (`.github/workflows/ci.yml`) spins up a Postgres service container, runs `npm run db:migrate` + `npm run seed`, then the full suite. Not runnable in this sandbox (no local Postgres/Docker) — written and reviewed, first real run happens in CI.
