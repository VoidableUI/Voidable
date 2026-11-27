// SPDX-License-Identifier: MIT
//
// A stacked void-table uses its own font-size as the breakpoint (#142). Nothing inside it may see that size:
// the selection bar, the empty message, the filter, a toolbar or label written in the table and the table
// itself render at the body size, stacked or not, at any width.
import { test, expect, load, type Page } from '../helpers/test';

const TABLE = (attrs: string) => `
<void-table id="t" ${attrs} selectable filter-columns="name" aria-label="Team">
  <div id="toolbar" style="display:flex;gap:8px"><span id="label">Team members</span><void-button id="btn" size="sm">Add</void-button></div>
  <void-table-filter><input id="filter" type="search" aria-label="Filter team"></void-table-filter>
  <table>
    <thead><tr><th data-stack="select"><void-checkbox aria-label="Select all"></void-checkbox></th><th data-key="name" data-sort>Name</th><th data-key="seats" data-sort="number">Seats</th></tr></thead>
    <tbody>
      <tr data-value="ada"><td><void-checkbox aria-label="Select Ada"></void-checkbox></td><td>Ada</td><td>4</td></tr>
      <tr data-value="grace"><td><void-checkbox aria-label="Select Grace"></void-checkbox></td><td>Grace</td><td>7</td></tr>
    </tbody>
  </table>
  <void-table-empty id="empty" hidden>No one matches.</void-table-empty>
  <void-table-selection id="sel" hidden><span id="count" data-count></span> selected<void-button size="sm">Remove</void-button></void-table-selection>
</void-table>`;

async function mount(page: Page, html: string): Promise<void> {
  await page.evaluate(async (h) => {
    const d = document.createElement('div');
    d.id = 'case';
    d.innerHTML = h;
    document.body.append(d);
    await (window as any).__settle(d);
  }, html);
}

/** Font sizes (px) of the things inside the table once the selection bar and the empty message are showing. */
async function sizes(page: Page) {
  // Select a row and filter to nothing so both parts are visible.
  await page.locator('#t tbody tr:first-child void-checkbox').click({ force: true });
  await page.evaluate(async () => {
    const f = document.getElementById('filter') as HTMLInputElement;
    document.getElementById('empty')!.hidden = false;
    document.getElementById('sel')!.hidden = false;
    f.value = '';
    await (window as any).__settle(document.getElementById('case'));
  });
  return page.evaluate(() => {
    const px = (id: string) => parseFloat(getComputedStyle(document.getElementById(id)!).fontSize);
    return {
      table: parseFloat(getComputedStyle(document.querySelector('#t table')!).fontSize),
      body: (() => { const p = document.createElement('i'); p.style.fontSize = 'var(--void-type-body-size)'; document.body.append(p); const v = parseFloat(getComputedStyle(p).fontSize); p.remove(); return v; })(),
      toolbar: px('toolbar'),
      label: px('label'),
      btn: px('btn'),
      filter: px('filter'),
      empty: px('empty'),
      sel: px('sel'),
      count: px('count'),
      host: px('t'),
    };
  });
}

test.beforeEach(async ({ page }) => {
  await load(page, '/blank');
});

for (const [name, attrs, width] of [
  ['stacked below its breakpoint', 'stack', 390],
  ['stack="always" on a wide screen', 'stack="always"', 1200],
  ['stack with a wide table, not stacked', 'stack="20rem"', 1200],
] as const) {
  test(`${name}: parts render at the body size`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await mount(page, TABLE(attrs));
    const s = await sizes(page);
    expect(s.table).toBe(s.body);
    for (const k of ['toolbar', 'label', 'filter', 'empty', 'sel', 'count'] as const) {
      expect(s[k], `${k} in ${JSON.stringify(s)}`).toBe(s.body);
    }
    expect(s.btn).toBeLessThan(40);
  });
}
