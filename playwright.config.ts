import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser", workers: 1, timeout: 30000,
  use: { baseURL: "http://127.0.0.1:4177", channel: "msedge", headless: true, trace: "retain-on-failure" },
  webServer: { command: "npm run dev -- --host 127.0.0.1 --port 4177 --strictPort", url: "http://127.0.0.1:4177", reuseExistingServer: false },
});
