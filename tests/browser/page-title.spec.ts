import { test, expect } from "@playwright/test";

test("browser titles follow public routes, redirects and browser history", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle("Sign In | Siddhi");
  await page.goto("/forgot-password");
  await expect(page).toHaveTitle("Forgot Password | Siddhi");
  await page.goBack();
  await expect(page).toHaveTitle("Sign In | Siddhi");
  await page.goForward();
  await expect(page).toHaveTitle("Forgot Password | Siddhi");
  await page.goto("/admin/login");
  await expect(page).toHaveTitle("Administrator Sign In | Siddhi");
  await page.goto("/register?source=test");
  await expect(page).toHaveTitle("Register Business | Siddhi");
  await page.goto("/unknown-route");
  await expect(page).toHaveTitle("Page Not Found | Siddhi");
});
