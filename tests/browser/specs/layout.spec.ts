// SPDX-License-Identifier: MIT
//
// Layout regressions found in real pages: link buttons, cards in flex
// columns, overlays escaping a card, and pagination links that navigate.
import { test, expect, load, isPerceivable, type Page } from '../helpers/test';

test.describe('layout page', () => {
  test.beforeEach(async ({ page }) => {
    await load(page, '/layout');
  });

  test('a link button has the size of the plain button and its anchor fills it', async ({ page }) => {
    const rows = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('[data-pair]')].map((plain) => {
        const name = plain.dataset.pair!;
        const link = document.querySelector<HTMLElement>(`[data-link="${name}"]`)!;
        const a = link.querySelector('a')!.getBoundingClientRect();
        const p = plain.getBoundingClientRect();
        const l = link.getBoundingClientRect();
        // The anchor fills the host's padding box (inside its border).
        return { name, dw: Math.abs(p.width - l.width), dh: Math.abs(p.height - l.height), fillW: Math.abs(a.width - link.clientWidth), fillH: Math.abs(a.height - link.clientHeight) };
      }),
    );
    for (const r of rows) {
      // Text widths match, so the boxes should too, to within a pixel.
      expect(r.dh, `${r.name}: height`).toBeLessThanOrEqual(1);
      expect(r.dw, `${r.name}: width`).toBeLessThanOrEqual(1);
      expect(r.fillW, `${r.name}: anchor width`).toBeLessThanOrEqual(1);
      expect(r.fillH, `${r.name}: anchor height`).toBeLessThanOrEqual(1);
    }
  });

  test('clicking anywhere on a link button follows the link, including its padding', async ({ page }) => {
    const link = page.locator('[data-link="xl"]');
    const box = (await link.boundingBox())!;
    await page.mouse.click(box.x + 3, box.y + 3);
    await expect(page).toHaveURL(/#xl$/);
  });

  test('cards in a fixed-height flex column keep their content height instead of shrinking', async ({ page }) => {
    const r = await page.evaluate(() =>
      ['c1', 'c2'].map((id) => {
        const card = document.getElementById(id)!;
        const p = card.querySelector('p')!;
        return { id, cardHeight: card.getBoundingClientRect().height, contentHeight: p.getBoundingClientRect().height, scrolls: card.scrollHeight > card.clientHeight && getComputedStyle(card).overflowY !== 'visible' };
      }),
    );
    for (const c of r) {
      expect(c.cardHeight, `${c.id} shrank below its content`).toBeGreaterThanOrEqual(c.contentHeight);
      expect(c.scrolls, `${c.id} became a scroll container`).toBe(false);
    }
  });

  test('a scrollable card fills its flex slot and scrolls its body', async ({ page }) => {
    const r = await page.evaluate(() => {
      const card = document.getElementById('c3')!;
      const scroller = [card, ...card.querySelectorAll('*')].find((e) => e.scrollHeight > e.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(e).overflowY));
      return { height: Math.round(card.getBoundingClientRect().height), scrolls: !!scroller };
    });
    expect(r.height).toBe(300);
    expect(r.scrolls).toBe(true);
  });

  async function fullyVisible(page: Page, selector: string) {
    // Every corner of the open panel must be hit-testable as the panel itself, not clipped by the card.
    await page.locator(selector).scrollIntoViewIfNeeded();
    return page.evaluate((sel) => {
      const panel = document.querySelector(sel)!;
      const r = panel.getBoundingClientRect();
      const pts = [[r.left + 4, r.top + 4], [r.right - 4, r.top + 4], [r.left + 4, r.bottom - 4], [r.right - 4, r.bottom - 4]];
      return pts.every(([x, y]) => { const h = document.elementFromPoint(x, y); return !!h && (panel === h || panel.contains(h)); });
    }, selector);
  }

  test('overlays opened inside a card are not clipped by it', async ({ page }) => {
    await page.locator('#card').scrollIntoViewIfNeeded();
    await page.locator('#dd-t').click();
    await expect.poll(() => fullyVisible(page, '#dd .void-dropdown-menu-panel')).toBe(true);
    await page.keyboard.press('Escape');

    await page.locator('#po-t').click();
    await expect.poll(() => fullyVisible(page, '#po .void-popover-body')).toBe(true);
    await page.keyboard.press('Escape');

    await page.locator('#cb input').click();
    await expect.poll(() => isPerceivable(page.locator('#cb').getByRole('option', { name: 'Solid' }))).toBe(true);
    await page.keyboard.press('Escape');

    await page.locator('#ms .void-multiselect-trigger').click();
    await expect.poll(() => isPerceivable(page.locator('#ms').getByRole('option', { name: 'SQL' }))).toBe(true);
    await page.locator('h1, main').first().click({ position: { x: 900, y: 5 } });

    await page.locator('#dp input').click();
    await expect.poll(() => isPerceivable(page.locator('#dp').getByRole('button', { name: /November 30, 2026|December 5, 2026/ }).last())).toBe(true);
  });
});

test.describe('pagination in link mode', () => {
  for (const mode of ['href-template', 'param'] as const) {
    const start = (n: number) => `/app/pagination/s?page=${n}${mode === 'param' ? '&mode=param' : ''}`;
    const expectedUrl = (n: number) => (mode === 'param' ? new RegExp(`/app/pagination/s\\?(?=.*mode=param)(?=.*page=${n}(?!\\d)).*$`) : new RegExp(`/app/pagination/s\\?page=${n}&sort=a$`));

    for (const [how, from, target, to] of [
      ['click a number', 6, '7', 7],
      ['click Next', 6, 'Next page', 7],
      ['click Previous', 6, 'Previous page', 5],
      ['click Next on page 1', 1, 'Next page', 2],
      ['Enter on a number', 6, '5', 5],
    ] as const) {
      test(`${mode}: ${how} goes to page ${to}`, async ({ page }) => {
        await load(page, start(from));
        const link = /^\d+$/.test(target) ? page.locator('#pg a').filter({ hasText: new RegExp(`^${target}$`) }) : page.locator(`#pg a[aria-label="${target}"]`);
        const href = await link.getAttribute('href');
        if (how.startsWith('Enter')) {
          await link.focus();
          await page.keyboard.press('Enter');
        } else {
          await link.click();
        }
        await expect(page).toHaveURL(expectedUrl(to));
        await expect(page.locator('#current')).toHaveText(`Page ${to}`);
        expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe(href);
      });
    }

    test(`${mode}: the current page is marked and the first page has no previous link`, async ({ page }) => {
      await load(page, start(1));
      await expect(page.locator('#pg [aria-current="page"]')).toHaveText('1');
      await expect(page.locator('#pg a[aria-label="Previous page"]')).toHaveCount(0);
    });
  }

  test('a cancelled void-change keeps the page where it is', async ({ page }) => {
    await load(page, '/app/pagination/s?page=6');
    await page.evaluate(() => document.addEventListener('void-change', (e) => e.preventDefault()));
    await page.locator('#pg a').filter({ hasText: /^7$/ }).click();
    await expect(page.locator('#current')).toHaveText('Page 6');
    expect(new URL(page.url()).search).toBe('?page=6');
  });
});
