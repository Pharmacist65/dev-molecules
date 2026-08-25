import { defineConfig, devices } from "@playwright/test";

const requestedPort = Number.parseInt(process.env.PLAYWRIGHT_PORT ?? "3100", 10);
const testPort = Number.isInteger(requestedPort) && requestedPort > 0 && requestedPort <= 65_535
  ? requestedPort
  : 3100;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${testPort}`;
const managesWebServer = !process.env.PLAYWRIGHT_BASE_URL;
const requestedBrowser = process.env.PLAYWRIGHT_BROWSER;
const usesSharedSoftwareRenderer =
  process.env.PLAYWRIGHT_PERFORMANCE_PROFILE === "shared-software-renderer";
const testTimeout = usesSharedSoftwareRenderer ? 120_000 : 60_000;
const assertionTimeout = usesSharedSoftwareRenderer ? 30_000 : 12_000;
const chromiumLaunchArgs = usesSharedSoftwareRenderer
  ? [
      "--enable-webgl",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ]
  : ["--enable-webgl", "--ignore-gpu-blocklist"];

export default defineConfig({
  testDir: "./e2e",
  outputDir: "work/playwright/results",
  fullyParallel: false,
  workers: 1,
  timeout: testTimeout,
  expect: {
    timeout: assertionTimeout,
  },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ["list"],
    ["json", { outputFile: "work/playwright/results.json" }],
  ],
  use: {
    ...devices["Desktop Chrome"],
    channel: requestedBrowser === "chromium" ? undefined : "chrome",
    baseURL,
    viewport: { width: 1440, height: 900 },
    colorScheme: "light",
    contextOptions: {
      reducedMotion: "reduce",
    },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
    launchOptions: {
      args: chromiumLaunchArgs,
    },
  },
  webServer: managesWebServer
    ? {
        command:
          process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ??
          `npm run start -- --hostname 127.0.0.1 --port ${testPort}`,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000,
        stdout: "pipe",
        stderr: "pipe",
      }
    : undefined,
});
