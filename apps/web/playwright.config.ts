import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost";
const isLocalTarget = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(baseURL);
const useDevCredentials = process.env.PLAYWRIGHT_USE_DEV_CREDENTIALS !== "0";

if (isLocalTarget && useDevCredentials) {
  process.env.E2E_ADMIN_EMAIL ??= "admin@fasodata.bf";
  process.env.E2E_ADMIN_PASSWORD ??= "changeme_admin";
  process.env.E2E_INSTITUTION_EMAIL ??= "demo@ong.bf";
  process.env.E2E_INSTITUTION_PASSWORD ??= "demo1234";
}

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: process.env.PLAYWRIGHT_WORKERS ? Number(process.env.PLAYWRIGHT_WORKERS) : 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: process.env.PLAYWRIGHT_VIDEO === "1" ? "retain-on-failure" : "off",
    launchOptions: {
      args: ["--disable-gpu", "--disable-dev-shm-usage"],
    },
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 950 } },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 5"] },
    },
  ],
});
