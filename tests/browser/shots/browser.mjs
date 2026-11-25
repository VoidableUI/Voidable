// SPDX-License-Identifier: MIT
//
// The browser every capture uses, and the context that pins what varies between
// machines or runs. Shared by the page capture and the story capture.
import { chromium } from '@playwright/test';
import { HEIGHTS } from './lib.mjs';

export const FIXED_TIME = '2026-01-15T12:00:00Z';

const launchArgs = ['--disable-gpu', '--disable-gpu-compositing', '--disable-lcd-text', '--font-render-hinting=none', '--force-color-profile=srgb', '--hide-scrollbars', '--disable-font-subpixel-positioning', '--disable-skia-runtime-opts'];

export async function launch() {
  return chromium.launch({ args: launchArgs, ...(process.env.VOID_CHROMIUM_PATH ? { executablePath: process.env.VOID_CHROMIUM_PATH } : {}) });
}

/** A browser context with everything that varies between machines or runs pinned. */
export async function newContext(browser, { width, scheme }) {
  const context = await browser.newContext({
    viewport: { width, height: HEIGHTS[width] ?? 900 },
    deviceScaleFactor: 1,
    colorScheme: scheme,
    reducedMotion: 'reduce',
    locale: 'en-US',
    timezoneId: 'UTC',
    serviceWorkers: 'block',
  });
  await context.clock.setFixedTime(new Date(FIXED_TIME));
  return context;
}

