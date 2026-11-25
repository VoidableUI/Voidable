// SPDX-License-Identifier: MIT
//
// Screen-reader suite: VoiceOver on macOS (Playwright WebKit) and NVDA on Windows
// (Playwright Chromium), driven by Guidepup. Run with `mise run test:screen-readers`
// on a Mac or a Windows machine; CI runs it from .github/workflows/screen-readers.yml.
// It is not part of `mise run test:browser`, and `mise run ci` never loads it.
//
// A screen reader is a singleton on the machine and needs a headed browser, so the
// tests run one at a time (withGuidepup forces both). Each test starts and stops
// the screen reader itself.
//
//   VOID_SR_BROWSER   webkit | chromium | firefox  (default: webkit on macOS, chromium on Windows)
//   VOID_SR_RETRIES   retries per scenario (default 2 on CI, 0 locally)
//   VOID_TEST_PORT    the page server's port (default 4417), as in the main suite
import { withGuidepup } from '@guidepup/playwright';
import { defineConfig, devices } from '@playwright/test';

const platform = process.platform;
if (platform !== 'darwin' && platform !== 'win32') {
  throw new Error(
    `The screen-reader suite needs VoiceOver (macOS) or NVDA (Windows); this is ${platform}. ` +
      'Linux runs the accessibility-tree companion of the same scenarios in the normal suite: `mise run test:browser -- specs/screen-reader-tree.spec.ts`.',
  );
}

const port = Number(process.env.VOID_TEST_PORT || 4417);
const browser = (process.env.VOID_SR_BROWSER || (platform === 'darwin' ? 'webkit' : 'chromium')) as 'webkit' | 'chromium' | 'firefox';
const device = { webkit: devices['Desktop Safari'], chromium: devices['Desktop Chrome'], firefox: devices['Desktop Firefox'] }[browser];

export default defineConfig(
  withGuidepup({
    testDir: './screen-readers/specs',
    outputDir: './test-results-screen-readers',
    // Guidepup's own examples allow five minutes a test and retry: startup and
    // focus races on a CI runner are the known source of flakiness.
    timeout: 5 * 60 * 1000,
    retries: Number(process.env.VOID_SR_RETRIES ?? (process.env.CI ? 2 : 0)),
    forbidOnly: !!process.env.CI,
    reportSlowTests: null,
    expect: { timeout: 10_000 },
    reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-screen-readers' }], ['./screen-readers/reporter.ts'], ...(process.env.CI ? ([['github']] as const) : [])],
    use: {
      baseURL: `http://127.0.0.1:${port}`,
      // The screen readers speak English and the matcher expects English words.
      locale: 'en-US',
      // Page-level recordings and traces of every run, passing or not: with a
      // screen reader the spoken log alone often cannot say what the page did.
      trace: 'on',
      video: 'on',
      screenshot: 'on',
    },
    webServer: {
      command: 'node scripts/serve.mjs',
      url: `http://127.0.0.1:${port}/build/ui.js`,
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: 'pipe',
    },
    projects: [{ name: browser, use: { ...device } }],
  }),
);
