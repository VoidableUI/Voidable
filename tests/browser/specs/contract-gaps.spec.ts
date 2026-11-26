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
  test('badge has no role, banner follows the alert, nav bar is one landmark that never nests', async ({ page }) => {
    await mount(page, `<main>
      <void-badge id="b">Draft</void-badge>
      <void-badge id="b2" role="status">3 new</void-badge>
      <void-banner id="bn"><void-banner-title>Maintenance</void-banner-title><void-banner-description>Saturday.</void-banner-description></void-banner>
      <void-banner id="bn2" color="error"><void-banner-description>Payments are down.</void-banner-description></void-banner>
    </main>
    <void-nav-bar id="nb" aria-label="Site"><a href="/a">Home</a></void-nav-bar>
    <void-nav-bar id="nb2"><nav aria-label="Primary"><a href="/a">Home</a></nav></void-nav-bar>`);
    await expect(page.locator('#b')).not.toHaveAttribute('role', /.*/);
    await expect(page.getByRole('status')).toHaveCount(2);
    await expect(page.getByRole('alert')).toHaveText(/Payments are down/);
    await expect(page.getByRole('banner')).toHaveCount(0);
    await expect(page.locator('#nb')).toHaveAttribute('role', 'navigation');
    await expect(page.locator('#nb2')).not.toHaveAttribute('role', /.*/);
    await expect(page.getByRole('navigation')).toHaveCount(2);
    await expect(page.getByRole('navigation', { name: 'Site' })).toBeVisible();
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

test.describe('accessible names', () => {
  test('progress, panel and table are found by their names', async ({ page }) => {
    await mount(page, `<void-progress value="40" aria-label="Uploading photo"></void-progress>
      <void-panel><void-panel-header><void-panel-title>Billing</void-panel-title></void-panel-header><void-panel-body>x</void-panel-body></void-panel>
      <void-panel aria-label="Notes"><void-panel-body>y</void-panel-body></void-panel>
      <void-table aria-label="Invoices"><table><thead><tr><th>No</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table></void-table>
      <void-table><table><caption>Receipts</caption><thead><tr><th>No</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table></void-table>`);
    await expect(page.getByRole('progressbar', { name: 'Uploading photo' })).toHaveAttribute('aria-valuenow', '40');
    await expect(page.getByRole('region', { name: 'Billing' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Notes' })).toBeVisible();
    await expect(page.getByRole('table', { name: 'Invoices' })).toBeVisible();
    await expect(page.getByRole('table', { name: 'Receipts' })).toBeVisible();
  });

  test('the hamburger is named by the author, constant while open, with "Menu" as the fallback', async ({ page }) => {
    await mount(page, '<void-hamburger id="h" aria-label="Main navigation"></void-hamburger><void-hamburger id="d"></void-hamburger>');
    await page.getByRole('button', { name: 'Main navigation' }).click();
    await expect(page.getByRole('button', { name: 'Main navigation', expanded: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
    await page.getByRole('button', { name: 'Menu' }).click();
    await expect(page.getByRole('button', { name: 'Close menu', expanded: true })).toBeVisible();
  });

  test('the open reason is keyboard for a key and trigger for a click', async ({ page }) => {
    await mount(page, '<void-hamburger id="h" aria-label="Nav"></void-hamburger>');
    await page.evaluate(() => {
      (window as any).reasons = [];
      document.getElementById('h')!.addEventListener('void-open', (e: any) => (window as any).reasons.push(e.detail.reason));
      document.getElementById('h')!.addEventListener('void-close', (e: any) => (window as any).reasons.push(`close:${e.detail.reason}`));
    });
    await page.getByRole('button', { name: 'Nav' }).focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    await page.getByRole('button', { name: 'Nav' }).click();
    expect(await page.evaluate(() => (window as any).reasons)).toEqual(['keyboard', 'close:trigger', 'trigger']);
  });
});

test.describe('date picker typed entry', () => {
  const picker = '<void-date-picker id="dp" aria-label="Start date" min="2026-01-01" max="2026-12-31"></void-date-picker>';
  const changes = (page: Page) => page.evaluate(() => (window as any).dpChanges as string[]);
  const prepare = async (page: Page, html = picker) => {
    await mount(page, html);
    await page.evaluate(() => {
      (window as any).dpChanges = [];
      document.getElementById('dp')!.addEventListener('void-change', (e: any) => (window as any).dpChanges.push(e.detail.value));
    });
  };

  test('a typed date is taken on blur: the value, the calendar and one void-change', async ({ page }) => {
    await prepare(page);
    const field = page.getByRole('combobox', { name: 'Start date' });
    await field.click();
    await field.fill('11/03/2026');
    await expect(page.locator('#dp')).toHaveAttribute('value', '');
    await page.keyboard.press('Tab');
    await expect(page.locator('#dp')).toHaveAttribute('value', '2026-11-03');
    expect(await changes(page)).toEqual(['2026-11-03']);
    await expect(field).not.toHaveAttribute('aria-invalid', /.*/);
    await field.press('ArrowDown');
    await expect(page.locator('#dp').getByRole('button', { name: 'Tuesday, November 3, 2026' })).toBeFocused();
  });

  test('Enter takes ISO text and the field shows it in the format', async ({ page }) => {
    await prepare(page);
    const field = page.getByRole('combobox', { name: 'Start date' });
    await field.fill('2026-02-05');
    await field.press('Enter');
    await expect(field).toHaveValue('02/05/2026');
    await expect(page.locator('#dp')).toHaveAttribute('value', '2026-02-05');
    expect(await changes(page)).toEqual(['2026-02-05']);
  });

  test('refused text stays, is invalid and described; a valid date clears it', async ({ page }) => {
    await prepare(page);
    const field = page.getByRole('combobox', { name: 'Start date' });
    await field.fill('02/30/2026');
    await page.keyboard.press('Tab');
    await expect(field).toHaveValue('02/30/2026');
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(field).toHaveAccessibleDescription(/Enter a date as MM\/DD\/YYYY or YYYY-MM-DD/);
    expect(await changes(page)).toEqual([]);
    await field.fill('12/31/2027');
    await page.keyboard.press('Tab');
    await expect(field).toHaveAccessibleDescription(/or an earlier date/);
    await field.fill('06/15/2026');
    await page.keyboard.press('Tab');
    await expect(field).not.toHaveAttribute('aria-invalid', /.*/);
    await expect(field).not.toHaveAttribute('aria-describedby', /.*/);
    expect(await changes(page)).toEqual(['2026-06-15']);
  });

  test('a patch of another attribute mid-edit does not wipe the typed text', async ({ page }) => {
    await prepare(page);
    const field = page.getByRole('combobox', { name: 'Start date' });
    await field.click();
    await page.keyboard.type('06/1');
    await page.evaluate(() => document.getElementById('dp')!.setAttribute('color', 'warning'));
    await page.evaluate(() => document.getElementById('dp')!.setAttribute('placeholder', 'Pick a day'));
    await expect(field).toHaveValue('06/1');
    await page.keyboard.type('5/2026');
    await expect(field).toHaveValue('06/15/2026');
  });

  test('a typed date in a form is submitted as ISO, and a refused one blocks the submit', async ({ page }) => {
    await mount(page, '<form id="f"><void-date-picker id="dp" name="when" aria-label="When"></void-date-picker></form>');
    const field = page.getByRole('combobox', { name: 'When' });
    await field.fill('03/04/2026');
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => new FormData(document.getElementById('f') as HTMLFormElement).get('when'))).toBe('2026-03-04');
    await field.fill('13/45/2026');
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => (document.getElementById('f') as HTMLFormElement).checkValidity())).toBe(false);
  });
});

test.describe('file upload rejection', () => {
  const files = [
    { name: 'a.pdf', mimeType: 'application/pdf', buffer: Buffer.from('abc') },
    { name: 'big.png', mimeType: 'image/png', buffer: Buffer.alloc(200) },
  ];

  test('a rejected file fires void-reject, marks the zone invalid and is described', async ({ page }) => {
    await mount(page, '<void-file-upload id="f" aria-label="Photo" accept=".png" max-size="100" multiple></void-file-upload>');
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
