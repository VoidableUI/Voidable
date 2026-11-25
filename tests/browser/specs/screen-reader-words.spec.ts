// SPDX-License-Identifier: MIT
//
// The matcher the screen-reader runs use (screen-readers/words.ts), checked here
// against phrases in the styles of VoiceOver and NVDA, where it can run on any
// machine. Pure functions: no page is opened. A change to the vocabulary tables
// that breaks one of these is a change to what the screen-reader jobs accept.
import { test, expect } from '@playwright/test';
import type { Fact } from '../screen-readers/facts';
import { heard, matchFact, normalise } from '../screen-readers/words';
import { scenarios } from '../screen-readers/scenarios';
import { pickerScenarios } from '../screen-readers/scenarios-pickers';

const ok = (phrase: string, fact: Fact) => {
  const v = matchFact(phrase, fact);
  return v.isElement && v.missing.length === 0;
};

test('normalise drops case, punctuation and accents', () => {
  expect(normalise('Guidepup, heading, level 1')).toBe('guidepup heading level 1');
  expect(normalise('  Café —  “Menu”  ')).toBe('cafe menu');
  expect(normalise('50%')).toBe('50%');
});

test('name and role are required, in either screen reader style', () => {
  const fact: Fact = { role: 'button', name: 'Save changes' };
  expect(ok('Save changes, button', fact)).toBe(true); // NVDA
  expect(ok('Save changes, button', fact)).toBe(true); // VoiceOver
  expect(ok('button Save changes', fact)).toBe(true);
  expect(ok('Save changes', fact)).toBe(false);
  expect(ok('Save, button', fact)).toBe(false);
  expect(ok('Save changes, link', fact)).toBe(false);
});

test('states have several accepted words and never accept their opposite', () => {
  const on: Fact = { role: 'checkbox', name: 'Accept the terms', checked: true };
  const off: Fact = { role: 'checkbox', name: 'Accept the terms', checked: false };
  expect(ok('Accept the terms, check box, checked', on)).toBe(true);
  expect(ok('Accept the terms, checkbox, ticked', on)).toBe(true);
  expect(ok('Accept the terms, check box, unchecked', on)).toBe(false);
  expect(ok('Accept the terms, check box, not checked', on)).toBe(false);
  expect(ok('Accept the terms, check box, not checked', off)).toBe(true);
  expect(ok('Accept the terms, checkbox, unchecked', off)).toBe(true);
  expect(ok('Accept the terms, check box, checked', off)).toBe(false);
});

test('expanded, required, invalid, level and position are matched on their words', () => {
  expect(ok('How do refunds work?, button, collapsed', { role: 'button', name: 'How do refunds work?', expanded: false })).toBe(true);
  expect(ok('How do refunds work?, button, expanded', { role: 'button', name: 'How do refunds work?', expanded: false })).toBe(false);
  expect(ok('Email address, edit, required', { role: 'textbox', name: 'Email address', required: true })).toBe(true);
  expect(ok('Email address, text field', { role: 'textbox', name: 'Email address', required: true })).toBe(false);
  expect(ok('Invite code, edit, invalid entry', { role: 'textbox', name: 'Invite code', invalid: true })).toBe(true);
  expect(ok('Guidepup, heading, level 1', { role: 'heading', name: 'Guidepup', level: 1 })).toBe(true);
  expect(ok('heading level 2 Guidepup', { role: 'heading', name: 'Guidepup', level: 1 })).toBe(false);
  const rename: Fact = { role: 'menuitem', name: 'Rename', position: { n: 1, of: 3, within: 'x' } };
  expect(ok('Rename, menu item, 1 of 3', rename)).toBe(true);
  expect(ok('Rename, menu item, 2 of 3', rename)).toBe(false);
});

test('spoken words replace the derived details, and the name may be omitted after an action', () => {
  const slider: Fact = { role: 'slider', name: 'Volume', value: '60', spoken: [/\b60\b/] };
  expect(heard(['60%'], slider)).toBe(true);
  expect(heard(['60'], slider)).toBe(true);
  expect(heard(['50'], slider)).toBe(false);
  const toast: Fact = { role: 'status', text: 'Changes saved', container: true, spoken: [/changes saved/] };
  expect(heard(['Changes saved Your profile is up to date'], toast)).toBe(true);
  expect(heard(['Send notification, button'], toast)).toBe(false);
});

test('a container role is not required in speech, only its text', () => {
  const panel: Fact = { role: 'tabpanel', name: 'Billing', text: 'Your invoices and cards.', container: true };
  expect(ok('Your invoices and cards.', panel)).toBe(true);
  expect(ok('Billing, tab, selected', panel)).toBe(false);
});

test('every scenario is well formed: unique ids, existing pages, reach before act', () => {
  const all = [...scenarios, ...pickerScenarios];
  expect(new Set(all.map((s) => s.id)).size).toBe(all.length);
  for (const s of all) {
    expect(s.page, s.id).toMatch(/^\/sr-[a-z-]+$/);
    expect(s.steps.length, s.id).toBeGreaterThan(0);
    let reached = false;
    for (const step of s.steps) {
      if ('reach' in step) reached = true;
      if ('act' in step) expect(reached, `${s.id}: act before reach`).toBe(true);
    }
  }
});
