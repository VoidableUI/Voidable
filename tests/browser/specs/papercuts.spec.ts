// SPDX-License-Identifier: MIT
//
// Component papercuts (#39) in a real browser: names and descriptions that go
// stale when content is replaced, keyboard focus after a hover-card was
// dismissed, host labelling of components with an inner control, list roles,
// the date-picker field and the charts' geometry.
import { test, expect, load, type Page } from '../helpers/test';

async function mount(page: Page, html: string): Promise<void> {
  await page.evaluate(async (h) => {
    const d = document.createElement('div');
    d.id = 'case';
    d.innerHTML = h;
    document.body.append(d);
    await (window as any).__settle(d);
  }, html);
}

test.beforeEach(async ({ page }) => {
  await load(page, '/blank');
});

test.describe('hover-card after Escape', () => {
  test('keyboard focus that arrives after a hover was dismissed with Escape opens it', async ({ page }) => {
    await mount(page, `
      <button id="before">before</button>
      <void-hover-card id="hc" open-delay="0" close-delay="0"><a id="t" href="#">Trigger</a><p>Card</p></void-hover-card>`);
    await page.hover('#t');
    await expect.poll(() => page.evaluate(() => (document.getElementById('hc') as any).open)).toBe(true);
    await page.keyboard.press('Escape');
    await expect.poll(() => page.evaluate(() => (document.getElementById('hc') as any).open)).toBe(false);
    // The pointer stays where it was; the keyboard user tabs onto the trigger.
    await page.focus('#before');
    await page.keyboard.press('Tab');
    await expect(page.locator('#t')).toBeFocused();
    await expect.poll(() => page.evaluate(() => (document.getElementById('hc') as any).open)).toBe(true);
  });

  test('Escape with focus on the trigger keeps it closed while focus stays there', async ({ page }) => {
    await mount(page, `<void-hover-card id="hc" open-delay="0" close-delay="0"><a id="t" href="#">Trigger</a><p>Card</p></void-hover-card>`);
    await page.focus('#t');
    await expect.poll(() => page.evaluate(() => (document.getElementById('hc') as any).open)).toBe(true);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    expect(await page.evaluate(() => (document.getElementById('hc') as any).open)).toBe(false);
    await expect(page.locator('#t')).toBeFocused();
  });
});

test.describe('names that follow replaced content', () => {
  test('dropdown-menu names its menu after the current trigger, or nothing', async ({ page }) => {
    await mount(page, `<void-dropdown-menu id="dd"><button id="t1">Actions</button><void-dropdown-menu-item>A</void-dropdown-menu-item></void-dropdown-menu>`);
    const named = () => page.evaluate(() => {
      const id = document.querySelector('#dd [role=menu]')!.getAttribute('aria-labelledby');
      return id === null ? null : (document.getElementById(id)?.textContent ?? 'MISSING');
    });
    expect(await named()).toBe('Actions');
    await page.evaluate(async () => {
      document.getElementById('dd')!.textContent = 'Menu';
      await (window as any).__settle(document);
    });
    expect(await named()).toBe(null);
    await page.evaluate(async () => {
      document.getElementById('dd')!.innerHTML = '<button>New</button><void-dropdown-menu-item>B</void-dropdown-menu-item>';
      await (window as any).__settle(document);
    });
    expect(await named()).toBe('New');
  });

  test('tooltip: innerHTML += on the region leaves one description and none that dangle', async ({ page }) => {
    await mount(page, `<div id="region"><void-tooltip><void-tooltip-trigger><button aria-describedby="other">Hover</button></void-tooltip-trigger><void-tooltip-content>Hint</void-tooltip-content></void-tooltip></div><p id="other">Other</p>`);
    for (let i = 0; i < 3; i++) {
      await page.evaluate(async () => {
        document.getElementById('region')!.innerHTML += '';
        await (window as any).__settle(document);
      });
    }
    const tokens = await page.evaluate(() => (document.querySelector('#region button')!.getAttribute('aria-describedby') ?? '').split(/\s+/));
    expect(tokens[0]).toBe('other');
    expect(tokens).toHaveLength(2);
    for (const t of tokens) expect(await page.evaluate((id) => !!document.getElementById(id), t)).toBe(true);
  });
});

test.describe('toggle-group initial value', () => {
  test('pressed toggles in server markup set the value, submitted with the form', async ({ page }) => {
    await mount(page, `<form id="f"><void-toggle-group name="align" aria-label="Align"><void-toggle value="l">L</void-toggle><void-toggle value="c" pressed>C</void-toggle></void-toggle-group></form>`);
    expect(await page.evaluate(() => [...new FormData(document.getElementById('f') as HTMLFormElement)])).toEqual([['align', 'c']]);
    await expect(page.locator('void-toggle[value=c]')).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('host labelling', () => {
  const CASES: [string, string][] = [
    ['void-select', '<option value="a">A</option>'],
    ['void-input', ''],
    ['void-textarea', ''],
    ['void-number-input', ''],
    ['void-combobox', '<void-option value="a">A</void-option>'],
    ['void-multiselect', '<void-option value="a">A</void-option>'],
    ['void-date-picker', ''],
    ['void-slider', ''],
    ['void-tags-input', ''],
    ['void-action-input', ''],
    ['void-compose-input', ''],
  ];
  for (const [tag, inner] of CASES) {
    test(`${tag}: aria-label and aria-labelledby on the host name its control`, async ({ page }) => {
      await mount(page, `<p id="lbl">Shipping country</p><${tag} id="a" aria-label="Country">${inner}</${tag}><${tag} id="b" aria-labelledby="lbl">${inner}</${tag}>`);
      await expect(page.getByLabel('Country', { exact: true })).toHaveCount(1);
      await expect(page.getByLabel('Shipping country', { exact: true })).toHaveCount(1);
      // The named element is inside the component, and is what takes focus.
      expect(await page.getByLabel('Country', { exact: true }).evaluate((el) => el.closest('#a') !== null && el !== el.closest('#a'))).toBe(true);
    });
  }
});

test.describe('void-tag roles', () => {
  test('a listitem only inside a list', async ({ page }) => {
    await mount(page, `<p id="loose"><void-tag>Loose</void-tag></p><div role="list" id="marked"><void-tag>One</void-tag></div><void-list id="vl"><void-tag>Two</void-tag></void-list>`);
    await expect(page.locator('#loose void-tag')).not.toHaveAttribute('role', /.*/);
    await expect(page.locator('#marked void-tag')).toHaveAttribute('role', 'listitem');
    await expect(page.locator('#vl void-tag')).toHaveAttribute('role', 'listitem');
  });
});

test.describe('date-picker field', () => {
  test('a click on the text keeps focus in the field and opens the calendar; ArrowDown moves into it', async ({ page }) => {
    await mount(page, `<div style="width:120px"><void-date-picker id="dp" aria-label="Date"></void-date-picker></div>`);
    const input = page.locator('#dp .void-date-picker-input');
    const box = (await input.boundingBox())!;
    // The calendar button never sits over the centre of the field, even in a narrow column.
    const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.className, [box.x + box.width / 2, box.y + box.height / 2]);
    expect(hit).toBe('void-date-picker-input');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect.poll(() => page.evaluate(() => (document.getElementById('dp') as any).open)).toBe(true);
    await expect(input).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('void-calendar'))).toBe(true);
  });

  test('the calendar button moves focus into the calendar', async ({ page }) => {
    await mount(page, `<void-date-picker id="dp" aria-label="Date"></void-date-picker>`);
    await page.click('#dp .void-date-picker-icon');
    await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('void-calendar'))).toBe(true);
  });
});

test.describe('charts', () => {
  test('a single 100% donut segment is a closed ring with no seam', async ({ page }) => {
    await mount(page, `<void-donut-chart id="d" size="200" aria-label="All"></void-donut-chart>`);
    await page.evaluate(async () => {
      const d = document.getElementById('d') as any;
      d.data = { segments: [{ name: 'Only', value: 7 }] };
      await new Promise((r) => setTimeout(r, 1500));
      await (window as any).__settle(document);
    });
    expect(await page.locator('#d .void-donut-chart-segment').getAttribute('d')).not.toContain('L');
    const svg = page.locator('#d svg');
    const box = (await svg.boundingBox())!;
    // A row through the top of the ring, where the seam was: every pixel the same colour.
    const shot = await page.screenshot({ clip: { x: box.x + box.width / 2 - 3, y: box.y + 4, width: 6, height: 14 } });
    const ok = await page.evaluate(async (b64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const g = c.getContext('2d')!;
      g.drawImage(img, 0, 0);
      const row = Math.floor(img.height / 2);
      const px = Array.from({ length: img.width }, (_, x) => Array.from(g.getImageData(x, row, 1, 1).data));
      return px.map((p) => Math.abs(p[0]! - px[0]![0]!) + Math.abs(p[1]! - px[0]![1]!) + Math.abs(p[2]! - px[0]![2]!)).every((d) => d < 40);
    }, shot.toString('base64'));
    expect(ok).toBe(true);
  });

  test('negative bar values are bars below a zero baseline', async ({ page }) => {
    await mount(page, `<void-bar-chart id="b" aria-label="Net"></void-bar-chart>`);
    await page.evaluate(async () => {
      (document.getElementById('b') as any).data = { series: [{ name: 'Net', values: [4, -3] }], labels: ['Q1', 'Q2'] };
      await new Promise((r) => setTimeout(r, 1500));
      await (window as any).__settle(document);
    });
    const geo = await page.evaluate(() => {
      const base = document.querySelector('#b .void-bar-chart-baseline')!.getBoundingClientRect();
      const [pos, neg] = [...document.querySelectorAll('#b .void-bar-chart-bar')].map((r) => r.getBoundingClientRect());
      return { zero: base.top, posTop: pos!.top, posBottom: pos!.bottom, negTop: neg!.top, negBottom: neg!.bottom, posH: pos!.height, negH: neg!.height };
    });
    // Within the hairline's own pixel snapping.
    expect(Math.abs(geo.posBottom - geo.zero)).toBeLessThan(2);
    expect(Math.abs(geo.negTop - geo.zero)).toBeLessThan(2);
    expect(geo.negBottom).toBeGreaterThan(geo.zero + 10);
    // Heights in proportion to the values.
    expect(geo.negH / geo.posH).toBeCloseTo(3 / 4, 1);
  });
});
