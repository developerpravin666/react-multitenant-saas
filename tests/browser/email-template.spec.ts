import { test, expect } from "@playwright/test";

test("admin can preview, save and reload the registration email format", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("auth_session", JSON.stringify({ token: "fixture", isProductOwner: true, user: { username: "admin" } }));
    localStorage.setItem("auth_token", "fixture");
  });
  let template = { subject: "Registration Received · {{StoreName}}", htmlBody: "<p>Thank you {{OwnerName}}</p>" };
  const defaults = { defaultSubject: template.subject, defaultHtmlBody: template.htmlBody, placeholders: ["StoreName", "OwnerName"] };
  let writes = 0;
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path.includes("/email-templates/store-registration")) {
      if (path.endsWith("/preview")) data = { subject: "Hello Siddhi", htmlBody: "<p>Welcome Store Owner</p>" };
      else if (route.request().method() === "PUT") { template = route.request().postDataJSON(); writes++; data = { message: "Saved" }; }
      else data = { ...template, ...defaults };
    } else if (path.endsWith("/accounting/access")) data = { isOwner: true, permissions: [] };
    return route.fulfill({ contentType: "application/json", body: JSON.stringify(data) });
  });
  await page.goto("/admin/system-settings");
  await page.getByLabel("Email Subject", { exact: true }).fill("Hello {{StoreName}}");
  await page.getByLabel("Email HTML Body").fill("<p>Welcome {{OwnerName}}</p>");
  await page.getByRole("button", { name: "Preview Email", exact: true }).click();
  await expect(page.frameLocator('iframe[title="Welcome email preview"]').getByText("Welcome Store Owner")).toBeVisible();
  expect(writes).toBe(0);
  await page.getByRole("button", { name: "Save Email Template" }).click();
  await expect.poll(() => writes).toBe(1);
  await page.reload();
  await expect(page.getByLabel("Email Subject", { exact: true })).toHaveValue("Hello {{StoreName}}");
  await page.getByRole("button", { name: "Load Default Format" }).click();
  await expect(page.getByLabel("Email Subject", { exact: true })).toHaveValue(defaults.defaultSubject);
  expect(writes).toBe(1);
});
