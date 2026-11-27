// SPDX-License-Identifier: MIT
//
// A void-button with an author-set aria-disabled="true" (#105): disabled but still in the tab order, so a keyboard
// or screen-reader user can reach it and hear why (aria-describedby); click, Enter, Space, form submission and link
// navigation do nothing; removing the attribute restores it. Real `disabled` keeps its meaning.
import { test, expect, load, type Page } from '../helpers/test';

test.beforeEach(async ({ page }) => {
  await load(page, '/blank');
});

async function mount(page: Page, html: string): Promise<void> {
  await page.evaluate(async (h) => {
    const d = document.createElement('div');
    d.id = 'case';
    d.innerHTML = h;
    document.body.append(d);
    await (window as any).__settle(d);
  }, html);
}

const REASON = 'Choose a station first.';

test('reached by Tab, announced as disabled with its reason, and does nothing', async ({ page }) => {
  await mount(
    page,
    `<button id="before">Before</button>
     <void-button id="b" aria-disabled="true" aria-describedby="why">Save</void-button>
     <p id="why">${REASON}</p>
     <button id="after">After</button>`,
  );
  await page.evaluate(() => {
    (window as any).activations = 0;
    document.getElementById('b')!.addEventListener('click', () => (window as any).activations++);
    document.addEventListener('void-click', () => (window as any).activations++);
  });
  const b = page.getByRole('button', { name: 'Save' });
  await page.locator('#before').focus();
  await page.keyboard.press('Tab');
  await expect(b).toBeFocused();
  await expect(b).toHaveAttribute('aria-disabled', 'true');
  await expect(b).toHaveAccessibleDescription(REASON);
  await expect(b).toBeDisabled(); // Playwright treats aria-disabled as disabled

  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  await b.click({ force: true });
  expect(await page.evaluate(() => (window as any).activations)).toBe(0);
  await expect(b).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(page.locator('#after')).toBeFocused();
});

test('a real disabled button leaves the tab order', async ({ page }) => {
  await mount(page, `<button id="before">Before</button><void-button id="b" disabled>Save</void-button><button id="after">After</button>`);
  await page.locator('#before').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('#after')).toBeFocused();
});

test('type="submit" inside a form does not submit, and submits again once enabled', async ({ page }) => {
  await mount(
    page,
    `<form id="f"><input aria-label="Name" id="name"><void-button id="b" type="submit" aria-disabled="true">Send</void-button></form>`,
  );
  await page.evaluate(() => {
    (window as any).submits = 0;
    document.getElementById('f')!.addEventListener('submit', (e) => {
      e.preventDefault();
      (window as any).submits++;
    });
  });
  const b = page.locator('#b');
  await b.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  await b.click({ force: true });
  expect(await page.evaluate(() => (window as any).submits)).toBe(0);

  await page.evaluate(() => document.getElementById('b')!.removeAttribute('aria-disabled'));
  await b.click();
  expect(await page.evaluate(() => (window as any).submits)).toBe(1);
  await expect(b).not.toHaveAttribute('aria-disabled', /.*/);
});

test('a link button stays focusable, is aria-disabled, carries the reason and does not navigate', async ({ page }) => {
  await mount(
    page,
    `<button id="before">Before</button>
     <void-button id="b" aria-disabled="true" aria-describedby="why"><a href="#went">Docs</a></void-button>
     <p id="why">${REASON}</p>`,
  );
  const link = page.getByRole('link', { name: 'Docs' });
  await page.locator('#before').focus();
  await page.keyboard.press('Tab');
  await expect(link).toBeFocused();
  await expect(link).toHaveAttribute('aria-disabled', 'true');
  await expect(link).toHaveAccessibleDescription(REASON);
  await page.keyboard.press('Enter');
  await link.click({ force: true });
  expect(new URL(page.url()).hash).toBe('');

  await page.evaluate(() => document.getElementById('b')!.removeAttribute('aria-disabled'));
  await expect(link).not.toHaveAttribute('aria-disabled', /.*/);
  await link.click();
  expect(new URL(page.url()).hash).toBe('#went');
});

test('it looks disabled but its focus ring is not dimmed', async ({ page }) => {
  await mount(page, `<void-button id="b" aria-disabled="true">Save</void-button>`);
  const b = page.locator('#b');
  await page.keyboard.press('Tab');
  await expect(b).toBeFocused();
  const look = await b.evaluate((el) => {
    const s = getComputedStyle(el);
    return { opacity: s.opacity, cursor: s.cursor, outlineStyle: s.outlineStyle, outlineWidth: parseFloat(s.outlineWidth) };
  });
  expect(look.opacity).toBe('1');
  expect(look.cursor).toBe('not-allowed');
  expect(look.outlineStyle).not.toBe('none');
  expect(look.outlineWidth).toBeGreaterThan(0);
});
