// SPDX-License-Identifier: MIT
//
// Server morphs (Turbo, morphdom with the LiveView callbacks, Alpine morph with the Livewire hooks) of collapsible,
// panel, banner, toast and error-fallback: the author's nodes, the generated default of an error fallback, client
// state and focus survive a server that repeats itself, and the result matches a fresh render when the server
// changes.
import { test, expect, load, settle, type Page } from '../helpers/test';

const ENGINES = ['turbo', 'morphdom', 'alpine'] as const;

function serverMarkup(v: number, o: { heading?: string; toast?: boolean; extraTitle?: boolean } = {}): string {
  return `
    <void-collapsible id="mc"><void-collapsible-trigger>Details ${v}</void-collapsible-trigger><void-collapsible-content><p id="mcp">Body ${v}</p></void-collapsible-content></void-collapsible>
    <void-panel id="mp"><void-panel-header><void-panel-title>Panel ${v}</void-panel-title></void-panel-header><void-panel-body>Panel body ${v}</void-panel-body></void-panel>
    <void-banner id="mb"><void-banner-description>Banner ${v}</void-banner-description><void-banner-close><button type="button" id="mb-x" aria-label="Dismiss">&times;</button></void-banner-close></void-banner>
    <void-alert id="ma"><void-alert-description>Alert ${v}</void-alert-description><void-alert-close><button type="button" id="ma-x" aria-label="Dismiss">&times;</button></void-alert-close></void-alert>
    <void-error-fallback id="me" heading="${o.heading ?? 'Oops'}" retryable></void-error-fallback>
    <void-error-fallback id="me2"><void-error-fallback-title>Mine ${v}</void-error-fallback-title>${o.extraTitle ? '<void-error-fallback-description>More</void-error-fallback-description>' : ''}<void-error-fallback-actions><button type="button" id="me2-b">Go</button></void-error-fallback-actions></void-error-fallback>
    <void-toast-container id="mt" position="inline">${o.toast === false ? '' : `<void-toast id="mtt" duration="0"><void-toast-title>Saved ${v}</void-toast-title><void-toast-description>Done</void-toast-description><void-toast-close><button type="button" id="mt-x" aria-label="Dismiss">&times;</button></void-toast-close></void-toast>`}</void-toast-container>`;
}

for (const engine of ENGINES) {
  test.describe(`${engine} morph of disclosure and notices`, () => {
    const render = (page: Page, html: string) => page.evaluate((h) => (window as any).__morph.render(h), html);
    const morph = (page: Page, html: string) => page.evaluate((h) => (window as any).__morph.morph(h), html);
    const fresh = (page: Page, html: string) => page.evaluate((h) => (window as any).__morph.fresh(h), html);
    const signature = (page: Page, id: string) =>
      page.evaluate((id) => (window as any).__signature(document.getElementById(id), { structureOnly: true }), id);

    test.beforeEach(async ({ page }) => {
      await load(page, `/morph-${engine}`);
      await render(page, serverMarkup(1));
    });

    test('a server that repeats itself changes nothing: same nodes, open state and focus kept', async ({ page }) => {
      await page.locator('#mc void-collapsible-trigger').click();
      await expect(page.locator('#mc')).toHaveAttribute('open', '');
      await page.locator('#me').getByRole('button', { name: 'Try again' }).focus();
      await page.evaluate(() => {
        (window as any).__all = [...document.getElementById('root')!.querySelectorAll('*')];
        (window as any).__retry = document.querySelector('#me button');
      });
      await morph(page, serverMarkup(1));
      const kept = await page.evaluate(() => {
        const now = [...document.getElementById('root')!.querySelectorAll('*')];
        const was: Element[] = (window as any).__all;
        return { same: now.length === was.length && now.every((e, i) => e === was[i]), focus: document.activeElement === (window as any).__retry };
      });
      expect(kept.same, 'every element is the same node').toBe(true);
      expect(kept.focus, 'focus stays on the retry button').toBe(true);
      await expect(page.locator('#mc')).toHaveAttribute('open', '');
      await expect(page.locator('#mc void-collapsible-trigger')).toHaveAttribute('aria-expanded', 'true');
      await expect(page.locator('#mp')).toHaveAttribute('aria-labelledby', /void-panel-title-/);
    });

    test('the server changes things: the result matches a fresh render and keeps its wiring', async ({ page }) => {
      await page.locator('#mc void-collapsible-trigger').click();
      await morph(page, serverMarkup(2, { heading: 'Different', extraTitle: true }));
      await fresh(page, serverMarkup(2, { heading: 'Different', extraTitle: true }));
      // The open state is the client's own: the server never rendered `open`.
      await page.evaluate(() => document.getElementById('ref')!.querySelector('#mc')!.setAttribute('open', ''));
      await settle(page);
      expect(await signature(page, 'root')).toEqual(await signature(page, 'ref'));
      await expect(page.locator('#root #me void-error-fallback-title')).toHaveText('Different');
      await expect(page.locator('#root #me2 void-error-fallback-description')).toHaveText('More');
      await expect(page.locator('#root').getByRole('region', { name: 'Panel 2' })).toBeVisible();
      await expect(page.locator('#root #mc void-collapsible-trigger')).toHaveText('Details 2');
    });

    test('an alert keeps its nodes through a morph and still dismisses once, with one void-close', async ({ page }) => {
      await page.evaluate(() => {
        (window as any).__all = [...document.getElementById('ma')!.querySelectorAll('*')];
        (window as any).__closes = 0;
        document.addEventListener('void-close', (e) => { if ((e.target as Element).id === 'ma') (window as any).__closes++; });
      });
      await morph(page, serverMarkup(1));
      await morph(page, serverMarkup(2));
      const same = await page.evaluate(() => {
        const now = [...document.getElementById('ma')!.querySelectorAll('*')];
        const was: Element[] = (window as any).__all;
        return now.length === was.length && now.every((e, i) => e === was[i]);
      });
      expect(same, 'the alert\'s elements are the same nodes').toBe(true);
      await expect(page.locator('#ma void-alert-description')).toHaveText('Alert 2');
      await page.locator('#ma-x').click();
      await expect(page.locator('#ma')).toHaveCount(0);
      expect(await page.evaluate(() => (window as any).__closes)).toBe(1);
    });

    test('a toast the server stops sending goes away and one it sends again comes back wired', async ({ page }) => {
      await morph(page, serverMarkup(1, { toast: false }));
      await expect(page.locator('#mt void-toast')).toHaveCount(0);
      await morph(page, serverMarkup(3));
      await expect(page.locator('#mt void-toast')).toHaveCount(1);
      await page.locator('#mt-x').click();
      await expect(page.locator('#mt void-toast')).toHaveCount(0);
    });

    test('an error fallback written with parts keeps them through a morph that changes their text', async ({ page }) => {
      await page.evaluate(() => ((window as any).__b = document.getElementById('me2-b')));
      await morph(page, serverMarkup(5));
      expect(await page.evaluate(() => document.getElementById('me2-b') === (window as any).__b)).toBe(true);
      await expect(page.locator('#root #me2 [data-void-default]')).toHaveCount(0);
      await expect(page.locator('#root #me2 void-error-fallback-title')).toHaveText('Mine 5');
    });
  });
}
