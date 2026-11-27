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
import { axTree, formatTrace, installTrace, readTrace } from './trace';

// Capture everything spoken, including announcements nobody asked for (a toast
// arriving): `true` instead of the Guidepup default `"initial"`.
voiceOverTest.use({ voiceOverStartOptions: { capture: true } });
nvdaTest.use({ nvdaStartOptions: { capture: true } });

const safe = (s: string) => s.replace(/[^a-z0-9-]+/gi, '-');

/** Opens the scenario's page, moves the screen reader to its content, runs the steps, and keeps the transcript. */
async function play(reader: Reader, navigateToWebContent: () => Promise<void>, page: Page, scenario: Scenario, testInfo: TestInfo): Promise<void> {
  testInfo.annotations.push({ type: 'screen-reader', description: `${reader.name} ${reader.version()}` });
  // A defect already found for this reader: run the scenario as an expected failure, so the job lists it as
  // known (and prints what was spoken, as the evidence) and a fix turns it red.
  const issue = scenario.readerIssues?.[reader.name];
  if (issue) {
    testInfo.annotations.push({ type: 'known issue', description: `${issue.key}: ${issue.detail}` });
    testInfo.fail(true, `${issue.key}: ${issue.detail}`);
  }
  const tag = `${reader.name} ${scenario.id}`;
  await installTrace(page);
  await page.goto(scenario.page);
  await page.waitForFunction(() => typeof (window as any).__settle === 'function' && !!customElements.get('void-button'));
  await page.evaluate(() => (window as any).__settle(document));
  await page.bringToFront();
  await navigateToWebContent();
  // The reader speaks only for the window that has focus. A page that is not focused is why a scenario can hear
  // nothing at all, so say whether it is, and when it is not bring it forward and start again once.
  const focused = () => page.evaluate(() => document.hasFocus()).catch(() => false);
  console.log(`[sr ${tag}] after navigating to the web content: document focused: ${await focused()}, title ${JSON.stringify(await page.title())}`);
  if (!(await focused())) {
    await page.bringToFront();
    await page.locator('h1').first().click({ timeout: 2000 }).catch(() => undefined);
    await navigateToWebContent();
    console.log(`[sr ${tag}] the document was not focused: brought it forward, clicked the heading, navigated again; document focused now: ${await focused()}`);
  }

  let transcript: TranscriptEntry[] = [];
  let failed = false;
  try {
    transcript = await runScenario(reader, page, scenario);
  } catch (err) {
    failed = true;
    transcript = (err as Error & { transcript?: TranscriptEntry[] }).transcript ?? transcript;
    // An expected failure prints no error of its own: keep what was spoken in the log.
    if (issue) console.log(`[known issue ${issue.key}] ${(err as Error).message}`);
    if (scenario.probe) console.log(`[probe ${tag}] a step failed (a probe never fails the run): ${(err as Error).message}`);
    else throw err;
  } finally {
    if (scenario.probe || scenario.trace || issue || failed) {
      // What the page did, in order, and what the browser exposed: the evidence for the cause.
      console.log(`[trace ${tag}] page events (focus, role, tabindex, aria-*):\n${formatTrace(await readTrace(page).catch(() => []))}`);
      console.log(`[ax ${tag}] accessibility tree:\n${await axTree(page)}`);
    }
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
          nvdaTest.skip(!!scenario.readers && !scenario.readers.includes('NVDA'), 'not run with NVDA');
          await play(nvdaReader(nvda), () => nvda.navigateToWebContent(), page, scenario, testInfo);
        });
      }
    });
  } else {
    voiceOverTest.describe(title, () => {
      for (const scenario of scenarios) {
        voiceOverTest(scenario.id, async ({ page, voiceOver }, testInfo) => {
          voiceOverTest.skip(!!scenario.knownIssue, `known defect, see the tree test: ${scenario.knownIssue?.key}`);
          voiceOverTest.skip(!!scenario.readers && !scenario.readers.includes('VoiceOver'), 'not run with VoiceOver');
          await play(voiceOverReader(voiceOver), () => voiceOver.navigateToWebContent(), page, scenario, testInfo);
        });
      }
    });
  }
}
