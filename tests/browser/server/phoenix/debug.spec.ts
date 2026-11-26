import { test, settle, ready } from '../shared';

test('debug select', async ({ page }) => {
  page.on('console', (m) => console.log('PAGE', m.text()));
  await page.goto('/lab');
  await page.waitForSelector('.phx-connected');
  await ready(page);
  const snap = (label: string) =>
    page.evaluate((label) => {
      const el = document.getElementById('i-country') as any;
      return `${label}: attr=${el.getAttribute('value')} prop=${JSON.stringify(el.value)} native=${el.querySelector('select').value}`;
    }, label).then((s) => console.log('SNAP', s));
  await snap('start');
  await page.evaluate(() => {
    const el = document.getElementById('i-country')!;
    new MutationObserver((rs) => rs.forEach((r) => console.log('MUT', r.attributeName, 'old=' + r.oldValue, 'new=' + el.getAttribute(r.attributeName!), new Error().stack?.split('\n').slice(2, 4).join('|')))).observe(el, { attributes: true, attributeOldValue: true });
  });
  await page.evaluate(() => {
    const el = document.getElementById('i-country') as any;
    const orig = el.voidBeforeMorph.bind(el);
    el.voidBeforeMorph = (inc: Element) => {
      const before = `inc.value=${inc?.getAttribute('value')} live=${el.getAttribute('value')} incIsVoid=${inc instanceof HTMLElement && (inc as any).voidBeforeMorph !== undefined}`;
      const r = orig(inc);
      console.log('VBM', before, '=> inc.value now', inc?.getAttribute('value'));
      return r;
    };
    const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')!.set!;
    Object.defineProperty(el, 'value', { configurable: true, get: () => Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')!.get!.call(el), set: (v) => { console.log('SET value', JSON.stringify(v), new Error().stack?.split('\n').slice(2, 6).join('|')); set.call(el, v); } });
  });
  await page.locator('#i-country select').selectOption('au');
  await settle(page);
  await snap('after select');
  await page.click('#timer-on');
  await page.waitForTimeout(2500);
  await snap('after ticks');
  await page.click('#timer-off');
  await settle(page);
  await snap('end');
});
