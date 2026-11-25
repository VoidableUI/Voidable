// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidLineChart, type LineChartData } from '../../src/components/line-chart.js';
import { mount, settle } from '../helpers/chart.js';

const TAG = 'void-line-chart';

// Layout constants mirrored from the component (viewBox is always 600 wide).
const TOP = 16;
const LEFT = 40;
const RIGHT_EDGE = 600 - 16;
const INNER_W = RIGHT_EDGE - LEFT;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const num = (e: Element, a: string) => Number(e.getAttribute(a));
const lineD = (el: Element, i = 0) =>
  el.querySelectorAll('.void-line-chart-line')[i]!.getAttribute('d')!;
const areaD = (el: Element, i = 0) =>
  el.querySelectorAll('.void-line-chart-area')[i]!.getAttribute('d')!;
const texts = (el: Element, sel: string) =>
  Array.from(el.querySelectorAll(`${sel}`)).map((t) => t.textContent);

/** Parse "M x y L x y ..." polylines into points. */
function points(d: string): Array<[number, number]> {
  return (d.match(/-?\d+(\.\d+)?\s+-?\d+(\.\d+)?/g) ?? []).map((p) => {
    const [x, y] = p.split(/\s+/).map(Number);
    return [x!, y!] as [number, number];
  });
}

const sample: LineChartData = {
  series: [{ name: 'Users', values: [1, 3, 2, 5] }],
  labels: ['Q1', 'Q2', 'Q3', 'Q4'],
};

/**
 * happy-dom performs no layout, so getBoundingClientRect() is all zeros and the
 * component's hover handler bails out. Give the svg a 600x220 box at the origin
 * so client coordinates equal viewBox coordinates.
 */
function stubLayout(el: Element): void {
  const svg = el.querySelector('svg')!;
  svg.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 600, height: 220, right: 600, bottom: 220, x: 0, y: 0, toJSON() {} }) as DOMRect;
}

async function hover(el: VoidLineChart, clientX: number): Promise<void> {
  el.dispatchEvent(new MouseEvent('mousemove', { clientX, clientY: 50, bubbles: true }));
  await el.updateComplete;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('VoidLineChart', () => {
  describe('class', () => {
    it('extends VoidElement and renders into itself (light DOM)', () => {
      expect(Object.getPrototypeOf(VoidLineChart)).toBe(VoidElement);
      const el = document.createElement(TAG) as VoidLineChart;
      expect(el.createRenderRoot()).toBe(el);
    });

    it('is registered as void-line-chart', () => {
      expect(customElements.get(TAG)).toBe(VoidLineChart);
    });
  });

  describe('default property values', () => {
    const el = document.createElement(TAG) as VoidLineChart;
    it('height defaults to 220', () => expect(el.height).toBe(220));
    it('showValues defaults to false', () => expect(el.showValues).toBe(false));
    it('variant defaults to "outline"', () => expect(el.variant).toBe('outline'));
    it('interpolation defaults to "linear"', () => expect(el.interpolation).toBe('linear'));
    it('ariaLabel defaults to empty', () => expect(el.ariaLabel).toBe(''));
    it('data defaults to an empty series list', () => expect(el.data).toEqual({ series: [] }));
  });

  describe('attributes and reflection', () => {
    it('reflects height, variant, interpolation and show-values', async () => {
      const el = await mount<VoidLineChart>(TAG, {
        height: 120, variant: 'filled', interpolation: 'step', showValues: true,
      });
      expect(el.getAttribute('height')).toBe('120');
      expect(el.getAttribute('variant')).toBe('filled');
      expect(el.getAttribute('interpolation')).toBe('step');
      expect(el.hasAttribute('show-values')).toBe(true);
    });

    it('reads height as a number from the attribute', async () => {
      const el = await mount<VoidLineChart>(TAG, {});
      el.setAttribute('height', '310');
      await el.updateComplete;
      expect(el.height).toBe(310);
    });

    it('maps the aria-label attribute to ariaLabel', async () => {
      const el = await mount<VoidLineChart>(TAG, {});
      el.setAttribute('aria-label', 'Traffic');
      await el.updateComplete;
      expect(el.ariaLabel).toBe('Traffic');
    });
  });

  describe('accessibility', () => {
    it('sets role="img" on the host', async () => {
      const el = await mount<VoidLineChart>(TAG, { data: sample });
      expect(el.getAttribute('role')).toBe('img');
    });

    it('gives the svg role="img" and a default accessible name', async () => {
      const el = await mount<VoidLineChart>(TAG, { data: sample });
      const svg = el.querySelector('svg')!;
      expect(svg.getAttribute('role')).toBe('img');
      expect(svg.getAttribute('aria-label')).toBe('Line chart');
    });

    it('uses the consumer supplied aria-label', async () => {
      const el = await mount<VoidLineChart>(TAG, { data: sample, ariaLabel: 'Signups' });
      expect(el.querySelector('svg')!.getAttribute('aria-label')).toBe('Signups');
    });

    it('keeps an accessible name when there is no data', async () => {
      const el = await mount<VoidLineChart>(TAG, {});
      expect(el.querySelector('svg')!.getAttribute('aria-label')).toBeTruthy();
    });
  });

  describe('empty and degenerate data', () => {
    it('renders an empty svg at the configured height for no series', async () => {
      const el = await mount<VoidLineChart>(TAG, { height: 150 });
      const svg = el.querySelector('svg')!;
      expect(svg.getAttribute('viewBox')).toBe('0 0 600 150');
      expect(svg.children.length).toBe(0);
    });

    it('renders empty paths for a series without values and no NaN', async () => {
      const el = await mount<VoidLineChart>(TAG, { data: { series: [{ name: 'A', values: [] }] } });
      expect(lineD(el)).toBe('');
      expect(areaD(el)).toBe('');
      expect(el.innerHTML).not.toContain('NaN');
    });

    it('draws a single point centred horizontally', async () => {
      const el = await mount<VoidLineChart>(TAG, { data: { series: [{ name: 'A', values: [3] }] } });
      const pts = points(lineD(el));
      expect(pts).toHaveLength(1);
      expect(pts[0]![0]).toBeCloseTo(LEFT + INNER_W / 2, 5);
      expect(lineD(el).startsWith('M ')).toBe(true);
      expect(el.innerHTML).not.toContain('NaN');
    });

    it('renders an all-zero series on the baseline without NaN', async () => {
      const el = await mount<VoidLineChart>(TAG, { data: { series: [{ name: 'A', values: [0, 0, 0] }] } });
      const baseline = TOP + (220 - 48);
      for (const [, y] of points(lineD(el))) expect(y).toBeCloseTo(baseline, 5);
      expect(el.innerHTML).not.toContain('NaN');
    });

    it('tolerates NaN values without emitting NaN coordinates', async () => {
      const el = await mount<VoidLineChart>(TAG, { data: { series: [{ name: 'A', values: [1, NaN, 3] }] } });
      expect(el.innerHTML).not.toContain('NaN');
    });
  });

  describe('rendered structure', () => {
    it('renders grid, y-axis, series and x-axis groups the theme CSS targets', async () => {
      const el = await mount<VoidLineChart>(TAG, { data: sample });
      for (const cls of ['grid', 'y-axis', 'series', 'x-axis']) {
        expect(el.querySelector(`.void-line-chart-${cls}`), cls).not.toBeNull();
      }
    });

    it('renders an area and a line path per series', async () => {
      const el = await mount<VoidLineChart>(TAG, {
        data: { series: [{ name: 'A', values: [1, 2] }, { name: 'B', values: [2, 1] }] },
      });
      expect(el.querySelectorAll('.void-line-chart-series')).toHaveLength(2);
      expect(el.querySelectorAll('.void-line-chart-area')).toHaveLength(2);
      expect(el.querySelectorAll('.void-line-chart-line')).toHaveLength(2);
    });

    it('sets the viewBox from height', async () => {
      const el = await mount<VoidLineChart>(TAG, { data: sample, height: 300 });
      expect(el.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 600 300');
    });

    it('draws a grid line and y label per tick (max 5 -> domain 10 -> 0..10 by 2)', async () => {
      const el = await mount<VoidLineChart>(TAG, { data: sample });
      expect(el.querySelectorAll('.void-line-chart-grid line').length).toBe(
        el.querySelectorAll('.void-line-chart-y-axis text').length,
      );
      expect(texts(el, '.void-line-chart-y-axis text')).toEqual(['0', '2', '4', '6', '8', '10']);
    });

    it('formats large y ticks with a k suffix', async () => {
      const el = await mount<VoidLineChart>(TAG, { data: { series: [{ name: 'A', values: [0, 20000] }] } });
      expect(texts(el, '.void-line-chart-y-axis text')).toContain('10k');
    });

    it('renders labels at each point x position', async () => {
      const el = await mount<VoidLineChart>(TAG, { data: sample });
      const labels = Array.from(el.querySelectorAll('.void-line-chart-x-axis text'));
      expect(labels.map((l) => l.textContent)).toEqual(['Q1', 'Q2', 'Q3', 'Q4']);
      const xs = points(lineD(el)).map((p) => p[0]);
      labels.forEach((l, i) => expect(num(l, 'x')).toBeCloseTo(xs[i]!, 1));
    });

    it('drops labels beyond the number of points', async () => {
      const el = await mount<VoidLineChart>(TAG, {
        data: { series: [{ name: 'A', values: [1, 2] }], labels: ['a', 'b', 'c'] },
      });
      expect(texts(el, '.void-line-chart-x-axis text')).toEqual(['a', 'b']);
    });
  });

  describe('line geometry', () => {
    it('spans the full plot width from the first to the last point', async () => {
      const el = await mount<VoidLineChart>(TAG, { data: sample });
      const pts = points(lineD(el));
      expect(pts[0]![0]).toBeCloseTo(LEFT, 5);
      expect(pts[pts.length - 1]![0]).toBeCloseTo(RIGHT_EDGE, 5);
    });

    it('spaces points evenly', async () => {
      const el = await mount<VoidLineChart>(TAG, { data: sample });
      const xs = points(lineD(el)).map((p) => p[0]);
      const d = xs[1]! - xs[0]!;
      xs.slice(1).forEach((x, i) => expect(x - xs[i]!).toBeCloseTo(d, 1));
    });

    it('maps higher values to smaller y (SVG coordinates)', async () => {
      const el = await mount<VoidLineChart>(TAG, { data: sample });
      const ys = points(lineD(el)).map((p) => p[1]);
      expect(ys[3]!).toBeLessThan(ys[1]!);
      expect(ys[1]!).toBeLessThan(ys[2]!);
      expect(ys[2]!).toBeLessThan(ys[0]!);
    });

    it('scales y proportionally to value from the baseline', async () => {
      const el = await mount<VoidLineChart>(TAG, { data: { series: [{ name: 'A', values: [1, 2] }] } });
      const baseline = TOP + (220 - 48);
      const [a, b] = points(lineD(el));
      expect((baseline - b![1]) / (baseline - a![1])).toBeCloseTo(2, 1);
    });

    it('shares the y scale across series', async () => {
      const el = await mount<VoidLineChart>(TAG, {
        data: { series: [{ name: 'A', values: [1, 1] }, { name: 'B', values: [4, 4] }] },
      });
      const baseline = TOP + (220 - 48);
      const a = points(lineD(el, 0))[0]![1];
      const b = points(lineD(el, 1))[0]![1];
      expect((baseline - b) / (baseline - a)).toBeCloseTo(4, 1);
    });

    it('closes the area path down to the baseline', async () => {
      const el = await mount<VoidLineChart>(TAG, { data: sample });
      const baseline = TOP + (220 - 48);
      const d = areaD(el);
      expect(d.endsWith('Z')).toBe(true);
      expect(d).toContain(`L ${RIGHT_EDGE.toFixed(2)} ${baseline.toFixed(2)}`);
      expect(d).toContain(`L ${LEFT.toFixed(2)} ${baseline.toFixed(2)}`);
    });

    it('lets series of different lengths share the x scale', async () => {
      const el = await mount<VoidLineChart>(TAG, {
        data: { series: [{ name: 'A', values: [1, 2, 3] }, { name: 'B', values: [1, 2] }] },
      });
      expect(points(lineD(el, 0))).toHaveLength(3);
      expect(points(lineD(el, 1))).toHaveLength(2);
      expect(points(lineD(el, 1))[1]![0]).toBeCloseTo(LEFT + INNER_W / 2, 1);
    });
  });

  describe('interpolation', () => {
    it('uses straight segments by default (no theme radius)', async () => {
      const el = await mount<VoidLineChart>(TAG, { data: sample });
      expect(lineD(el)).not.toContain('C');
      expect(lineD(el).match(/L/g)).toHaveLength(3);
    });

    it('uses monotone cubic curves when --void-radius-sm is positive', async () => {
      const el = document.createElement(TAG) as VoidLineChart;
      el.style.setProperty('--void-anim-scale', '0');
      el.style.setProperty('--void-radius-sm', '4px');
      el.data = sample;
      document.body.appendChild(el);
      await settle(el);
      expect(lineD(el)).toContain('C');
      expect(areaD(el)).toContain('C');
    });

    it('falls back to straight segments when --void-radius-sm is 0 (sharp shape)', async () => {
      const el = document.createElement(TAG) as VoidLineChart;
      el.style.setProperty('--void-anim-scale', '0');
      el.style.setProperty('--void-radius-sm', '0px');
      el.data = sample;
      document.body.appendChild(el);
      await settle(el);
      expect(lineD(el)).not.toContain('C');
    });

    it('step interpolation inserts a horizontal then vertical move between points', async () => {
      const el = await mount<VoidLineChart>(TAG, { data: sample, interpolation: 'step' });
      const pts = points(lineD(el));
      expect(pts).toHaveLength(2 * 4 - 1);
      // Every odd point keeps the previous y (horizontal run), every even point shares x with the previous.
      for (let i = 1; i < pts.length; i++) {
        if (i % 2 === 1) expect(pts[i]![1]).toBe(pts[i - 1]![1]);
        else expect(pts[i]![0]).toBe(pts[i - 1]![0]);
      }
    });

    it('step interpolation is never smoothed, even with a positive theme radius', async () => {
      const el = document.createElement(TAG) as VoidLineChart;
      el.style.setProperty('--void-anim-scale', '0');
      el.style.setProperty('--void-radius-sm', '4px');
      el.interpolation = 'step';
      el.data = sample;
      document.body.appendChild(el);
      await settle(el);
      expect(lineD(el)).not.toContain('C');
    });

    it('switches interpolation at runtime', async () => {
      const el = await mount<VoidLineChart>(TAG, { data: sample });
      const linear = lineD(el);
      el.interpolation = 'step';
      await settle(el);
      expect(lineD(el)).not.toBe(linear);
    });
  });

  describe('colors', () => {
    const style = (el: Element, i: number) =>
      el.querySelectorAll('.void-line-chart-series')[i]!.getAttribute('style');

    it('defaults to the rotating chart palette tokens and wraps after six', async () => {
      const series = Array.from({ length: 7 }, (_, i) => ({ name: `S${i}`, values: [1, 2] }));
      const el = await mount<VoidLineChart>(TAG, { data: { series } });
      expect(style(el, 0)).toContain('var(--void-chart-series-1)');
      expect(style(el, 5)).toContain('var(--void-chart-series-6)');
      expect(style(el, 6)).toContain('var(--void-chart-series-1)');
    });

    it('uses an explicit series color', async () => {
      const el = await mount<VoidLineChart>(TAG, {
        data: { series: [{ name: 'A', values: [1, 2], color: '#123456' }] },
      });
      expect(style(el, 0)).toContain('#123456');
    });
  });

  describe('show-values', () => {
    it('renders no value labels by default', async () => {
      const el = await mount<VoidLineChart>(TAG, { data: sample });
      expect(el.querySelector('.void-line-chart-values')).toBeNull();
    });

    it('renders a label above each point', async () => {
      const el = await mount<VoidLineChart>(TAG, { data: sample, showValues: true });
      const labels = Array.from(el.querySelectorAll('.void-line-chart-values text'));
      expect(labels.map((l) => l.textContent)).toEqual(['1', '3', '2', '5']);
      const ys = points(lineD(el)).map((p) => p[1]);
      labels.forEach((l, i) => expect(num(l, 'y')).toBeLessThan(ys[i]!));
    });

    it('abbreviates thousands', async () => {
      const el = await mount<VoidLineChart>(TAG, {
        data: { series: [{ name: 'A', values: [1500, 12000] }] },
        showValues: true,
      });
      expect(texts(el, '.void-line-chart-values text')).toEqual(['1.5k', '12k']);
    });
  });

  describe('reacting to data changes', () => {
    it('re-renders when data is replaced', async () => {
      const el = await mount<VoidLineChart>(TAG, { data: sample });
      el.data = { series: [{ name: 'A', values: [1, 2] }], labels: ['x', 'y'] };
      await settle(el);
      expect(points(lineD(el))).toHaveLength(2);
      expect(texts(el, '.void-line-chart-x-axis text')).toEqual(['x', 'y']);
    });

    it('ends with the same geometry as a fresh mount of the same data', async () => {
      const next: LineChartData = { series: [{ name: 'A', values: [4, 1, 3] }] };
      const a = await mount<VoidLineChart>(TAG, { data: sample });
      a.data = next;
      await settle(a);
      const b = await mount<VoidLineChart>(TAG, { data: next });
      expect(lineD(a)).toBe(lineD(b));
      expect(areaD(a)).toBe(areaD(b));
    });

    it('returns to the empty state when data is cleared', async () => {
      const el = await mount<VoidLineChart>(TAG, { data: sample });
      el.data = { series: [] };
      await settle(el);
      expect(el.querySelector('.void-line-chart-line')).toBeNull();
    });

    it('goes from empty to populated', async () => {
      const el = await mount<VoidLineChart>(TAG, {});
      el.data = sample;
      await settle(el);
      expect(el.querySelectorAll('.void-line-chart-line')).toHaveLength(1);
    });

    it('reads back the data it was given', async () => {
      const el = await mount<VoidLineChart>(TAG, { data: sample });
      expect(el.data).toBe(sample);
    });

    it('re-renders when height changes', async () => {
      const el = await mount<VoidLineChart>(TAG, { data: sample });
      el.height = 400;
      await settle(el);
      expect(el.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 600 400');
    });
  });

  describe('hover (layout stubbed: happy-dom has no real getBoundingClientRect)', () => {
    it('does nothing when the svg has no layout box (zero width)', async () => {
      const el = await mount<VoidLineChart>(TAG, { data: sample });
      await hover(el, 300);
      expect(el.querySelector('.void-line-chart-hover')).toBeNull();
    });

    it('shows a hairline, a marker per series and a tooltip when hovering the plot', async () => {
      const el = await mount<VoidLineChart>(TAG, {
        data: { series: [{ name: 'A', values: [1, 2, 3] }, { name: 'B', values: [3, 2, 1] }], labels: ['x', 'y', 'z'] },
      });
      stubLayout(el);
      await hover(el, 312); // middle of the plot
      expect(el.querySelector('.void-line-chart-hover')).not.toBeNull();
      expect(el.querySelector('.void-line-chart-hairline')).not.toBeNull();
      expect(el.querySelectorAll('.void-line-chart-marker')).toHaveLength(2);
      expect(el.querySelector('.void-line-chart-tooltip-bg')).not.toBeNull();
    });

    it('snaps to the nearest data index', async () => {
      const el = await mount<VoidLineChart>(TAG, { data: sample });
      stubLayout(el);
      const xs = points(lineD(el)).map((p) => p[0]);
      for (let i = 0; i < 4; i++) {
        await hover(el, xs[i]! + (i === 3 ? -3 : 3));
        expect(num(el.querySelector('.void-line-chart-hairline')!, 'x1')).toBeCloseTo(xs[i]!, 1);
        expect(el.querySelector('.void-line-chart-tooltip-label')!.textContent).toBe(['Q1', 'Q2', 'Q3', 'Q4'][i]);
      }
    });

    it('lists each series name and its formatted value in the tooltip', async () => {
      const el = await mount<VoidLineChart>(TAG, {
        data: { series: [{ name: 'A', values: [1, 1500] }, { name: 'B', values: [2, 3] }], labels: ['x', 'y'] },
      });
      stubLayout(el);
      await hover(el, RIGHT_EDGE);
      expect(texts(el, '.void-line-chart-tooltip-name')).toEqual(['A', 'B']);
      expect(texts(el, '.void-line-chart-tooltip-value')).toEqual(['1.5k', '3']);
    });

    it('falls back to the index as the tooltip heading when there are no labels', async () => {
      const el = await mount<VoidLineChart>(TAG, { data: { series: [{ name: 'A', values: [1, 2, 3] }] } });
      stubLayout(el);
      await hover(el, LEFT);
      expect(el.querySelector('.void-line-chart-tooltip-label')!.textContent).toBe('0');
    });

    it('flips the tooltip to the left of the hairline near the right edge', async () => {
      const el = await mount<VoidLineChart>(TAG, { data: sample });
      stubLayout(el);
      await hover(el, LEFT);
      const hx0 = num(el.querySelector('.void-line-chart-hairline')!, 'x1');
      expect(num(el.querySelector('.void-line-chart-tooltip-bg')!, 'x')).toBeGreaterThan(hx0);
      await hover(el, RIGHT_EDGE);
      const hx1 = num(el.querySelector('.void-line-chart-hairline')!, 'x1');
      const bg = el.querySelector('.void-line-chart-tooltip-bg')!;
      expect(num(bg, 'x') + num(bg, 'width')).toBeLessThan(hx1);
    });

    it('clears when the pointer leaves the plot area horizontally', async () => {
      const el = await mount<VoidLineChart>(TAG, { data: sample });
      stubLayout(el);
      await hover(el, 300);
      expect(el.querySelector('.void-line-chart-hover')).not.toBeNull();
      await hover(el, 10); // inside the left margin
      expect(el.querySelector('.void-line-chart-hover')).toBeNull();
      await hover(el, 300);
      await hover(el, 595); // inside the right margin
      expect(el.querySelector('.void-line-chart-hover')).toBeNull();
    });

    it('clears on mouseleave', async () => {
      const el = await mount<VoidLineChart>(TAG, { data: sample });
      stubLayout(el);
      await hover(el, 300);
      el.dispatchEvent(new MouseEvent('mouseleave'));
      await el.updateComplete;
      expect(el.querySelector('.void-line-chart-hover')).toBeNull();
    });

    it('does not hover a single-point chart (nothing to snap between)', async () => {
      const el = await mount<VoidLineChart>(TAG, { data: { series: [{ name: 'A', values: [3] }] } });
      stubLayout(el);
      await hover(el, 312);
      expect(el.querySelector('.void-line-chart-hover')).toBeNull();
    });

    it('does not hover when there is no data', async () => {
      const el = await mount<VoidLineChart>(TAG, {});
      stubLayout(el);
      await hover(el, 300);
      expect(el.querySelector('.void-line-chart-hover')).toBeNull();
    });

    it('drops the hover when the data shrinks below the hovered index', async () => {
      const el = await mount<VoidLineChart>(TAG, { data: sample });
      stubLayout(el);
      await hover(el, RIGHT_EDGE); // index 3
      el.data = { series: [{ name: 'A', values: [1, 2] }] };
      await settle(el);
      expect(el.querySelector('.void-line-chart-hover')).toBeNull();
    });

    it('stops listening when disconnected, and listens again when reconnected', async () => {
      const el = await mount<VoidLineChart>(TAG, { data: sample });
      stubLayout(el);
      el.remove();
      await hover(el, 300);
      expect(el.querySelector('.void-line-chart-hover')).toBeNull();
      document.body.appendChild(el);
      await settle(el);
      stubLayout(el);
      await hover(el, 300);
      expect(el.querySelector('.void-line-chart-hover')).not.toBeNull();
    });
  });

  describe('animation lifecycle', () => {
    const reveal = (el: Element) => el.querySelector('svg')!.getAttribute('style');

    it('starts in the "pre" phase before the first frame', async () => {
      const el = document.createElement(TAG) as VoidLineChart;
      el.data = sample;
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.querySelector('svg')!.getAttribute('data-phase')).toBe('pre');
      expect(reveal(el)).toContain('--reveal: 0');
    });

    it('ends in the "idle" phase fully revealed', async () => {
      const el = await mount<VoidLineChart>(TAG, { data: sample });
      expect(el.querySelector('svg')!.getAttribute('data-phase')).toBe('idle');
      expect(reveal(el)).toContain('--reveal: 1');
    });

    it('reveals progressively on entrance, then settles', async () => {
      const el = document.createElement(TAG) as VoidLineChart;
      el.style.setProperty('--void-duration-chart-enter', '80');
      el.data = sample;
      document.body.appendChild(el);
      await el.updateComplete;
      await sleep(40);
      await el.updateComplete;
      expect(el.querySelector('svg')!.getAttribute('data-phase')).toBe('animating');
      await sleep(300);
      await el.updateComplete;
      expect(el.querySelector('svg')!.getAttribute('data-phase')).toBe('idle');
      expect(reveal(el)).toContain('--reveal: 1');
    });

    it('does not re-hide the line when data changes (only entrance reveals)', async () => {
      const el = await mount<VoidLineChart>(TAG, { data: sample });
      el.style.setProperty('--void-anim-scale', '1');
      el.style.setProperty('--void-duration-chart-enter', '300');
      el.data = { series: [{ name: 'A', values: [5, 1, 4] }] };
      await settle(el);
      expect(el.querySelector('svg')!.getAttribute('data-phase')).toBe('animating');
      expect(reveal(el)).toContain('--reveal: 1');
      el.remove();
    });

    it('can be removed mid-animation without throwing', async () => {
      const el = document.createElement(TAG) as VoidLineChart;
      el.style.setProperty('--void-duration-chart-enter', '200');
      el.data = sample;
      document.body.appendChild(el);
      await el.updateComplete;
      el.remove();
      await sleep(50);
      expect(el.isConnected).toBe(false);
    });
  });
});
