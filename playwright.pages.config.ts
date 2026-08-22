import { defineConfig, devices } from "@playwright/test";

const port = 3101;
const origin = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e-pages",
  outputDir: "work/playwright-pages/results",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 12_000,
  },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    channel: process.env.PLAYWRIGHT_BROWSER === "chromium" ? undefined : "chrome",
    baseURL: `${origin}/dev-molecules/`,
    viewport: { width: 1440, height: 900 },
    colorScheme: "light",
    contextOptions: {
      reducedMotion: "reduce",
    },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
    launchOptions: {
      args: ["--enable-webgl", "--ignore-gpu-blocklist"],
    },
  },
  webServer: {
    command: `npm run preview:pages -- --host 127.0.0.1 --port ${port}`,
    url: `${origin}/dev-molecules/`,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
