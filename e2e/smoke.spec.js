import { test, expect } from "@playwright/test";

// These smoke tests only cover pages/flows that work without a real signed-in
// Firebase user (there's no emulator or seeded test account wired into CI).
// They catch the class of bug that would white-screen every visitor: a
// build/route/render regression on the public pages, and the auth gate
// actually gating. Full login -> dashboard coverage per role would need
// seeded Firebase Auth test accounts (see scripts/seed.js) and either the
// Firebase emulator or credentials injected into CI — deliberately out of
// scope here.

test("root redirects to /login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "InternHub" })).toBeVisible();
});

test("login page renders the sign-in form", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByPlaceholder("you@company.com")).toBeVisible();
  await expect(page.getByPlaceholder("••••••••")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Forgot password?" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create an account" })).toBeVisible();
});

test("signup page renders and requires an invite message on empty invite", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "InternHub" })).toBeVisible();
  await expect(page.getByText("Create your account (invite required)")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create Account" })).toBeVisible();
});

test("forgot password page renders", async ({ page }) => {
  await page.goto("/forgot-password");
  await expect(page.getByText("Reset your password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send Reset Link" })).toBeVisible();
});

for (const path of [
  "/hr/dashboard",
  "/manager/dashboard",
  "/intern/dashboard",
  "/hr/invites",
  "/hr/activity",
]) {
  test(`unauthenticated visitor to ${path} is redirected to /login`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  });
}
