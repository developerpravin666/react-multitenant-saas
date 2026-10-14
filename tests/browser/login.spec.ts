import { test, expect } from "@playwright/test";

for (const identifier of ["OWNER@example.com", "9000000001"]) {
  test(`email/mobile login resolves the tenant: ${identifier}`, async ({ page }) => {
    let request: Record<string, unknown> | undefined;
    await page.route("**/api/**", async route => {
      if (new URL(route.request().url()).pathname.endsWith("/auth/login")) {
        request = route.request().postDataJSON();
        await route.fulfill({ json: {
          accessToken: "fixture", refreshToken: "refresh", tenantId: "store-id",
          tenantName: "Resolved Store", tenantSlug: "resolved-store", userName: "owner",
        } });
      } else await route.fulfill({ json: [] });
    });
    await page.goto("/login");
    await expect(page.getByRole("textbox", { name: "Tenant slug", exact: true })).toHaveCount(0);
    await page.getByLabel("Email or mobile").fill(identifier);
    await page.getByRole("textbox", { name: "Password", exact: true }).fill("password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect.poll(() => request).toEqual({ username: identifier, password: "password" });
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("auth_session") ?? "null"))).toMatchObject({
      tenantId: "store-id", user: { username: "owner", tenantName: "Resolved Store", tenantSlug: "resolved-store" },
    });
  });
}

test("legacy slug login remains available and requires its slug", async ({ page }) => {
  let request: unknown;
  await page.route("**/api/**", async route => {
    if (new URL(route.request().url()).pathname.endsWith("/auth/login")) {
      request = route.request().postDataJSON();
      await route.fulfill({ status: 401, json: { detail: "Invalid tenant, username, or password." } });
    } else await route.fulfill({ json: [] });
  });
  await page.goto("/login");
  await page.getByRole("button", { name: "Use tenant slug and username" }).click();
  await page.getByRole("textbox", { name: "Username", exact: true }).fill("legacy-user");
  await page.getByRole("textbox", { name: "Password", exact: true }).fill("password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("Tenant slug is required.", { exact: true })).toBeVisible();
  expect(request).toBeUndefined();
  await page.getByRole("textbox", { name: "Tenant slug", exact: true }).fill("legacy-store");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect.poll(() => request).toEqual({ tenantSlug: "legacy-store", username: "legacy-user", password: "password" });
  await expect(page.getByRole("alert")).toContainText("Invalid tenant");
});

test("ambiguous login keeps the user signed out and offers slug login", async ({ page }) => {
  await page.route("**/api/**", route => route.fulfill({ status: 401, json: {
    detail: "Unable to sign in automatically. Use your tenant slug, username and password.",
  } }));
  await page.goto("/login");
  await page.getByLabel("Email or mobile").fill("shared@example.com");
  await page.getByRole("textbox", { name: "Password", exact: true }).fill("password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Use your tenant slug");
  expect(await page.evaluate(() => localStorage.getItem("auth_session"))).toBeNull();
  await page.getByRole("button", { name: "Use tenant slug and username" }).click();
  await expect(page.getByRole("textbox", { name: "Tenant slug", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Use email or mobile instead" }).click();
  await expect(page.getByLabel("Email or mobile")).toBeVisible();
});
