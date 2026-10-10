import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  workers: 2,
  timeout: 30000,
  use: {
    baseURL: "http://localhost:3000",
    browserName: "chromium",
    trace: "retain-on-failure",
    launchOptions: {
      executablePath: process.env.TEST_CHROMIUM_PATH,
      args: process.env.TEST_CHROMIUM_PATH
        ? ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
        : [],
    },
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_DEMO_MODE: "false",
      VITE_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      VITE_PUBLIC_SUPABASE_ANON_KEY: "eyJ-ci-placeholder",
      VITE_PUBLIC_SITE_URL: "https://vowora.uk",
    },
  },
});
