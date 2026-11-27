// SPDX-License-Identifier: MIT
//
// Content Security Policy (#115): every component renders under
//   default-src 'self'; script-src 'self'; style-src 'self' 'report-sample'; img-src 'self' data:; font-src 'self'; connect-src 'self'
// (no 'unsafe-inline', no 'unsafe-eval') without a single violation, and loads nothing from another origin.
// The kitchen page is served with that policy as a real response header, with its own inline <style>, <script>
// and style="" attributes removed (they are the page's, not the library's); data is then set from the test.
import { test, expect, load, settle } from '../helpers/test';

const POLICY = "default-src 'self'; script-src 'self'; style-src 'self' 'report-sample'; img-src 'self' data:; font-src 'self'; connect-src 'self'";

test('every component renders under a strict Content Security Policy', async ({ page, baseURL }) => {
  await page.route('**/kitchen', async (route) => {
    const response = await route.fetch();
    const body = (await response.text())
      .replace(/<style>[\s\S]*?<\/style>/g, '')
      .replace(/<script>[\s\S]*?<\/script>/g, '')
      .replace(/\sstyle="[^"]*"/g, '');
    await route.fulfill({ response, body, headers: { ...response.headers(), 'content-security-policy': POLICY } });
  });
  const origin = new URL(baseURL ?? 'http://127.0.0.1:4417').origin;
  const foreign: string[] = [];
  page.on('request', (r) => {
    if (!r.url().startsWith(origin) && !r.url().startsWith('data:')) foreign.push(r.url());
  });
  await page.addInitScript(() => {
    (window as any).__violations = [];
    document.addEventListener('securitypolicyviolation', (e) => {
      (window as any).__violations.push(`${e.violatedDirective}: ${e.blockedURI} ${(e.target as Element)?.localName ?? ''} ${e.sample ?? ''}`);
    });
  });

  await load(page, '/kitchen');

  // Data-driven components, with values that exercise every inline custom property.
  await page.evaluate(() => {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const by = (id: string) => document.getElementById(id) as any;
    by('k-bar').data = { labels, series: [{ name: 'Requests', values: [12, 18, 16, 21, 19], color: '#3366ff' }, { name: 'Errors', values: [1, 2, 3, 2, 1] }] };
    by('k-line').data = { labels, series: [{ name: 'p95', values: [120, 140, 90, 110, 100], color: '#cc3366' }, { name: 'p50', values: [60, 70, 50, 55, 52] }] };
    by('k-donut').data = { segments: [{ name: 'Organic', value: 48, color: '#33aa66' }, { name: 'Referral', value: 23 }, { name: 'Direct', value: 29 }] };
    document.querySelector('main')!.insertAdjacentHTML(
      'beforeend',
      `<void-progress id="p-det" value="65" aria-label="Upload"></void-progress>
       <void-progress indeterminate aria-label="Working"></void-progress>
       <void-slider value="70" show-value aria-label="Volume"></void-slider>
       <void-textarea autosize rows="2" max-rows="6" aria-label="Notes"></void-textarea>
       <void-textarea resize="vertical" aria-label="Resizable"></void-textarea>
       <void-color-picker aria-label="Fill" value="#ff8800"></void-color-picker>
       <void-gauge id="g-zones" value="55" aria-label="Zones" zones='[{"from":0,"to":60,"color":"green"},{"from":60,"to":100,"color":"#cc3300"}]'></void-gauge>
       <void-gauge id="g-seg" aria-label="Segments" thickness="12" data='{"segments":[{"name":"Used","value":30},{"name":"Cache","value":20}]}'></void-gauge>`,
    );
  });
  await page.locator('void-textarea[autosize] textarea').fill('one\ntwo\nthree\nfour');
  await settle(page);
  await page.waitForTimeout(500);

  expect(await page.evaluate(() => (window as any).__violations)).toEqual([]);
  expect(await page.locator('#k-bar .void-bar-chart-bar').count()).toBeGreaterThan(0);
  expect(await page.locator('#g-zones .void-gauge-zone').count()).toBeGreaterThan(0);
  expect(await page.locator('#p-det .void-progress-fill').evaluate((el) => (el as HTMLElement).style.getPropertyValue('--void-progress-fill'))).toBe('65%');
  // The toast announcers' rule reached the shadow root.
  expect(await page.locator('void-toast-container').evaluate((c) => getComputedStyle(c.shadowRoot!.querySelector('[data-void-announcer]')!).position)).toBe('absolute');

  expect(await page.evaluate(() => (window as any).__violations)).toEqual([]);
  expect(foreign, 'requests to another origin').toEqual([]);
});
