import { test, expect } from "@playwright/test";

test("admin clears a master table only after typing its exact name", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1200 });
  await page.addInitScript(() => {
    localStorage.setItem("auth_session", JSON.stringify({ token: "fixture", isProductOwner: true, user: { username: "admin" } }));
    localStorage.setItem("auth_token", "fixture");
  });
  const requests: { schema: string | null; body: unknown }[] = [];
  await page.route("**/api/**", route => {
    const url = new URL(route.request().url());
    let data: unknown = [];
    if (url.pathname.endsWith("/demo_catalog/clear") || url.pathname.endsWith("/clear-all-data") || url.pathname.endsWith("/clear-selected") || url.pathname.includes("/restore/")) {
      requests.push({ schema: url.searchParams.get("schema"), body: route.request().postDataJSON() });
      data = { rowCount: 0, operationId: "11111111-1111-1111-1111-111111111111" };
    } else if (url.pathname.endsWith("/admin/tables")) data = {
      activeSchema: "tenant_demo", availableSchemas: ["tenant_demo"], totalTables: 1, masterTables: 1, dataTables: 0, totalDataRecords: 0,
      tables: [{ id: "master", schemaName: "tenant_demo", tableName: "demo_catalog", displayName: "Demo Catalog", tableType: "Master", category: "General", description: "", isSystem: false, rowCount: 2, createdAt: "2026-10-12" }],
    };
    else if (url.pathname.endsWith("/accounting/access")) data = { isOwner: true, permissions: [] };
    return route.fulfill({ contentType: "application/json", body: JSON.stringify(data) });
  });
  await page.goto("/admin/database-tables");
  await page.getByRole("button", { name: "Clear Data", exact: true }).click();
  const confirm = page.getByRole("button", { name: "Yes, Clear Table Data" });
  await expect(confirm).toBeDisabled();
  await page.getByLabel("Type the exact table name to confirm").fill("wrong_table");
  await expect(confirm).toBeDisabled();
  expect(requests).toHaveLength(0);
  await page.getByLabel("Type the exact table name to confirm").fill("demo_catalog");
  await confirm.click();
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0]).toEqual({ schema: "tenant_demo", body: { confirmTableName: "demo_catalog" } });
  await expect(page.getByRole("heading", { name: "Clear Master Table?" })).toHaveCount(0);
  await page.getByRole("button", { name: "Clear All Tables", exact: true }).click();
  const clearAll = page.getByRole("button", { name: "Confirm Wiping All Tables" });
  await expect(clearAll).toBeDisabled();
  await page.getByPlaceholder("CLEAR ALL TABLES").fill("CLEAR ALL TABLES");
  await clearAll.click();
  await expect.poll(() => requests.length).toBe(2);
  expect(requests[1]).toEqual({ schema: "tenant_demo", body: { confirmation: "CLEAR ALL TABLES" } });
  await expect(page.getByRole("button", { name: "Confirm Wiping All Tables" })).toHaveCount(0);
  await page.getByLabel("Select demo_catalog", { exact: true }).check();
  await page.getByRole("button", { name: "Clear Selected (1)" }).click();
  await expect(page.getByRole("button", { name: "Confirm Clear Selected" })).toBeDisabled();
  await page.getByLabel("Maintenance confirmation").fill("CLEAR SELECTED TABLES");
  await page.getByRole("button", { name: "Confirm Clear Selected" }).click();
  await expect.poll(() => requests.length).toBe(3);
  expect(requests[2]).toEqual({ schema: "tenant_demo", body: { tables: ["demo_catalog"], confirmation: "CLEAR SELECTED TABLES" } });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "Revert Last Clear" }).click();
  await expect(page.getByRole("button", { name: "Confirm Restore" })).toBeDisabled();
  await page.getByLabel("Maintenance confirmation").fill("RESTORE DATA");
  await page.getByRole("button", { name: "Confirm Restore" }).click();
  await expect.poll(() => requests.length).toBe(4);
  await expect(page.getByRole("button", { name: "Revert Last Clear" })).toBeDisabled();
});

for (const admin of [false, true]) {
  for (const path of ["/settings/database-tables", "/admin/database-tables"]) {
    test(`${admin ? "admin" : "tenant"} table access at ${path}`, async ({ page }) => {
      await page.addInitScript((admin) => {
        localStorage.setItem("auth_session", JSON.stringify({
          token: "fixture", tenantId: admin ? "00000000-0000-0000-0000-000000000000" : "tenant-fixture",
          isProductOwner: admin, user: { username: admin ? "admin" : "owner", isProductOwner: admin },
        }));
        localStorage.setItem("auth_token", "fixture");
      }, admin);
      let tableRequests = 0;
      await page.route("**/api/**", route => {
        const apiPath = new URL(route.request().url()).pathname;
        let data: unknown = [];
        if (apiPath.endsWith("/admin/tables")) {
          tableRequests++;
          data = { activeSchema: "tenant", availableSchemas: ["tenant"], totalTables: 0, masterTables: 0, dataTables: 0, totalDataRecords: 0, tables: [] };
        } else if (apiPath.endsWith("/accounting/access")) data = { isOwner: true, permissions: [] };
        return route.fulfill({ contentType: "application/json", body: JSON.stringify(data) });
      });
      await page.goto(path);
      if (admin) {
        await expect(page.getByRole("heading", { name: "Database Tables & Classification" })).toBeVisible();
        await expect(page.getByRole("navigation").getByRole("link", { name: "Table Management" })).toBeVisible();
        await expect(page.getByRole("navigation").getByRole("link", { name: "Feature Flags" })).toBeVisible();
        expect(tableRequests).toBeGreaterThan(0);
      } else {
        await expect(page.getByRole("alert").filter({ hasText: "Table Management is available only to admin accounts." })).toBeVisible();
        await expect(page.getByRole("navigation").getByRole("link", { name: /Database Tables|Table Management/ })).toHaveCount(0);
        expect(tableRequests).toBe(0);
      }
    });
  }
}
