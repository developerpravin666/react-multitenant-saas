import { test, expect } from "@playwright/test";

test("Excel download preserves bytes and rejects JSON, HTML and invalid binary", async ({ page }) => {
  await page.route("**/download-check", route => route.fulfill({
    contentType: "text/html", body: "<!doctype html><html><body></body></html>",
  }));
  await page.goto("/download-check");
  const result = await page.evaluate(async () => {
    const modulePath = "/src/services/apiClient.ts";
    const { apiClient } = await import(/* @vite-ignore */ modulePath);
    const originalFetch = window.fetch;
    const originalCreate = URL.createObjectURL;
    const originalClick = HTMLAnchorElement.prototype.click;
    let saved: Blob | undefined;
    let clicks = 0;
    URL.createObjectURL = (blob: Blob | MediaSource) => { saved = blob as Blob; return "blob:test"; };
    HTMLAnchorElement.prototype.click = () => { clicks++; };
    try {
      window.fetch = async () => new Response(new Uint8Array([80, 75, 3, 4, 0, 255, 128, 1]));
      await apiClient.download("/masters/template", "template.xlsx");
      const downloaded = Array.from(new Uint8Array(await saved!.arrayBuffer()));
      const errors: string[] = [];
      for (const [contentType, body] of [
        ["application/json", '{"success":true,"data":"corrupt workbook"}'],
        ["text/html", "<!doctype html><html>Sign in</html>"],
        ["application/octet-stream", "invalid file"],
      ]) {
        window.fetch = async () => new Response(body, { headers: { "content-type": contentType } });
        try { await apiClient.download("/masters/template", "template.xlsx"); }
        catch (error) { errors.push((error as Error).message); }
      }
      return { downloaded, clicks, errors };
    } finally {
      window.fetch = originalFetch;
      URL.createObjectURL = originalCreate;
      HTMLAnchorElement.prototype.click = originalClick;
    }
  });
  expect(result.downloaded).toEqual([80, 75, 3, 4, 0, 255, 128, 1]);
  expect(result.clicks).toBe(1);
  expect(result.errors).toHaveLength(3);
  for (const error of result.errors) expect(error).toContain("did not return a valid Excel workbook");
});
