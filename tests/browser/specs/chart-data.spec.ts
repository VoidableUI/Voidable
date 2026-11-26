// SPDX-License-Identifier: MIT
//
// Data from markup and the data table (#71), in a real layout engine and accessibility tree: a chart takes its
// data from the JSON `data` attribute, draws nothing for invalid JSON (and does not throw), keeps its data and
// does not animate again when a server morph leaves the attribute alone, and carries a data table that is out of
// sight, in the accessibility tree, with the drawing hidden from it.
import { test, expect, load, settle, type Page } from '../helpers/test';

const ENGINES = ['turbo', 'morphdom', 'alpine'] as const;

const BAR = `{"labels":["Mon","Tue","Wed"],"series":[{"name":"Visitors","values":[120,180,1500]}]}`;
const barHtml = (id: string, extra = '') => `<void-bar-chart id="${id}" aria-label="Visitors by day" ${extra} data='${BAR}'></void-bar-chart>`;

const add = (page: Page, html: string) => page.evaluate((h) => (window as any).addMarkup(h), html);
const count = (page: Page, sel: string) => page.locator(sel).count();

test.describe('on a page', () => {
  test.beforeEach(async ({ page }) => load(page, '/charts'));

  test('a chart draws from the data attribute with no script setting a property', async ({ page, pageErrors }) => {
    await add(page, `${barHtml('b')}
      <void-line-chart id="l" aria-label="Visits" data='{"labels":["a","b","c"],"series":[{"name":"Visits","values":[1,3,2]}]}'></void-line-chart>
      <void-donut-chart id="d" aria-label="Mix" data='{"segments":[{"name":"A","value":1},{"name":"B","value":2},{"name":"C","value":3}]}'></void-donut-chart>
      <void-gauge id="g" aria-label="Memory" data='{"segments":[{"name":"Used","value":30},{"name":"Cache","value":20}]}' zones='[{"from":0,"to":100,"color":"green"}]'></void-gauge>`);
    await expect(page.locator('#b .void-bar-chart-bar')).toHaveCount(3);
    await expect(page.locator('#l .void-line-chart-line')).toHaveCount(1);
    await expect(page.locator('#d .void-donut-chart-segment')).toHaveCount(3);
    await expect(page.locator('#g .void-gauge-segment')).toHaveCount(2);
    expect(await page.evaluate(() => (document.getElementById('b') as any).data)).toEqual(JSON.parse(BAR));
    expect(await page.evaluate(() => (document.getElementById('g') as any).zones)).toEqual([{ from: 0, to: 100, color: 'green' }]);
    expect(pageErrors).toEqual([]);
  });

  test('the bars are drawn at full height once the entrance is done', async ({ page }) => {
    await add(page, barHtml('b', 'style="--void-anim-scale: 0"'));
    await expect(page.locator('#b svg')).toHaveAttribute('data-phase', 'idle');
    const heights = await page.evaluate(() => [...document.querySelectorAll('#b .void-bar-chart-bar')].map((r) => r.getBoundingClientRect().height));
    expect(heights[2]).toBeGreaterThan(heights[0]!);
  });

  test('invalid JSON draws nothing and does not throw', async ({ page, pageErrors }) => {
    await add(page, `<void-bar-chart id="bad" aria-label="Broken" data='{"series": ['></void-bar-chart>
      <void-donut-chart id="bad2" aria-label="Wrong shape" data='[{"label":"Mon","value":3}]'></void-donut-chart>`);
    for (const id of ['bad', 'bad2']) {
      expect(await page.evaluate((id) => document.querySelector(`#${id} svg`)!.children.length, id), id).toBe(0);
      expect(await count(page, `#${id} table`), id).toBe(0);
    }
    expect(pageErrors).toEqual([]);
  });

  test('changing the attribute redraws, and removing it empties the chart', async ({ page }) => {
    await add(page, barHtml('b', 'style="--void-anim-scale: 0"'));
    await page.evaluate(() => document.getElementById('b')!.setAttribute('data', '{"labels":["x","y"],"series":[{"name":"S","values":[1,2]}]}'));
    await settle(page);
    await expect(page.locator('#b .void-bar-chart-bar')).toHaveCount(2);
    await page.evaluate(() => document.getElementById('b')!.removeAttribute('data'));
    await settle(page);
    await expect(page.locator('#b .void-bar-chart-bar')).toHaveCount(0);
  });

  test('the property is not reflected to the attribute', async ({ page }) => {
    await add(page, `<void-bar-chart id="p" aria-label="Property" style="--void-anim-scale: 0"></void-bar-chart>`);
    await page.evaluate(() => ((document.getElementById('p') as any).data = { labels: ['a'], series: [{ name: 'S', values: [1] }] }));
    await settle(page);
    await expect(page.locator('#p')).not.toHaveAttribute('data', /.*/);
    await expect(page.locator('#p .void-bar-chart-bar')).toHaveCount(1);
  });

  test.describe('the data table', () => {
    test.beforeEach(async ({ page }) => {
      await add(page, `${barHtml('b')}
        <void-line-chart id="l" aria-label="Traffic" data='{"labels":["Mon","Tue"],"series":[{"name":"Visitors","values":[3,5]},{"name":"Signups","values":[1,2]}]}'></void-line-chart>
        <void-donut-chart id="d" aria-label="Mix" data='{"segments":[{"name":"Search","value":75},{"name":"Direct","value":25}]}'></void-donut-chart>
        <void-gauge id="g" aria-label="Disk usage" value="72" unit="%"></void-gauge>`);
    });

    test('is in the accessibility tree, named by the chart, with the drawing hidden from it', async ({ page }) => {
      const figure = page.getByRole('figure', { name: 'Visitors by day' });
      await expect(figure).toHaveCount(1);
      const table = figure.getByRole('table', { name: 'Visitors by day' });
      await expect(table.getByRole('columnheader')).toHaveText(['Label', 'Visitors']);
      await expect(table.getByRole('row')).toHaveCount(4);
      await expect(table.getByRole('rowheader')).toHaveText(['Mon', 'Tue', 'Wed']);
      await expect(table.getByRole('cell')).toHaveText(['120', '180', '1,500']);
      // The drawing is not an image to a screen reader: nothing is announced twice.
      await expect(page.locator('#b svg')).toHaveAttribute('aria-hidden', 'true');
      await expect(figure.getByRole('img')).toHaveCount(0);
    });

    test('a line chart has a column per series, a donut and a gauge their own shape', async ({ page }) => {
      await expect(page.getByRole('table', { name: 'Traffic' }).getByRole('columnheader')).toHaveText(['Label', 'Visitors', 'Signups']);
      await expect(page.getByRole('table', { name: 'Traffic' }).getByRole('cell')).toHaveText(['3', '1', '5', '2']);
      await expect(page.getByRole('table', { name: 'Mix' }).getByRole('cell')).toHaveText(['75', '75%', '25', '25%']);
      await expect(page.getByRole('table', { name: 'Disk usage' }).getByRole('cell')).toHaveText(['72%', '0%', '100%']);
    });

    test('is out of sight until show-table, and then sits below the chart', async ({ page }) => {
      const box = (sel: string) => page.locator(sel).evaluate((e) => { const r = e.getBoundingClientRect(); return { w: r.width, h: r.height, top: r.top }; });
      // A table cannot be narrower than its content, so it is hidden by clipping (and takes no room in the layout).
      const clip = await page.locator('#b table').evaluate((e) => { const s = getComputedStyle(e); return { pos: s.position, clip: s.clipPath }; });
      expect(clip).toEqual({ pos: 'absolute', clip: 'inset(50%)' });
      const chartHeight = await page.locator('#b').evaluate((e) => e.getBoundingClientRect().height);
      expect(chartHeight).toBeLessThanOrEqual(await page.locator('#b svg').evaluate((e) => e.getBoundingClientRect().height + 1));
      await page.evaluate(() => document.getElementById('b')!.setAttribute('show-table', ''));
      await settle(page);
      const shown = await box('#b table');
      expect(shown.w).toBeGreaterThan(100);
      const svgBottom = await page.locator('#b svg').evaluate((e) => e.getBoundingClientRect().bottom);
      expect(shown.top).toBeGreaterThanOrEqual(svgBottom);
      await expect(page.locator('#b table')).toBeVisible();
      await expect(page.locator('#b caption')).toHaveText('Visitors by day');
      // And the table is still the one table: shown, not duplicated.
      expect(await count(page, '#b table')).toBe(1);
    });

    test('hiding it does not add scrolling to the page', async ({ page }) => {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });

  test.describe('right to left', () => {
    test('the table keeps its columns in reading order and adds no overflow', async ({ page }) => {
      await page.evaluate(() => (document.documentElement.dir = 'rtl'));
      await add(page, `${barHtml('b', 'show-table')}<void-gauge id="g" aria-label="Disk" value="5" show-table></void-gauge>`);
      const x = await page.evaluate(() => {
        const cols = [...document.querySelectorAll('#b thead th')].map((th) => th.getBoundingClientRect());
        return { labelLeft: cols[0]!.left, seriesLeft: cols[1]!.left, align: getComputedStyle(document.querySelector('#b tbody th')!).textAlign };
      });
      // The first column (the labels) is on the right in right-to-left.
      expect(x.labelLeft).toBeGreaterThan(x.seriesLeft);
      expect(['start', 'right']).toContain(x.align);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
      await expect(page.getByRole('table', { name: 'Visitors by day' }).getByRole('cell')).toHaveText(['120', '180', '1,500']);
    });
  });
});

for (const engine of ENGINES) {
  test.describe(`${engine} morph`, () => {
    const render = (page: Page, html: string) => page.evaluate((h) => (window as any).__morph.render(h), html);
    const morph = (page: Page, html: string) => page.evaluate((h) => (window as any).__morph.morph(h), html);
    const server = (values: string) =>
      `<void-bar-chart id="m" aria-label="Visitors" data='{"labels":["Mon","Tue"],"series":[{"name":"Visitors","values":${values}}]}'></void-bar-chart>
       <p id="v">v</p>`;

    test.beforeEach(async ({ page }) => {
      await load(page, `/morph-${engine}`);
      await render(page, server('[3,5]'));
      await expect(page.locator('#m svg')).toHaveAttribute('data-phase', 'idle');
    });

    test('a morph with the same attribute keeps the data and does not animate again', async ({ page }) => {
      await page.evaluate(() => {
        const el = document.getElementById('m') as any;
        el.__data = el.data;
        el.__phases = [];
        new MutationObserver(() => el.__phases.push(el.querySelector('svg')?.getAttribute('data-phase'))).observe(el, { attributes: true, subtree: true, attributeFilter: ['data-phase'] });
      });
      for (let i = 0; i < 3; i++) {
        await morph(page, server('[3,5]'));
        await settle(page);
      }
      const r = await page.evaluate(() => {
        const el = document.getElementById('m') as any;
        return { same: el.data === el.__data, phases: el.__phases, bars: el.querySelectorAll('.void-bar-chart-bar').length, tables: el.querySelectorAll('table').length };
      });
      expect(r.same).toBe(true);
      expect(r.phases).toEqual([]);
      expect(r.bars).toBe(2);
      expect(r.tables).toBe(1);
    });

    test('a data set from script survives a morph that repeats the server markup', async ({ page }) => {
      await page.evaluate(() => ((document.getElementById('m') as any).data = { labels: ['x'], series: [{ name: 'S', values: [9] }] }));
      await settle(page);
      await morph(page, server('[3,5]'));
      await settle(page);
      expect(await page.evaluate(() => (document.getElementById('m') as any).data)).toEqual({ labels: ['x'], series: [{ name: 'S', values: [9] }] });
    });

    test('a morph that changes the attribute redraws the chart and its table', async ({ page }) => {
      await morph(page, server('[30,50]'));
      await settle(page);
      await expect(page.locator('#m table').getByRole('cell')).toHaveText(['30', '50']);
      expect(await page.evaluate(() => (document.getElementById('m') as any).data.series[0].values)).toEqual([30, 50]);
      expect(await count(page, '#m table')).toBe(1);
    });
  });
}
