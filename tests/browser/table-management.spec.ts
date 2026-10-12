import { test, expect } from "@playwright/test";

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
