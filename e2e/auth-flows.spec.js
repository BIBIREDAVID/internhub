import { test, expect } from "@playwright/test";

// Exercises a real login -> dashboard flow per role against a live API and
// Postgres database, seeded via `npm run seed` (see scripts/seed.js). Needs
// DATABASE_URL/JWT_SECRET/CORS_ORIGIN set and the schema migrated + seeded
// before running — see .github/workflows/ci.yml's `e2e` job, or run locally:
//
//   DATABASE_URL=postgres://user:pass@localhost:5432/internhub npm run db:migrate
//   DATABASE_URL=postgres://user:pass@localhost:5432/internhub npm run seed
//   DATABASE_URL=... JWT_SECRET=... CORS_ORIGIN=http://localhost:4173 npm run test:e2e

const DEMO_PASSWORD = "Password123!";

async function login(page, email) {
  await page.goto("/login");
  await page.getByPlaceholder("you@company.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
}

test("HR logs in and lands on the HR dashboard", async ({ page }) => {
  await login(page, "hr.jordan@example.com");
  await expect(page).toHaveURL(/\/hr\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("Manager logs in and lands on the manager dashboard", async ({ page }) => {
  await login(page, "manager.priya@example.com");
  await expect(page).toHaveURL(/\/manager\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("Intern logs in and lands on the intern dashboard", async ({ page }) => {
  await login(page, "intern1@example.com");
  await expect(page).toHaveURL(/\/intern\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("wrong password shows an error and stays on /login", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("you@company.com").fill("hr.jordan@example.com");
  await page.getByPlaceholder("••••••••").fill("wrong-password");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText("Invalid email or password.")).toBeVisible();
});

test("a signed-in intern cannot reach an HR-only route", async ({ page }) => {
  await login(page, "intern1@example.com");
  await expect(page).toHaveURL(/\/intern\/dashboard$/);
  await page.goto("/hr/invites");
  await expect(page).toHaveURL(/\/login$/);
});
