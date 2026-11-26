import { test, ready } from '../shared';

test.use({});
test('debug nav', async ({ page, allowErrors }) => {
  allowErrors.push('Cannot read');
  page.on('pageerror', (e) => console.log('PERR', e.message, (e.stack ?? '').split('\n').slice(0, 6).join('|')));
  await page.goto('/lab');
  await ready(page);
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('void-tags-input,void-multiselect,void-checkbox-group'))
      console.log('EL', el.tagName, el.outerHTML.slice(0, 120));
  });
  page.on('console', (m) => m.text().startsWith('EL') && console.log('PAGE', m.text()));
  await page.click('#to-two');
  await page.waitForTimeout(1500);
});
