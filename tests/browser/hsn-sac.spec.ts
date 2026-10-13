import { test, expect } from "@playwright/test";

test("purchase HSN defaults are editable and saved values survive reopening", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const reactPath = "/node_modules/.vite/deps/react.js";
    const domPath = "/node_modules/.vite/deps/react-dom_client.js";
    const formPath = "/src/features/dynamic-form/DynamicForm.tsx";
    const configPath = "/src/features/purchase/product/config/product.form.ts";
    const reactModule = await import(/* @vite-ignore */ reactPath);
    const React = reactModule.default ?? reactModule;
    const domModule = await import(/* @vite-ignore */ domPath);
    const { createRoot } = domModule.default ?? domModule;
    const { DynamicForm } = await import(/* @vite-ignore */ formPath);
    const { createProductFormConfig } = await import(/* @vite-ignore */ configPath);
    const app = document.getElementById("root"); if (app) app.style.display = "none";
    const host = document.createElement("div"); document.body.append(host);
    const root = createRoot(host);
    const fields = createProductFormConfig({ vendors: [], brands: [], productTypes: [
      { id: "phone", name: "Phone", hsnSac: "85171300" },
      { id: "washer", name: "Washing Machine", hsnSac: "8450" },
      { id: "legacy", name: "Legacy" },
    ], models: [], variants: [], colors: [] }).filter((f: { name: string }) => ["productTypeId", "hsnSac"].includes(f.name))
      .map((f: { name: string }) => f.name === "productTypeId" ? { ...f, dependsOn: undefined, loadOptions: undefined } : f);
    const render = (initialValues: Record<string, unknown>, key: string) => root.render(React.createElement(DynamicForm, {
      key, fields, title: "HSN fixture", initialValues, onSubmit: (values: Record<string, unknown>) => {
        (window as any).hsnSaved = values;
      },
    }));
    (window as any).hsnRender = render;
    render({}, "new");
  });
  const type = page.getByLabel("Product Type", { exact: false });
  const code = page.getByLabel("HSN/SAC Code", { exact: true });
  await type.fill("Phone");
  await page.getByRole("option", { name: "Phone", exact: true }).click();
  await expect(code).toHaveValue("85171300");
  await code.fill("001234");
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).hsnSaved?.hsnSac)).toBe("001234");
  await type.fill("Washing Machine");
  await page.getByRole("option", { name: "Washing Machine", exact: true }).click();
  await expect(code).toHaveValue("8450");
  await type.fill("Legacy");
  await page.getByRole("option", { name: "Legacy", exact: true }).click();
  await expect(code).toHaveValue("");
  await page.evaluate(() => (window as any).hsnRender({ productTypeId: "phone", hsnSac: "001234" }, "edit"));
  await expect(code).toHaveValue("001234");
  await code.fill("AB1234");
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page.getByText("HSN/SAC Code has an invalid format.")).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).hsnSaved?.hsnSac)).toBe("001234");
});

test("Add Product Types saves an HSN code for each row and rejects invalid codes", async ({ page }) => {
  await page.route("**/api/taxes/all", route => route.fulfill({ contentType: "application/json", body: JSON.stringify([{ id: "tax-profile", profileId: "tax-profile", name: "Fixture GST", effectiveFrom: "0001-01-01", totalTax: 18, cgst: 9, sgst: 9, isActive: true }]) }));
  await page.goto("/");
  await page.evaluate(async () => {
    const paths = ["/node_modules/.vite/deps/react.js", "/node_modules/.vite/deps/react-dom_client.js", "/node_modules/.vite/deps/react-router-dom.js", "/src/features/products/product-type/pages/ProductTypeFormPage.tsx", "/src/features/products/product-type/pages/productTypeResource.ts"];
    const source = await (await fetch(paths[3])).text();
    const routerPath = source.match(/from\s+["']([^"']*react-router-dom[^"']*)["']/)?.[1];
    if (!routerPath) throw new Error("Cannot resolve the form's router module.");
    paths[2] = routerPath;
    const [reactModule, domModule, router, form, resource] = await Promise.all(paths.map(path => import(/* @vite-ignore */ path)));
    const React = reactModule.default ?? reactModule;
    const { createRoot } = domModule.default ?? domModule;
    (window as any).createdTypes = [];
    resource.productTypeResource.api.create = async (values: Record<string, unknown>) => {
      (window as any).createdTypes.push(values);
      return { ...values, id: "new-type" };
    };
    const app = document.getElementById("root"); if (app) app.style.display = "none";
    const host = document.createElement("div"); document.body.append(host);
    createRoot(host).render(React.createElement(router.MemoryRouter, null, React.createElement(form.ProductTypeFormPage, { mode: "create" })));
  });
  await expect(page.getByRole("heading", { name: "Add Product Types", exact: true })).toBeVisible();
  await page.getByPlaceholder("Example: Mobile", { exact: true }).fill("Mobile");
  await page.getByLabel("Default HSN/SAC Code").fill("12345");
  await page.getByRole("button", { name: "Create 1 Product Type", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("HSN/SAC must contain 4, 6 or 8 digits.");
  expect(await page.evaluate(() => (window as any).createdTypes)).toEqual([]);
  await page.getByLabel("Default HSN/SAC Code").fill("001234");
  await page.getByLabel("Default Tax Profile").selectOption("tax-profile");
  await page.getByRole("button", { name: "Add another", exact: true }).click();
  await expect(page.getByLabel("Default HSN/SAC Code")).toHaveCount(2);
  await page.getByPlaceholder("Example: Mobile", { exact: true }).nth(1).fill("Washing Machine");
  await page.getByLabel("Default HSN/SAC Code").nth(1).fill("8450");
  await page.getByRole("button", { name: "Create 2 Product Types", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).createdTypes.length)).toBe(2);
  const saved = await page.evaluate(() => (window as any).createdTypes);
  expect(saved[0]).toMatchObject({ name: "Mobile", hsnSac: "001234", defaultTaxId: "tax-profile" });
  expect(saved[1]).toMatchObject({ name: "Washing Machine", hsnSac: "8450" });
});
