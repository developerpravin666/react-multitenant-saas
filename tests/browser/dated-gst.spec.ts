import { test, expect } from "@playwright/test";

const profileId = "11111111-1111-1111-1111-111111111111";
const rates = [
  { id: profileId, profileId, name: "Fixture GST", effectiveFrom: "2026-01-01", treatment: "Taxable", cgst: 9, sgst: 9, totalTax: 18, isActive: true },
  { id: "22222222-2222-2222-2222-222222222222", profileId, name: "Fixture GST", effectiveFrom: "2026-11-01", treatment: "Taxable", cgst: 5, sgst: 5, totalTax: 10, isActive: true },
];

test("purchase rate preview follows the date and the saved profile, with no first-rate fallback", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(async (rates) => {
    const paths = ["/node_modules/.vite/deps/react.js", "/node_modules/.vite/deps/react-dom_client.js", "/src/features/dynamic-form/DynamicForm.tsx", "/src/features/purchase/product/config/product.form.ts"];
    const [rm, dm, form, config] = await Promise.all(paths.map(path => import(/* @vite-ignore */ path)));
    const React = rm.default ?? rm; const { createRoot } = dm.default ?? dm;
    const app = document.getElementById("root"); if (app) app.style.display = "none";
    const host = document.createElement("div"); document.body.append(host);
    const fields = config.createProductFormConfig({ vendors: [], brands: [], productTypes: [{ id: "phone", name: "Phone", defaultTaxId: rates[0].profileId }], models: [], variants: [], colors: [], taxes: rates })
      .filter((f: { name: string }) => ["purchaseDate", "taxId", "cgst", "sgst"].includes(f.name));
    createRoot(host).render(React.createElement(form.DynamicForm, { fields, title: "Dated purchase fixture", initialValues: { productTypeId: "phone", purchaseDate: "2026-10-31" }, onSubmit: () => {} }));
  }, rates);
  await expect(page.getByLabel("CGST (%)", { exact: true })).toHaveValue("9");
  await expect(page.getByLabel("CGST (%)", { exact: true })).toHaveAttribute("readonly", "");
  await page.getByLabel("Vendor Invoice Date", { exact: false }).fill("2026-11-01");
  await expect(page.getByLabel("CGST (%)", { exact: true })).toHaveValue("5");
  await expect(page.getByLabel("SGST (%)", { exact: true })).toHaveValue("5");
  await page.getByLabel("Vendor Invoice Date", { exact: false }).fill("2026-10-31");
  await expect(page.getByLabel("CGST (%)", { exact: true })).toHaveValue("9");
});

test("tax maintenance schedules a new version under the existing profile", async ({ page }) => {
  let payload: Record<string, unknown> | undefined;
  await page.route("**/api/**", async route => {
    if (route.request().method() === "POST" && /\/taxes\/?$/.test(new URL(route.request().url()).pathname)) payload = route.request().postDataJSON();
    return route.fulfill({ contentType: "application/json", body: JSON.stringify(route.request().method() === "POST" ? { ...payload, id: "new-version" } : rates) });
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(async () => {
    const paths = ["/node_modules/.vite/deps/react.js", "/node_modules/.vite/deps/react-dom_client.js", "/src/features/dynamic-form/DynamicForm.tsx", "/src/features/settings/tax/pages/taxResource.ts"];
    const [rm, dm, form, resource] = await Promise.all(paths.map(path => import(/* @vite-ignore */ path)));
    const React = rm.default ?? rm; const { createRoot } = dm.default ?? dm;
    const fields = await resource.taxResource.loadFields();
    const app = document.getElementById("root"); if (app) app.style.display = "none";
    const host = document.createElement("div"); document.body.append(host);
    createRoot(host).render(React.createElement(form.DynamicForm, { fields, title: "Tax rate schedule", onSubmit: resource.taxResource.api.create }));
  });
  await page.getByLabel("Existing Tax Profile").fill("Fixture GST");
  await page.getByRole("option", { name: /Fixture GST/ }).click();
  await page.getByLabel("Tax Profile Name", { exact: false }).fill("Fixture GST");
  await page.getByLabel("Effective From", { exact: false }).fill("2026-11-01");
  await page.getByLabel("CGST (%)", { exact: false }).fill("5");
  await page.getByLabel("SGST (%)", { exact: false }).fill("5");
  await expect(page.getByLabel("Total Tax (%)", { exact: true })).toHaveValue("10");
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect.poll(() => payload?.profileId).toBe(profileId);
  expect(payload).toMatchObject({ effectiveFrom: "2026-11-01", cgst: 5, sgst: 5, treatment: "Taxable" });
});
