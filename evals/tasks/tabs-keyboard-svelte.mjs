// SPDX-License-Identifier: MIT
import { ok } from '../lib/expect.mjs';

export default {
  id: 'tabs-keyboard-svelte',
  title: 'Tabs with forms, keyboard operable',
  format: 'svelte',
  components: ['void-tabs', 'void-field', 'void-input', 'void-switch'],
  prompt: `Account page with three tabs: "Profile" (a "Name" field), "Billing" (the text "Plan: Pro, renews Dec 1, 2026") and "Security" (a "Two-factor authentication" switch). Profile is selected first. Switching tabs must keep what the user typed, and the tabs must work with the keyboard (arrow keys move between them).`,
  checks: [
    {
      id: 'click-switches',
      title: 'clicking Billing shows the plan and hides Profile',
      run: async (t) => {
        await t.fill(/^name/i, 'Ada');
        await t.click('tab', 'Billing');
        await t.visible(t.text(/plan: pro/i), 'Billing content');
        ok(!(await t.label(/^name/i).first().isVisible().catch(() => false)), 'the Name field is visible on the Billing tab');
      },
    },
    {
      id: 'arrow-keys',
      title: 'ArrowRight from Billing selects Security',
      run: async (t) => {
        await t.role('tab', { name: 'Billing' }).first().focus();
        await t.page.keyboard.press('ArrowRight');
        await t.settle();
        const sec = t.role('tab', { name: 'Security' }).first();
        const selected = (await sec.getAttribute('aria-selected')) === 'true';
        if (!selected) await t.page.keyboard.press('Enter');
        await t.settle();
        ok((await sec.getAttribute('aria-selected')) === 'true', 'Security is not selected after ArrowRight (and Enter)');
        await t.visible(t.role('switch', { name: /two-factor/i }).or(t.role('checkbox', { name: /two-factor/i })), 'Two-factor switch');
      },
    },
    {
      id: 'keeps-input',
      title: 'returning to Profile keeps the typed name',
      run: async (t) => {
        await t.click('tab', 'Profile');
        const f = await t.visible(t.label(/^name/i), 'field Name');
        const v = await f.inputValue().catch(() => f.evaluate((e) => e.value ?? e.querySelector('input')?.value));
        ok(v === 'Ada', `Name is ${JSON.stringify(v)} after switching back`);
      },
    },
  ],
};
