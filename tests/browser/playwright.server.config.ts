// SPDX-License-Identifier: MIT
//
// Server-backed suite: real apps (server/apps.mjs) started by Playwright,
// driven in Chromium like the pure-browser suite. Run with
// `mise run test:server`; VOID_SERVER_APPS=rails limits the apps.
//
// Each app becomes a web server (prepared and started by server/start.mjs,
// ready when its readyPath answers) and a project whose specs live in
// server/<app>/ and whose baseURL points at it.
import { defineConfig, devices } from '@playwright/test';
import { apps } from './server/apps.mjs';

const names = (process.env.VOID_SERVER_APPS || Object.keys(apps).join(',')).split(',').map((s) => s.trim()).filter(Boolean);
for (const n of names) if (!(n in apps)) throw new Error(`unknown server app "${n}"`);
const chromiumPath = process.env.VOID_CHROMIUM_PATH;

export default defineConfig({
  testDir: './server',
  outputDir: './test-results/server',
  fullyParallel: false,
  // One worker: the apps keep state per session, and the server is the shared resource.
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report/server' }], ['github']]
    : [['list'], ['html', { open: 'never', outputFolder: 'playwright-report/server' }]],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: names.map((n) => ({
    command: `node server/start.mjs ${n}`,
    url: `http://127.0.0.1:${apps[n].port}${apps[n].readyPath}`,
    reuseExistingServer: false,
    // First runs install dependencies and create a database.
    timeout: 600_000,
    stdout: 'pipe' as const,
    stderr: 'pipe' as const,
  })),
  projects: names.map((n) => ({
    name: n,
    testMatch: [`${n}/**/*.spec.ts`],
    use: {
      ...devices['Desktop Chrome'],
      viewport: { width: 1280, height: 900 },
      baseURL: `http://127.0.0.1:${apps[n].port}`,
      ...(chromiumPath ? { launchOptions: { executablePath: chromiumPath } } : {}),
    },
  })),
});
