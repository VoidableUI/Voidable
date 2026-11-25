// SPDX-License-Identifier: MIT
//
// Replays scenarios against the browser's accessibility tree instead of a screen
// reader: for every step, the same Fact a screen reader is expected to speak is
// asserted through Playwright's role queries, so a failure here is a failure of
// the page or the library, and a pass narrows a later screen-reader failure to
// the screen-reader layer. Runs in the normal browser suite (Chromium, Firefox).
import { expect, type Locator, type Page } from '@playwright/test';
import { test, load, settle, expectedFailure } from '../helpers/test';
import type { Fact, Scenario } from './facts';
import { describeFact } from './words';

const FOCUS_ONLY = new Set(['slider', 'spinbutton', 'textbox', 'searchbox', 'combobox']);

/** The element a Fact describes, by role and name (and text or group), as a user agent exposes it. */
export function locate(page: Page, fact: Fact): Locator {
  const scope = fact.group ? page.getByRole(fact.group.role as never, { name: fact.group.name, exact: true }) : page;
  const opts: Parameters<Page['getByRole']>[1] = {};
  if (fact.name !== undefined) {
    opts.name = fact.name;
    opts.exact = true;
  }
  if (fact.level !== undefined) opts.level = fact.level;
  if (fact.expanded !== undefined) opts.expanded = fact.expanded;
  if (fact.checked !== undefined) opts.checked = fact.checked;
  if (fact.selected !== undefined) opts.selected = fact.selected;
  if (fact.disabled !== undefined) opts.disabled = fact.disabled;
  let loc = scope.getByRole(fact.role as never, opts);
  if (fact.text !== undefined) loc = loc.filter({ hasText: fact.text });
  return loc;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Asserts a Fact is true of the page now. */
export async function expectFact(page: Page, fact: Fact): Promise<Locator> {
  const what = describeFact(fact);
  const loc = locate(page, fact);
  await expect(loc, `exposed in the accessibility tree: ${what}`).toHaveCount(1);
  if (fact.description !== undefined && fact.describedByReference) {
    await expect
      .poll(() => loc.evaluate((el) => ((el as Element & { ariaDescribedByElements?: Element[] | null }).ariaDescribedByElements ?? []).map((e) => e.textContent).join(' ')), {
        message: `ariaDescribedByElements of ${what}`,
      })
      .toContain(fact.description);
  } else if (fact.description !== undefined) {
    await expect(loc, `description of ${what}`).toHaveAccessibleDescription(new RegExp(escapeRe(fact.description)));
  }
  if (fact.required !== undefined) {
    await expect
      .poll(() => loc.evaluate((el) => (el as HTMLInputElement).required === true || el.getAttribute('aria-required') === 'true'), { message: `required of ${what}` })
      .toBe(fact.required);
  }
  if (fact.invalid !== undefined) {
    await expect
      .poll(() => loc.evaluate((el) => el.getAttribute('aria-invalid') === 'true'), { message: `invalid of ${what}` })
      .toBe(fact.invalid);
  }
  if (fact.current !== undefined) {
    await expect
      .poll(() => loc.evaluate((el) => !!el.closest('[aria-current]:not([aria-current="false"])')), { message: `aria-current of ${what}` })
      .toBe(fact.current);
  }
  if (fact.value !== undefined) {
    await expect
      .poll(
        () =>
          loc.evaluate((el) => {
            if (el instanceof HTMLSelectElement) return el.selectedOptions[0]?.textContent?.trim() ?? '';
            return el.getAttribute('aria-valuenow') ?? (el as HTMLInputElement).value ?? '';
          }),
        { message: `value of ${what}` },
      )
      .toBe(fact.value);
  }
  if (fact.position) {
    const { n, of, within } = fact.position;
    const siblings = page.locator(within).getByRole(fact.role as never);
    await expect(siblings, `${what}: ${of} ${fact.role} elements in ${within}`).toHaveCount(of);
    if (fact.name !== undefined) await expect(siblings.nth(n - 1), `${what} is number ${n} of ${of}`).toHaveAccessibleName(fact.name);
  }
  if (fact.header !== undefined) {
    const header = fact.header;
    await expect
      .poll(
        () =>
          loc.evaluate((cell, h) => {
            const td = cell as HTMLTableCellElement;
            const table = td.closest('table');
            const col = td.cellIndex;
            const th = table?.querySelector('thead tr')?.children[col] ?? null;
            return (th?.textContent ?? '').trim() === h;
          }, header),
        { message: `column header of ${what}` },
      )
      .toBe(true);
  }
  return loc;
}

/** What activating an element does with a pointer-free user: click it, or just take focus for text-like controls. */
async function activate(page: Page, fact: Fact): Promise<void> {
  // By identity only: the states in the Fact are as they were when it was reached.
  const loc = locate(page, { role: fact.role, name: fact.name, text: fact.text, group: fact.group });
  if (FOCUS_ONLY.has(fact.role)) await loc.focus();
  else await loc.click();
}

/** Registers one test per scenario that replays its steps against the accessibility tree. */
export function treeSuite(title: string, scenarios: Scenario[]): void {
  test.describe(title, () => {
    for (const scenario of scenarios) {
      test(scenario.id, async ({ page }) => {
        if (scenario.knownIssue) expectedFailure(scenario.knownIssue.key, scenario.knownIssue.detail);
        await load(page, scenario.page);
        let current: { loc: Locator; fact: Fact } | null = null;
        for (const [i, step] of scenario.steps.entries()) {
          await test.step(`${i + 1}. ${JSON.stringify(step, (_k, v) => (v instanceof RegExp ? String(v) : typeof v === 'function' ? '[function]' : v))}`, async () => {
            if ('reach' in step) {
              const loc = await expectFact(page, step.reach);
              // A focusable element takes focus, as a screen reader's cursor or Tab would.
              await loc.focus().catch(() => {});
              current = { loc, fact: step.reach };
            } else if ('act' in step) {
              expect(current, 'act needs an element reached first').not.toBeNull();
              await activate(page, current!.fact);
              await settle(page);
            } else if ('press' in step) {
              await page.keyboard.press(step.press);
              await settle(page);
            } else if ('type' in step) {
              await page.keyboard.type(step.type);
              await settle(page);
            } else if ('hear' in step) {
              await expectFact(page, step.hear);
            } else if ('walk' in step) {
              // Content behind a modal is inert: it cannot take focus, and so a screen reader cannot reach it.
              const loc = locate(page, step.unreachable);
              const reachable = await loc.evaluate((el) => {
                const prev = document.activeElement as HTMLElement | null;
                (el as HTMLElement).focus();
                const got = document.activeElement === el;
                prev?.focus();
                return got;
              });
              expect(reachable, `${describeFact(step.unreachable)} must not be reachable`).toBe(false);
            } else if ('cell' in step) {
              // Cell navigation has no tree equivalent beyond the cell and its header, asserted by the hear step.
            } else if ('focus' in step) {
              await expect
                .poll(() => page.evaluate((sel) => !!document.activeElement?.closest(sel), step.focus), { message: `focus inside ${step.focus}` })
                .toBe(true);
            } else if ('check' in step) {
              await step.check(page);
            }
          });
        }
      });
    }
  });
}
