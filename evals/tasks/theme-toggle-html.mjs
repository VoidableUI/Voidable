// SPDX-License-Identifier: MIT
import { ok } from '../lib/expect.mjs';

const lum = (rgb) => {
  const m = rgb.match(/\d+(\.\d+)?/g);
  if (!m) return -1;
  const [r, g, b] = m.map(Number);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};
const toggle = (t) => t.role('switch', { name: /dark mode/i }).or(t.role('checkbox', { name: /dark mode/i })).or(t.role('button', { name: /dark mode|theme|light mode/i }));

export default {
  id: 'theme-toggle-html',
  title: 'Dark and light mode toggle',
  format: 'html',
  components: ['void-nav-bar', 'void-switch'],
  prompt: `Add a dark/light mode switch to the site header, labelled "Dark mode" and on by default. Turning it off switches the whole page to the light theme and turning it on switches back; the choice is remembered when the page is reloaded. The page has a header with the site name "Northwind" and a short welcome paragraph under it.`,
  checks: [
    {
      id: 'dark-default',
      title: 'the page starts dark with the switch on',
      run: async (t) => {
        const sw = await t.visible(toggle(t), 'Dark mode switch');
        const bg = await t.pageBackground();
        ok(lum(bg) < 0.2, `background is ${bg}, not dark`);
        const state = (await sw.getAttribute('aria-checked')) ?? (await sw.getAttribute('aria-pressed'));
        ok(state === null || state === 'true', `the switch reports ${state} while the page is dark`);
      },
    },
    {
      id: 'switches-light',
      title: 'turning it off makes the page light',
      run: async (t) => {
        const sw = await t.visible(toggle(t), 'Dark mode switch');
        await sw.click();
        await t.settle();
        await t.page.waitForTimeout(400);
        const bg = await t.pageBackground();
        ok(lum(bg) > 0.8, `background is ${bg} after switching to light`);
      },
    },
    {
      id: 'remembers',
      title: 'the light choice survives a reload',
      run: async (t) => {
        await t.page.reload({ waitUntil: 'load' });
        await t.settle();
        await t.page.waitForTimeout(300);
        const bg = await t.pageBackground();
        ok(lum(bg) > 0.8, `background is ${bg} after reload`);
        const sw = await t.visible(toggle(t), 'Dark mode switch after reload');
        const state = (await sw.getAttribute('aria-checked')) ?? (await sw.getAttribute('aria-pressed'));
        ok(state === null || state === 'false', `the switch reports ${state} on a light page`);
      },
    },
  ],
};
