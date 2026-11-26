// SPDX-License-Identifier: MIT
//
// Registers one test per scenario, driven by VoiceOver (macOS) or NVDA (Windows)
// through @guidepup/playwright. Imported only by screen-readers/specs, which only
// playwright.screen-readers.config.ts runs; the normal browser suite never loads
// this file, so it never tries to start a screen reader.
import { nvdaTest, voiceOverTest } from '@guidepup/playwright';
import type { Page, TestInfo } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Scenario } from './facts';
import { nvdaReader, voiceOverReader, type Reader } from './readers';
import { RESULTS_DIR } from './results';
import { runScenario, type TranscriptEntry } from './runner';

// Capture everything spoken, including announcements nobody asked for (a toast
// arriving): `true` instead of the Guidepup default `"initial"`.
voiceOverTest.use({ voiceOverStartOptions: { capture: true } });
nvdaTest.use({ nvdaStartOptions: { capture: true } });

const safe = (s: string) => s.replace(/[^a-z0-9-]+/gi, '-');

/** Opens the scenario's page, moves the screen reader to its content, runs the steps, and keeps the transcript. */
async function play(reader: Reader, navigateToWebContent: () => Promise<void>, page: Page, scenario: Scenario, testInfo: TestInfo): Promise<void> {
  testInfo.annotations.push({ type: 'screen-reader', description: `${reader.name} ${reader.version()}` });
  await page.goto(scenario.page);
  await page.waitForFunction(() => typeof (window as any).__settle === 'function' && !!customElements.get('void-button'));
  await page.evaluate(() => (window as any).__settle(document));
  await page.bringToFront();
  await navigateToWebContent();

  let transcript: TranscriptEntry[] = [];
  try {
    transcript = await runScenario(reader, page, scenario);
  } catch (err) {
    transcript = (err as Error & { transcript?: TranscriptEntry[] }).transcript ?? transcript;
    throw err;
  } finally {
    // The transcript is the main diagnostic: keep it for passing runs as well.
    const dir = join(RESULTS_DIR, 'transcripts');
    mkdirSync(dir, { recursive: true });
    const body = JSON.stringify({ screenReader: reader.name, version: reader.version(), scenario: scenario.id, retry: testInfo.retry, steps: transcript }, null, 2);
    writeFileSync(join(dir, `${safe(reader.name)}-${safe(scenario.id)}-retry${testInfo.retry}.json`), body);
    await testInfo.attach('spoken-phrases.json', { body, contentType: 'application/json' });
    const full = (await reader.log()).map((p, i) => `${String(i + 1).padStart(3)}  ${p}`).join('\n');
    await testInfo.attach('spoken-phrase-log.txt', { body: full || '(nothing was spoken)', contentType: 'text/plain' });
  }
}

export function screenReaderSuite(title: string, scenarios: Scenario[]): void {
  // Playwright reads the fixtures a test uses from its destructured parameter, so each
  // screen reader gets its own registration.
  if (process.platform === 'win32') {
    nvdaTest.describe(title, () => {
      for (const scenario of scenarios) {
        nvdaTest(scenario.id, async ({ page, nvda }, testInfo) => {
          // A scenario whose tree test is a known defect says nothing new with a screen reader.
          nvdaTest.skip(!!scenario.knownIssue, `known defect, see the tree test: ${scenario.knownIssue?.key}`);
          await play(nvdaReader(nvda), () => nvda.navigateToWebContent(), page, scenario, testInfo);
        });
      }
    });
  } else {
    voiceOverTest.describe(title, () => {
      for (const scenario of scenarios) {
        voiceOverTest(scenario.id, async ({ page, voiceOver }, testInfo) => {
          voiceOverTest.skip(!!scenario.knownIssue, `known defect, see the tree test: ${scenario.knownIssue?.key}`);
          if (scenario.voiceOverIssue) {
            const { key, detail } = scenario.voiceOverIssue;
            voiceOverTest.info().annotations.push({ type: 'known issue', description: `${key}: ${detail}` });
            voiceOverTest.fail(true, `${key}: ${detail}`);
          }
          await play(voiceOverReader(voiceOver), () => voiceOver.navigateToWebContent(), page, scenario, testInfo);
        });
      }
    });
  }
}
