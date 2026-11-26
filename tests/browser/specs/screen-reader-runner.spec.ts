// SPDX-License-Identifier: MIT
//
// The screen-reader runner (screen-readers/runner.ts) against a scripted fake
// screen reader, so its searching, marks, polling and failure messages are
// checked on any machine. The fake "speaks" canned phrases in the styles of
// VoiceOver and NVDA. No page is needed for these scenarios.
import { test, expect } from '@playwright/test';
import type { Scenario } from '../screen-readers/facts';
import type { Reader } from '../screen-readers/readers';
import { runScenario } from '../screen-readers/runner';

/** A screen reader that reads a fixed list of items in order and reacts to activation with canned speech. */
function fake(items: string[], onAct: Record<string, string> = {}): Reader & { cursor: number } {
  const spoken: string[] = [];
  const r = {
    name: 'NVDA' as const,
    cursor: -1,
    async move() {
      r.cursor = Math.min(r.cursor + 1, items.length - 1);
      spoken.push(items[r.cursor]);
    },
    async act() {
      const said = onAct[items[r.cursor]];
      if (said) spoken.push(said);
    },
    async restart() { r.cursor = -1; },
    async press() {},
    async type() {},
    async cell() {},
    log: async () => [...spoken],
    version: () => 'fake',
  };
  return r;
}

const page = undefined as never;
const checkbox: Scenario = {
  id: 'fake-checkbox',
  title: 'x',
  page: '/sr-controls',
  steps: [
    { reach: { role: 'checkbox', name: 'Accept the terms', checked: false }, by: 'control' },
    { act: true },
    { hear: { role: 'checkbox', name: 'Accept the terms', checked: true } },
  ],
};

test('finds an element past extra announcements, then hears the new state', async () => {
  const reader = fake(['Preferences, heading, level 1', 'Accept the terms, check box, not checked'], { 'Accept the terms, check box, not checked': 'checked' });
  const transcript = await runScenario(reader, page, checkbox);
  expect(transcript.map((t) => t.step.split('. ')[0])).toEqual(['1', '2', '3']);
  expect(transcript[0].phrases).toContain('Accept the terms, check box, not checked');
  expect(transcript[1].phrases).toEqual(['checked']);
});

test('names the missing state when the element is reached but says the wrong thing', async () => {
  const reader = fake(['Accept the terms, check box, checked']);
  await expect(runScenario(reader, page, checkbox)).rejects.toThrow(/lacked: unchecked \/ off/);
});

test('says what it heard when the element is never reached', async () => {
  const reader = fake(['Preferences, heading, level 1', 'Plan, group']);
  const err = await runScenario(reader, page, checkbox).catch((e: Error) => e);
  expect((err as Error).message).toMatch(/never reached checkbox "Accept the terms"/);
  expect((err as Error).message).toMatch(/Plan, group/);
  expect((err as Error & { transcript?: unknown[] }).transcript).toHaveLength(1);
});

test('fails when an announcement the action should cause never comes', async () => {
  test.setTimeout(30_000);
  const reader = fake(['Accept the terms, check box, not checked']);
  await expect(runScenario(reader, page, checkbox)).rejects.toThrow(/nothing spoken matched checkbox "Accept the terms"/);
});

test('a modal that leaks background content is reported', async () => {
  const reader = fake(['Profile settings, dialog', 'Background action, button']);
  const scenario: Scenario = {
    id: 'fake-dialog',
    title: 'x',
    page: '/sr-dialog',
    steps: [{ walk: 2, unreachable: { role: 'button', name: 'Background action' } }],
  };
  await expect(runScenario(reader, page, scenario)).rejects.toThrow(/must be unreachable/);
});

test('starts again from the top once when quick navigation is stuck past the element', async () => {
  // The cursor begins past the checkbox: the same last phrase repeats until the reader is sent back to the start.
  const reader = fake(['Accept the terms, check box, not checked', 'Last form element Increment button']);
  reader.cursor = 1;
  const scenario: Scenario = { id: 'fake-restart', title: 'x', page: '/sr-controls', steps: [{ reach: { role: 'checkbox', name: 'Accept the terms', checked: false }, by: 'control' }] };
  await runScenario(reader, page, scenario);
});

test('speech appended to the last phrase after an action still counts as spoken since it', async () => {
  const spoken = ['Edit profile, button'];
  const reader = { ...fake(['Edit profile, button']), log: async () => [...spoken], async act() { spoken[spoken.length - 1] += '. Profile settings, dialog'; } };
  const scenario: Scenario = {
    id: 'fake-grow',
    title: 'x',
    page: '/sr-dialog',
    steps: [{ reach: { role: 'button', name: 'Edit profile' }, by: 'control' }, { act: true }, { hear: { role: 'dialog', name: 'Profile settings' } }],
  };
  await runScenario(reader, page, scenario);
});
