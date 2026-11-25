// SPDX-License-Identifier: MIT
//
// The `test` every spec imports. It adds:
//   - a check that the page logged no uncaught error and no console.error,
//   - `expectedFailure()`, the one way to mark known-broken behaviour,
//   - small helpers for loading a page and waiting for components to settle.
import { test as base, expect, type Locator, type Page } from '@playwright/test';
import { KNOWN_ISSUES, type KnownIssue } from './known-issues';

export { expect };
export type { Locator, Page };

type Fixtures = {
  /** Console errors and uncaught exceptions seen so far in this test. */
  pageErrors: string[];
  /** Set to true in a test that provokes errors on purpose. */
  allowPageErrors: { value: boolean };
};

export const test = base.extend<Fixtures>({
  allowPageErrors: async ({}, use) => {
    await use({ value: false });
  },
  pageErrors: [
    async ({ page, allowPageErrors }, use, testInfo) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
      page.on('console', (m) => {
        if (m.type() !== 'error') return;
        const text = m.text();
        // A missing favicon is the server's business, not the component's.
        if (/favicon|Failed to load resource: the server responded with a status of 404/.test(text)) return;
        errors.push(`[console.error] ${text}`);
      });
      await use(errors);
      if (!allowPageErrors.value && testInfo.status === testInfo.expectedStatus && testInfo.expectedStatus === 'passed') {
        expect(errors, 'the page logged errors').toEqual([]);
      }
    },
    { auto: true },
  ],
});

/**
 * Marks the current test as an expected failure tied to a tracked issue.
 * The test still asserts the CORRECT behaviour: Playwright reports it as
 * "expected to fail" while the bug exists and turns it red the moment the
 * bug is fixed, so the marker is removed together with the fix.
 *
 *   expectedFailure('#61', 'void-input is emptied by a Turbo morph');
 *   expectedFailure('firefox:select-typeahead', '...', { browsers: ['firefox'] });
 */
export function expectedFailure(issue: KnownIssue, detail: string, opts: { browsers?: string[] } = {}): void {
  const info = base.info();
  const applies = !opts.browsers || opts.browsers.includes(info.project.use.browserName ?? info.project.name);
  if (!applies) return;
  info.annotations.push({ type: 'expected failure', description: `${issue} (${KNOWN_ISSUES[issue]}): ${detail}` });
  base.fail(true, `${issue}: ${detail}`);
}

/** Waits until every Lit element on the page has finished updating and two frames have painted. */
export async function settle(page: Page, rootSelector?: string): Promise<void> {
  await page.evaluate(async (sel) => {
    const root = sel ? document.querySelector(sel) ?? document : document;
    await (window as any).__settle(root);
  }, rootSelector ?? null);
}

/** Opens a page from tests/browser/pages and waits for its components. */
export async function load(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForFunction(() => typeof (window as any).__settle === 'function' && !!customElements.get('void-button'));
  await settle(page);
}

/**
 * True when a user could see the element: it has a box, is not hidden by
 * visibility or opacity, and a hit test at its centre lands on it or inside it.
 */
export async function isPerceivable(locator: Locator): Promise<boolean> {
  return locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    for (let n: Element | null = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false;
    }
    const x = Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1);
    const y = Math.min(Math.max(r.top + r.height / 2, 0), innerHeight - 1);
    const hit = document.elementFromPoint(x, y);
    return !!hit && (hit === el || el.contains(hit) || hit.contains(el));
  });
}

/** A short description of document.activeElement: `tag#id` or `tag[role]"label"`. */
export async function focused(page: Page): Promise<string> {
  return page.evaluate(() => {
    const a = document.activeElement;
    if (!a || a === document.body) return 'body';
    const label = a.getAttribute('aria-label') || (a.textContent || '').trim().slice(0, 20);
    return `${a.tagName.toLowerCase()}${a.id ? '#' + a.id : ''}${a.getAttribute('role') ? `[${a.getAttribute('role')}]` : ''}${label ? ` "${label}"` : ''}`;
  });
}

/** The id of the focused element or, failing that, of its nearest ancestor with an id. */
export async function focusedId(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    let a: Element | null = document.activeElement;
    while (a && !a.id) a = a.parentElement;
    return a?.id ?? null;
  });
}
