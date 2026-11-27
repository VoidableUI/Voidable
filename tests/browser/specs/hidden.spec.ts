// SPDX-License-Identifier: MIT
//
// The `hidden` attribute hides (#104): every tag in the custom-elements manifest, with the attribute set,
// is not rendered, whatever `display` its component sets and wherever it sits (alone, inside a plain
// element, inside another void-* element, with and without its component's own parent).
import { createRequire } from 'node:module';
import { test, expect, load } from '../helpers/test';

const require = createRequire(import.meta.url);
const manifest = require('@voidable/ui/custom-elements.json');
const tags: string[] = manifest.modules.flatMap((m: any) => (m.declarations ?? []).map((d: any) => d.tagName).filter(Boolean));

test.beforeEach(async ({ page }) => {
  await load(page, '/blank');
});

test('the manifest lists tags to walk', () => {
  expect(tags.length).toBeGreaterThan(100);
});

test('every tag in the manifest is not rendered with the hidden attribute', async ({ page }) => {
  const result = await page.evaluate(async (tags) => {
    const failures: string[] = [];
    const probe = (el: Element, where: string) => {
      const cs = getComputedStyle(el);
      if (cs.display !== 'none' || el.getClientRects().length !== 0) failures.push(`${el.localName} ${where}: display ${cs.display}`);
    };
    const host = document.createElement('div');
    document.body.append(host);
    for (const tag of tags) {
      // Alone, in a plain element.
      const alone = document.createElement(tag);
      alone.setAttribute('hidden', '');
      alone.textContent = 'x';
      host.append(alone);
      // Inside another void-* element that is not its parent (a part with no component around it).
      const outer = document.createElement('void-panel');
      const inner = document.createElement(tag);
      inner.setAttribute('hidden', '');
      inner.textContent = 'x';
      outer.append(inner);
      host.append(outer);
      // Set after it was connected and upgraded.
      const late = document.createElement(tag);
      late.textContent = 'x';
      host.append(late);
      await (window as any).__settle(host);
      late.setAttribute('hidden', '');
      await (window as any).__settle(host);
      probe(alone, 'alone');
      probe(inner, 'inside a panel');
      probe(late, 'hidden after upgrade');
    }
    return failures;
  }, tags);
  expect(result).toEqual([]);
});

