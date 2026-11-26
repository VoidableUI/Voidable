import { test, ready } from '../shared';

test('debug nav', async ({ page, allowErrors }) => {
  allowErrors.push('Cannot read');
  page.on('pageerror', (e) => console.log('PERR', e.message, (e.stack ?? '').split('\n').slice(0, 8).join('|')));
  await page.goto('/lab');
  await ready(page);
  await page.locator('#i-name input').fill('before leaving');
  await page.click('#to-two');
  await ready(page);
  console.log('STEP two');
  await page.locator('#two-note input').fill('on page two');
  await page.locator('#two-choice select').selectOption('y');
  await page.waitForTimeout(800);
  await page.click('#two-count');
  await page.waitForTimeout(800);
  console.log('STEP back');
  await page.goBack();
  await ready(page);
  await page.locator('#i-name input').fill('after coming back');
  await page.click('#bump');
  await page.waitForTimeout(800);
  console.log('STEP forward');
  await page.goForward();
  await ready(page);
  await page.waitForTimeout(800);
  console.log('STEP end');
});
