import { test, expect } from "@playwright/test";

const tenant = {
  id: "11111111-1111-1111-1111-111111111111", name: "Test Store", slug: "test-store",
  schemaName: "tenant_test", status: "Active", isActive: true, ownerName: "Owner",
  ownerEmail: "owner@example.com", ownerMobile: "9000000001", stateCode: "23",
  gstin: null, address: "Old address", rejectionReason: null, createdAt: "2026-10-01T00:00:00Z",
};
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("auth_token", "fixture");
    localStorage.setItem("auth_session", JSON.stringify({ token: "fixture", isProductOwner: true,
      user: { username: "admin", isProductOwner: true, roles: ["ProductOwner"], permissions: ["Tenants.Manage"] } }));
  });
});

test("profile editor loads current values and refreshes the directory after saving", async ({ page }) => {
  let store = { ...tenant }; let update: unknown;
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/profile") && route.request().method() === "PUT") {
      update = route.request().postDataJSON(); store = { ...store, ...(update as typeof store) };
      await route.fulfill({ json: { message: "Saved" } });
    } else await route.fulfill({ json: path.endsWith("/admin/tenants") ? [store] : [] });
  });
  await page.goto("/admin/tenants");
  await page.getByTitle("Edit tenant profile", { exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Owner email", { exact: true })).toHaveValue("owner@example.com");
  await dialog.getByLabel("Store name", { exact: true }).fill("Updated Store");
  await dialog.getByLabel("Owner email", { exact: true }).fill("updated@example.com");
  await dialog.getByRole("button", { name: "Save profile" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("row").filter({ hasText: "Updated Store" })).toContainText("updated@example.com");
  expect(update).toMatchObject({ name: "Updated Store", ownerEmail: "updated@example.com" });
});

test("password reset validates confirmation and never loads a password", async ({ page }) => {
  let writes = 0; let request: unknown;
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/owner-password")) {
      writes++; request = route.request().postDataJSON(); await route.fulfill({ json: { message: "Reset" } });
    } else await route.fulfill({ json: path.endsWith("/admin/tenants") ? [tenant] : [] });
  });
  await page.goto("/admin/tenants");
  await page.getByTitle("Reset owner password", { exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("New password", { exact: true })).toHaveValue("");
  await dialog.getByLabel("New password", { exact: true }).fill("Changed@123456");
  await dialog.getByLabel("Confirm password", { exact: true }).fill("Mismatch@123456");
  await dialog.getByRole("button", { name: "Reset password", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Passwords do not match"); expect(writes).toBe(0);
  await dialog.getByLabel("Confirm password", { exact: true }).fill("Changed@123456");
  await dialog.getByRole("button", { name: "Reset password", exact: true }).click();
  await expect(dialog).toHaveCount(0); expect(writes).toBe(1);
  expect(request).toEqual({ password: "Changed@123456" });
  await page.getByTitle("Reset owner password", { exact: true }).click();
  await expect(page.getByRole("dialog").getByLabel("New password", { exact: true })).toHaveValue("");
});

test("profile conflict remains visible without closing the editor", async ({ page }) => {
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    return path.endsWith("/profile") ? route.fulfill({ status: 409, json: { detail: "A tenant with this email already exists." } })
      : route.fulfill({ json: path.endsWith("/admin/tenants") ? [tenant] : [] });
  });
  await page.goto("/admin/tenants");
  await page.getByTitle("Edit tenant profile", { exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("email already exists");
  await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
