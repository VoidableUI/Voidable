// SPDX-License-Identifier: MIT
//
// Real-browser suite. Run with `mise run test:browser` (which builds first).
//
// Projects: chromium, firefox and webkit run every spec except the
// performance budgets; `perf` runs those on Chromium alone, after the others,
// so timings are not taken while other workers compete for the CPU.
//
// VOID_BROWSERS (comma list, default "chromium,firefox,webkit") selects the
// engines. Locally, an engine that is not installed, or (WebKit on a distro
// Playwright does not support) cannot load its libraries, is left out with a
// note, so a contributor with only Chromium still gets a run. In CI every
// selected engine must run.
//
// VOID_WEBKIT_WS=ws://127.0.0.1:3333/ runs WebKit through a Playwright server,
// for example the official Docker image (see "Browser tests" in CONTRIBUTING.md).
// VOID_CHROMIUM_PATH=/usr/bin/chromium uses a system Chromium.
import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test';
import { chromium, firefox, webkit } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const port = Number(process.env.VOID_TEST_PORT || 4417);
const engines = { chromium, firefox, webkit } as const;
type Engine = keyof typeof engines;
const device = { chromium: devices['Desktop Chrome'], firefox: devices['Desktop Firefox'], webkit: devices['Desktop Safari'] } as const;

const chromiumPath = process.env.VOID_CHROMIUM_PATH;
const webkitWs = process.env.VOID_WEBKIT_WS;

/** Why an engine cannot run here, or null when it can. */
function unavailable(name: Engine): string | null {
  if (name === 'chromium' && chromiumPath) return existsSync(chromiumPath) ? null : `${chromiumPath} does not exist`;
  if (name === 'webkit' && webkitWs) return null;
  if (!existsSync(engines[name].executablePath())) return 'not installed (run `mise run test:browser:install`)';
  if (name === 'webkit' && process.platform === 'linux') {
    const bin = join(dirname(engines.webkit.executablePath()), 'minibrowser-wpe/bin/MiniBrowser');
    const missing = (spawnSync('ldd', [bin], { encoding: 'utf8' }).stdout || '')
      .split('\n')
      .filter((l) => l.includes('not found') && !l.includes('libWPEWebKit'))
      .map((l) => l.trim().split(' ')[0]);
    if (missing.length) return `missing system libraries ${missing.join(', ')} (use VOID_WEBKIT_WS, see CONTRIBUTING.md)`;
  }
  return null;
}

// Decided once in the main process; workers inherit the result.
if (!process.env.VOID_RESOLVED_BROWSERS) {
  const wanted = (process.env.VOID_BROWSERS || 'chromium,firefox,webkit').split(',').map((s) => s.trim()).filter(Boolean) as Engine[];
  const usable = wanted.filter((name) => {
    const why = unavailable(name);
    if (!why) return true;
    if (process.env.CI) throw new Error(`[browser tests] ${name} cannot run: ${why}`);
    console.warn(`[browser tests] skipping ${name}: ${why}`);
    return false;
  });
  process.env.VOID_RESOLVED_BROWSERS = usable.join(',');
}
const available = process.env.VOID_RESOLVED_BROWSERS.split(',').filter(Boolean) as Engine[];

const projects: NonNullable<PlaywrightTestConfig['projects']> = available.map((name) => ({
  name,
  testIgnore: ['**/perf.spec.ts'],
  use: {
    ...device[name],
    viewport: { width: 1280, height: 800 },
    ...(name === 'chromium' && chromiumPath ? { launchOptions: { executablePath: chromiumPath } } : {}),
    ...(name === 'webkit' && webkitWs ? { connectOptions: { wsEndpoint: webkitWs } } : {}),
  },
}));

if (available.includes('chromium')) {
  projects.push({
    name: 'perf',
    testMatch: ['**/perf.spec.ts'],
    dependencies: available,
    use: {
      ...devices['Desktop Chrome'],
      viewport: { width: 1280, height: 800 },
      launchOptions: {
        ...(chromiumPath ? { executablePath: chromiumPath } : {}),
        args: ['--enable-precise-memory-info', '--js-flags=--expose-gc'],
      },
    },
  });
}

export default defineConfig({
  testDir: './specs',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // No retries: a test that needs one is flaky and must be fixed.
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }], ['github']]
    : [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node scripts/serve.mjs',
    url: `http://127.0.0.1:${port}/build/ui.js`,
    // Always a fresh server, so the bundles match the current build.
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'pipe',
  },
  projects,
});
