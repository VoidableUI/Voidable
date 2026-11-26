// @vitest-environment happy-dom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import '../../src/components/bar-chart.js';
import '../../src/components/line-chart.js';
import '../../src/components/donut-chart.js';
import '../../src/components/gauge.js';
import type { LitElement } from 'lit';
import { noAnimation, settle } from '../helpers/chart.js';

// Data from markup: the JSON `data` (and a gauge's `zones`) attribute, the same as the property, and the
// data table every chart carries for assistive technology.

const DEV_KEY = Symbol.for('voidable.dev');
const report = vi.fn();

const BAR = '{"series":[{"name":"Sales","values":[1,2.5,3000]}],"labels":["Jan","Feb","Mar"]}';
const LINE = '{"series":[{"name":"Visitors","values":[3,5]},{"name":"Signups","values":[1,2]}],"labels":["Mon","Tue"]}';
const DONUT = '{"segments":[{"name":"Search","value":75},{"name":"Direct","value":25}]}';
const GAUGE = '{"segments":[{"name":"Used","value":30},{"name":"Cache","value":60}]}';

const CASES: Array<[string, string]> = [
  ['void-bar-chart', BAR],
  ['void-line-chart', LINE],
  ['void-donut-chart', DONUT],
  ['void-gauge', GAUGE],
];

async function make(tag: string, attrs: Record<string, string>): Promise<LitElement & Record<string, any>> {
  const el = document.createElement(tag) as LitElement & Record<string, any>;
  noAnimation(el);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  await settle(el);
  return el;
}

const cells = (el: Element) => [...el.querySelectorAll('tr')].map((tr) => [...tr.children].map((c) => c.textContent));

beforeEach(() => {
  report.mockClear();
  (globalThis as any)[DEV_KEY] = { report };
  document.documentElement.lang = 'en';
});
afterEach(() => {
  document.documentElement.removeAttribute('lang');
  delete (globalThis as any)[DEV_KEY];
  document.body.innerHTML = '';
});

describe.each(CASES)('%s data attribute', (tag, json) => {
  it('draws from the data attribute, with no script setting a property', async () => {
    const el = await make(tag, { 'aria-label': 'Chart', data: json });
    expect(el.data).toEqual(JSON.parse(json));
    expect(el.querySelectorAll('svg *').length).toBeGreaterThan(1);
    expect(el.querySelector('table')).not.toBeNull();
  });

  it('is not reflected when the property is set, and the attribute is left as written', async () => {
    const el = await make(tag, {});
    el.data = JSON.parse(json);
    await settle(el);
    expect(el.hasAttribute('data')).toBe(false);
    el.setAttribute('data', json);
    el.data = JSON.parse(json);
    await settle(el);
    expect(el.getAttribute('data')).toBe(json);
  });

  it('redraws when the attribute changes and empties when it is removed', async () => {
    const el = await make(tag, { data: json });
    const before = el.querySelector('table')!.outerHTML;
    el.setAttribute('data', tag === 'void-donut-chart' ? '{"segments":[{"name":"Only","value":5}]}'
      : tag === 'void-gauge' ? '{"segments":[{"name":"Only","value":5}]}'
      : '{"series":[{"name":"Only","values":[9]}],"labels":["One"]}');
    await settle(el);
    expect(el.querySelector('table')!.outerHTML).not.toBe(before);
    expect(el.querySelector('table')!.textContent).toContain('Only');
    el.removeAttribute('data');
    await settle(el);
    expect(el.data).toEqual(tag === 'void-bar-chart' || tag === 'void-line-chart' ? { series: [] } : tag === 'void-donut-chart' ? { segments: [] } : {});
  });

  it('keeps the data it has when the same attribute text arrives again (a morph that changed nothing)', async () => {
    const el = await make(tag, { data: json });
    const data = el.data;
    el.setAttribute('data', json);
    await settle(el);
    expect(el.data).toBe(data);
  });

  it('draws nothing for invalid JSON and reports it through the dev warning, without throwing', async () => {
    const el = await make(tag, { data: '{"series": [' });
    expect(report).toHaveBeenCalledTimes(1);
    expect(report.mock.calls[0][0]).toMatchObject({ kind: 'invalid-data', tag, subject: 'data' });
    expect(report.mock.calls[0][0].message).toContain('not valid JSON');
    // A gauge with no data still shows its value attribute.
    if (tag !== 'void-gauge') expect(el.querySelector('table')).toBeNull();
    if (tag !== 'void-gauge') expect(el.querySelectorAll('svg *').length).toBe(0);
  });

  it('draws nothing for JSON of the wrong shape and says what was expected', async () => {
    const el = await make(tag, { data: '[{"label":"Mon","value":3}]' });
    expect(report.mock.calls[0][0]).toMatchObject({ kind: 'invalid-data', subject: 'data' });
    expect(report.mock.calls[0][0].message).toContain('Expected');
    if (tag !== 'void-gauge') expect(el.querySelector('table')).toBeNull();
  });

  it('shows the table only with show-table', async () => {
    const el = await make(tag, { data: json, 'show-table': '' });
    expect(el.showTable).toBe(true);
    const el2 = await make(tag, { data: json });
    expect(el2.showTable).toBe(false);
    expect(el2.hasAttribute('show-table')).toBe(false);
  });
});

describe('data table', () => {
  it('bar: a caption from the label, a header row and one row per category, series as columns', async () => {
    const el = await make('void-bar-chart', { 'aria-label': 'Sales by month', data: BAR });
    expect(el.querySelector('caption')!.textContent).toBe('Sales by month');
    expect(cells(el)).toEqual([['Label', 'Sales'], ['Jan', '1'], ['Feb', '2.5'], ['Mar', '3,000']]);
    expect([...el.querySelectorAll('thead th')].every((th) => th.getAttribute('scope') === 'col')).toBe(true);
    expect([...el.querySelectorAll('tbody th')].every((th) => th.getAttribute('scope') === 'row')).toBe(true);
  });

  it('line: one column per series', async () => {
    const el = await make('void-line-chart', { data: LINE });
    expect(cells(el)).toEqual([['Label', 'Visitors', 'Signups'], ['Mon', '3', '1'], ['Tue', '5', '2']]);
  });

  it('donut: name, value and share', async () => {
    const el = await make('void-donut-chart', { data: DONUT });
    expect(cells(el)).toEqual([['Segment', 'Value', 'Share'], ['Search', '75', '75%'], ['Direct', '25', '25%']]);
  });

  it('gauge: the reading with its range, and the unit', async () => {
    const el = await make('void-gauge', { value: '72', unit: '%', min: '0', max: '100' });
    expect(cells(el)).toEqual([['Value', 'Minimum', 'Maximum'], ['72%', '0%', '100%']]);
    const mb = await make('void-gauge', { value: '5', unit: 'MB/s', max: '10' });
    expect(cells(mb)[1]).toEqual(['5 MB/s', '0 MB/s', '10 MB/s']);
  });

  it('gauge segments: in the order they are drawn (largest first unless segments-sort is manual)', async () => {
    const el = await make('void-gauge', { data: GAUGE });
    expect(cells(el).map((r) => r[0])).toEqual(['Segment', 'Cache', 'Used']);
    const manual = await make('void-gauge', { data: GAUGE, 'segments-sort': 'manual' });
    expect(cells(manual).map((r) => r[0])).toEqual(['Segment', 'Used', 'Cache']);
  });

  it('shows the data as given, not the animated state', async () => {
    const el = document.createElement('void-bar-chart') as LitElement & Record<string, any>;
    el.setAttribute('data', BAR);
    document.body.appendChild(el);
    await el.updateComplete;
    expect(cells(el)[3]).toEqual(['Mar', '3,000']);
  });

  it('formats numbers for the language of the page', async () => {
    const holder = document.createElement('div');
    holder.setAttribute('lang', 'de');
    document.body.appendChild(holder);
    const el = document.createElement('void-bar-chart') as LitElement & Record<string, any>;
    noAnimation(el);
    el.setAttribute('data', BAR);
    holder.appendChild(el);
    await settle(el);
    expect(cells(el).slice(1)).toEqual([['Jan', '1'], ['Feb', '2,5'], ['Mar', '3.000']]);
  });

  it('marks a missing or non-finite value instead of leaving a gap', async () => {
    const el = await make('void-line-chart', { data: '{"series":[{"name":"A","values":[1,null]},{"name":"B","values":[1]}],"labels":["x","y"]}' });
    expect(cells(el).slice(1)).toEqual([['x', '1', '1'], ['y', '–', '–']]);
  });
});

describe('gauge zones attribute', () => {
  it('takes the zones as JSON', async () => {
    const el = await make('void-gauge', { value: '70', zones: '[{"from":0,"to":60,"color":"green"},{"from":60,"to":100,"color":"red"}]' });
    expect(el.zones).toEqual([{ from: 0, to: 60, color: 'green' }, { from: 60, to: 100, color: 'red' }]);
    expect(el.querySelectorAll('.void-gauge-zone').length).toBeGreaterThan(0);
  });

  it('reports invalid zones and draws none', async () => {
    const el = await make('void-gauge', { value: '70', zones: 'not json' });
    expect(report.mock.calls[0][0]).toMatchObject({ kind: 'invalid-data', tag: 'void-gauge', subject: 'zones' });
    expect(el.zones).toEqual([]);
  });
});
