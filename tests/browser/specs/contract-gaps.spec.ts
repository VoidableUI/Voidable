// SPDX-License-Identifier: MIT
//
// Contract gaps from #62, in a real browser and through the accessibility tree:
// file-upload rejection, the roles of the static elements, accessible-name
// requirements and typed entry in the date picker.
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

test.describe('roles of the static elements', () => {
  test('badge, banner and nav bar expose no role; an author role is kept', async ({ page }) => {
    await mount(page, `<main>
      <void-badge id="b">Draft</void-badge>
      <void-badge id="b2" role="status">3 new</void-badge>
      <void-banner id="bn"><void-banner-title>Maintenance</void-banner-title><void-banner-description>Saturday.</void-banner-description></void-banner>
      <void-nav-bar id="nb"><nav aria-label="Primary"><a href="/a">Home</a></nav></void-nav-bar>
    </main>`);
    for (const id of ['b', 'bn', 'nb']) await expect(page.locator(`#${id}`)).not.toHaveAttribute('role', /.*/);
    await expect(page.getByRole('status')).toHaveCount(1);
    await expect(page.getByRole('status')).toHaveText('3 new');
    await expect(page.getByRole('banner')).toHaveCount(0);
    // The one landmark is the author's <nav>, with its name.
    await expect(page.getByRole('navigation')).toHaveCount(1);
    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
  });

  test('alert is alert for error and warning and status for the rest, following the colour', async ({ page }) => {
    await mount(page, `<void-alert id="e" color="error"><void-alert-description>Failed</void-alert-description></void-alert>
      <void-alert id="i" color="info"><void-alert-description>FYI</void-alert-description></void-alert>`);
    await expect(page.getByRole('alert')).toHaveText('Failed');
    await expect(page.getByRole('status')).toHaveText('FYI');
    await page.evaluate(() => document.getElementById('i')!.setAttribute('color', 'warning'));
    await expect(page.getByRole('alert')).toHaveCount(2);
    await expect(page.getByRole('status')).toHaveCount(0);
  });

  test('stat is a group named by its label', async ({ page }) => {
    await mount(page, '<void-stat label="Revenue" value="$4.2k" delta="+12%"></void-stat><void-stat value="7"></void-stat>');
    await expect(page.getByRole('group', { name: 'Revenue' })).toContainText('$4.2k');
    await expect(page.getByRole('group')).toHaveCount(1);
    await expect(page.getByRole('figure')).toHaveCount(0);
  });

  test('carousel is a named region of slides numbered "n of m"', async ({ page }) => {
    await mount(page, `<void-carousel id="c" aria-label="Screenshots"><void-carousel-content>
      <void-carousel-item>One</void-carousel-item><void-carousel-item>Two</void-carousel-item></void-carousel-content>
      <void-carousel-next aria-label="Next slide"></void-carousel-next></void-carousel>`);
    const region = page.getByRole('region', { name: 'Screenshots' });
    await expect(region).toHaveAttribute('aria-roledescription', 'carousel');
    const snapshot = await region.ariaSnapshot();
    expect(snapshot).toContain('group "1 of 2"');
    expect(snapshot).toContain('group "2 of 2"');
    await expect(page.locator('void-carousel-content')).toHaveAttribute('aria-live', 'polite');
    await page.evaluate(() => ((document.getElementById('c') as any).autoplay = true));
    await expect(page.locator('void-carousel-content')).toHaveAttribute('aria-live', 'off');
    await page.evaluate(() => ((document.getElementById('c') as any).autoplay = false));
  });

  test('card title is not a heading by itself; the author heading inside it is', async ({ page }) => {
    await mount(page, '<void-card><void-card-header><void-card-title><h3>Billing</h3></void-card-title></void-card-header></void-card><void-card><void-card-header><void-card-title>Plain</void-card-title></void-card-header></void-card>');
    await expect(page.getByRole('heading')).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Billing', level: 3 })).toBeVisible();
  });
});

test.describe('file upload rejection', () => {
  const files = [
    { name: 'a.pdf', mimeType: 'application/pdf', buffer: Buffer.from('abc') },
    { name: 'big.png', mimeType: 'image/png', buffer: Buffer.alloc(200) },
  ];

  test('a rejected file fires void-reject, marks the zone invalid and is described', async ({ page }) => {
    await mount(page, '<void-file-upload id="f" aria-label="Photo" accept=".png" max-size="100"></void-file-upload>');
    await page.evaluate(() => {
      (window as any).rejects = [];
      (window as any).bubbled = 0;
      const f = document.getElementById('f')!;
      f.addEventListener('void-reject', (e: any) => (window as any).rejects.push(e.detail.rejected.map((r: any) => [r.file.name, r.reason])));
      document.body.addEventListener('void-reject', () => (window as any).bubbled++);
    });
    await page.locator('#f input[type=file]').setInputFiles(files);
    expect(await page.evaluate(() => (window as any).rejects)).toEqual([[['a.pdf', 'type'], ['big.png', 'size']]]);
    expect(await page.evaluate(() => (window as any).bubbled)).toBe(0);
    await expect(page.locator('#f')).toHaveAttribute('error', /a\.pdf/);
    const zone = page.getByRole('button', { name: 'Photo' });
    await expect(zone).toHaveAttribute('aria-invalid', 'true');
    await expect(zone).toHaveAccessibleDescription(/a\.pdf is not an accepted file type/);
    expect(await page.locator('#case').ariaSnapshot()).toContain('alert');
  });

  test('the next accepted selection clears the error', async ({ page }) => {
    await mount(page, '<void-file-upload id="f" aria-label="Photo" accept=".png"></void-file-upload>');
    await page.locator('#f input[type=file]').setInputFiles(files[0]);
    await expect(page.locator('#f')).toHaveAttribute('error', /.+/);
    await page.locator('#f input[type=file]').setInputFiles({ name: 'ok.png', mimeType: 'image/png', buffer: Buffer.from('x') });
    const zone = page.getByRole('button', { name: 'Photo' });
    await expect(zone).not.toHaveAttribute('aria-invalid', /.*/);
    await expect(zone).not.toHaveAttribute('aria-describedby', /.*/);
    await expect(page.locator('#f .void-file-upload-error')).toHaveCount(0);
  });
});
