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
