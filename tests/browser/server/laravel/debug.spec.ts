import { test, ready } from '../shared';

test('debug nav', async ({ page, allowErrors }) => {
  allowErrors.push('Cannot read');
  page.on('pageerror', (e) => console.log('PERR', e.message, (e.stack ?? '').split('\n').slice(0, 8).join('|')));
  await page.goto('/lab');
  await ready(page);
  await page.click('#to-two');
  await page.waitForTimeout(1500);
  console.log('STEP back');
  await page.goBack();
  await page.waitForTimeout(1500);
  console.log('STEP end');
});
