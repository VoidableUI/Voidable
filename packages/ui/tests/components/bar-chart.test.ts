// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidBarChart, type BarChartData } from '../../src/components/bar-chart.js';
import { mount, settle } from '../helpers/chart.js';

const TAG = 'void-bar-chart';

// Layout constants mirrored from the component (viewBox is always 600 wide).
const TOP = 16;
const LEFT = 40;
const INNER_W = 600 - 40 - 16;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const bars = (el: Element) => Array.from(el.querySelectorAll('.void-bar-chart-bar'));
const num = (e: Element, a: string) => Number(e.getAttribute(a));
const texts = (el: Element, sel: string) =>
  Array.from(el.querySelectorAll(`${sel} text`)).map((t) => t.textContent);

const sample: BarChartData = {
  series: [{ name: 'Sales', values: [1, 2, 3] }],
  labels: ['Jan', 'Feb', 'Mar'],
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('VoidBarChart', () => {
  describe('class', () => {
    it('extends VoidElement and renders into itself (light DOM)', () => {
      expect(Object.getPrototypeOf(VoidBarChart)).toBe(VoidElement);
      const el = document.createElement(TAG) as VoidBarChart;
      expect(el.createRenderRoot()).toBe(el);
    });

    it('is registered as void-bar-chart', () => {
      expect(customElements.get(TAG)).toBe(VoidBarChart);
    });
  });

  describe('default property values', () => {
    const el = document.createElement(TAG) as VoidBarChart;

    it('height defaults to 220', () => expect(el.height).toBe(220));
    it('showValues defaults to false', () => expect(el.showValues).toBe(false));
    it('variant defaults to "filled"', () => expect(el.variant).toBe('filled'));
    it('ariaLabel defaults to empty', () => expect(el.ariaLabel).toBe(''));
    it('stagger defaults to true', () => expect(el.stagger).toBe(true));
    it('data defaults to an empty series list', () => expect(el.data).toEqual({ series: [] }));
  });

  describe('attributes and reflection', () => {
    it('reads height from the attribute as a number', async () => {
      const el = await mount<VoidBarChart>(TAG, {});
      el.setAttribute('height', '300');
      await el.updateComplete;
      expect(el.height).toBe(300);
    });

    it('reflects height, variant and show-values', async () => {
      const el = await mount<VoidBarChart>(TAG, { height: 150, variant: 'outline', showValues: true });
      expect(el.getAttribute('height')).toBe('150');
      expect(el.getAttribute('variant')).toBe('outline');
      expect(el.hasAttribute('show-values')).toBe(true);
    });

    it('maps the show-values attribute to showValues', async () => {
      const el = await mount<VoidBarChart>(TAG, {});
      el.setAttribute('show-values', '');
      await el.updateComplete;
      expect(el.showValues).toBe(true);
    });

    it('maps the aria-label attribute to ariaLabel', async () => {
      const el = await mount<VoidBarChart>(TAG, {});
      el.setAttribute('aria-label', 'Revenue');
      await el.updateComplete;
      expect(el.ariaLabel).toBe('Revenue');
    });

    describe('stagger converter', () => {
      const make = async (attr: string | null) => {
        const el = document.createElement(TAG) as VoidBarChart;
        if (attr !== null) el.setAttribute('stagger', attr);
        return el;
      };

      it('empty attribute means true', async () => expect((await make('')).stagger).toBe(true));
      it('"true" means true', async () => expect((await make('true')).stagger).toBe(true));
      it('"false" means false', async () => expect((await make('false')).stagger).toBe(false));
      it('a numeric string means that number', async () => expect((await make('75')).stagger).toBe(75));
      it('"0" means 0 (not false)', async () => expect((await make('0')).stagger).toBe(0));
      it('a non-numeric string falls back to true', async () => expect((await make('abc')).stagger).toBe(true));
    });
  });

  describe('accessibility', () => {
    it('sets role="img" on the host', async () => {
      const el = await mount<VoidBarChart>(TAG, { data: sample });
      expect(el.getAttribute('role')).toBe('img');
    });

    it('gives the svg role="img" and a default accessible name', async () => {
      const el = await mount<VoidBarChart>(TAG, { data: sample });
      const svg = el.querySelector('svg')!;
      expect(svg.getAttribute('role')).toBe('img');
      expect(svg.getAttribute('aria-label')).toBe('Bar chart');
    });

    it('uses a consumer supplied aria-label for the svg', async () => {
      const el = await mount<VoidBarChart>(TAG, { data: sample, ariaLabel: 'Monthly sales' });
      expect(el.querySelector('svg')!.getAttribute('aria-label')).toBe('Monthly sales');
    });

    it('keeps an accessible name when there is no data', async () => {
      const el = await mount<VoidBarChart>(TAG, {});
      const svg = el.querySelector('svg')!;
      expect(svg.getAttribute('aria-label')).toBeTruthy();
    });
  });

  describe('empty data', () => {
    it('renders an empty svg with the configured height', async () => {
      const el = await mount<VoidBarChart>(TAG, { height: 180 });
      const svg = el.querySelector('svg')!;
      expect(svg.getAttribute('viewBox')).toBe('0 0 600 180');
      expect(svg.children.length).toBe(0);
    });

    it('renders no bars for a series with no values and does not emit NaN', async () => {
      const el = await mount<VoidBarChart>(TAG, { data: { series: [{ name: 'A', values: [] }] } });
      expect(bars(el)).toHaveLength(0);
      expect(el.innerHTML).not.toContain('NaN');
      expect(el.innerHTML).not.toContain('Infinity');
    });
  });

  describe('rendered structure', () => {
    it('renders grid, y-axis, series and x-axis groups the theme CSS targets', async () => {
      const el = await mount<VoidBarChart>(TAG, { data: sample });
      for (const cls of ['grid', 'y-axis', 'series', 'x-axis']) {
        expect(el.querySelector(`.void-bar-chart-${cls}`), cls).not.toBeNull();
      }
    });

    it('sets the viewBox from the height property', async () => {
      const el = await mount<VoidBarChart>(TAG, { data: sample, height: 300 });
      expect(el.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 600 300');
    });

    it('renders one bar per value', async () => {
      const el = await mount<VoidBarChart>(TAG, { data: sample });
      expect(bars(el)).toHaveLength(3);
    });

    it('renders one series group per series', async () => {
      const el = await mount<VoidBarChart>(TAG, {
        data: { series: [{ name: 'A', values: [1, 2] }, { name: 'B', values: [2, 1] }] },
      });
      expect(el.querySelectorAll('.void-bar-chart-series')).toHaveLength(2);
      expect(bars(el)).toHaveLength(4);
    });

    it('draws a grid line and a y label for every tick', async () => {
      const el = await mount<VoidBarChart>(TAG, { data: sample });
      const lines = el.querySelectorAll('.void-bar-chart-grid line');
      const labels = texts(el, '.void-bar-chart-y-axis');
      expect(lines.length).toBe(labels.length);
      // max 3 -> domain 5 -> ticks 0..5
      expect(labels).toEqual(['0', '1', '2', '3', '4', '5']);
    });

    it('formats large y ticks with a k suffix', async () => {
      const el = await mount<VoidBarChart>(TAG, { data: { series: [{ name: 'A', values: [20000] }] } });
      const labels = texts(el, '.void-bar-chart-y-axis');
      expect(labels).toContain('10k');
      expect(labels[0]).toBe('0');
    });

    it('formats fractional y ticks with one decimal', async () => {
      const el = await mount<VoidBarChart>(TAG, { data: { series: [{ name: 'A', values: [0.3] }] } });
      const labels = texts(el, '.void-bar-chart-y-axis');
      expect(labels.every((l) => /^\d+(\.\d)?$/.test(l!))).toBe(true);
      expect(labels.some((l) => l!.includes('.'))).toBe(true);
    });

    it('renders x labels centred under their band', async () => {
      const el = await mount<VoidBarChart>(TAG, { data: sample });
      const xs = Array.from(el.querySelectorAll('.void-bar-chart-x-axis text'));
      expect(xs.map((t) => t.textContent)).toEqual(['Jan', 'Feb', 'Mar']);
      const bs = bars(el);
      xs.forEach((t, i) => {
        const center = num(bs[i]!, 'x') + (num(bs[i]!, 'width') + 2) / 2;
        expect(num(t, 'x')).toBeCloseTo(center, 5);
      });
    });

    it('ignores labels beyond the number of categories', async () => {
      const el = await mount<VoidBarChart>(TAG, {
        data: { series: [{ name: 'A', values: [1, 2] }], labels: ['a', 'b', 'c', 'd'] },
      });
      expect(texts(el, '.void-bar-chart-x-axis')).toEqual(['a', 'b']);
    });

    it('renders no x labels when none are given', async () => {
      const el = await mount<VoidBarChart>(TAG, { data: { series: [{ name: 'A', values: [1, 2] }] } });
      expect(el.querySelectorAll('.void-bar-chart-x-axis text')).toHaveLength(0);
    });
  });

  describe('bar geometry', () => {
    it('scales bar height proportionally to value', async () => {
      const el = await mount<VoidBarChart>(TAG, { data: sample });
      const [a, b, c] = bars(el).map((r) => num(r, 'height'));
      expect(b! / a!).toBeCloseTo(2, 5);
      expect(c! / a!).toBeCloseTo(3, 5);
    });

    it('draws a value equal to the domain maximum at the full plot height', async () => {
      // 5 is a tick maximum (domain 5 only when max*1.1 <= 5 → use 4)
      const el = await mount<VoidBarChart>(TAG, { data: { series: [{ name: 'A', values: [4] }] }, height: 220 });
      // max 4 -> 4.4 -> domain 5, so bar is 4/5 of the inner height (172)
      expect(num(bars(el)[0]!, 'height')).toBeCloseTo((4 / 5) * 172, 5);
    });

    it('anchors every bar on the baseline', async () => {
      const el = await mount<VoidBarChart>(TAG, { data: sample, height: 220 });
      const baseline = TOP + (220 - 16 - 32);
      for (const r of bars(el)) expect(num(r, 'y') + num(r, 'height')).toBeCloseTo(baseline, 5);
    });

    it('gives zero values a zero-height bar', async () => {
      const el = await mount<VoidBarChart>(TAG, { data: { series: [{ name: 'A', values: [0, 5, 0] }] } });
      const hs = bars(el).map((r) => num(r, 'height'));
      expect(hs[0]).toBe(0);
      expect(hs[2]).toBe(0);
      expect(hs[1]).toBeGreaterThan(0);
    });

    it('renders an all-zero chart without NaN (domain falls back to a positive range)', async () => {
      const el = await mount<VoidBarChart>(TAG, { data: { series: [{ name: 'A', values: [0, 0] }] } });
      expect(el.innerHTML).not.toContain('NaN');
      expect(texts(el, '.void-bar-chart-y-axis')[0]).toBe('0');
    });

    it('draws a negative value as a bar below a zero baseline', async () => {
      const el = await mount<VoidBarChart>(TAG, { data: { series: [{ name: 'A', values: [-5, 3] }] } });
      await new Promise((r) => setTimeout(r, 50));
      for (const r of bars(el)) expect(num(r, 'height')).toBeGreaterThanOrEqual(0);
      expect(el.innerHTML).not.toContain('NaN');
      const base = el.querySelector('.void-bar-chart-baseline')!;
      expect(base).not.toBeNull();
      const zeroY = Number(base.getAttribute('y1'));
      const [neg, pos] = bars(el);
      // The negative bar starts at zero and goes down; the positive one ends at zero.
      expect(num(neg!, 'y')).toBeCloseTo(zeroY, 5);
      expect(num(neg!, 'height')).toBeGreaterThan(0);
      expect(num(pos!, 'y') + num(pos!, 'height')).toBeCloseTo(zeroY, 5);
      // The axis reaches below zero.
      expect(texts(el, '.void-bar-chart-y-axis').some((t) => t.startsWith('-'))).toBe(true);
    });

    it('an all-negative chart hangs every bar from zero at the top', async () => {
      const el = await mount<VoidBarChart>(TAG, { data: { series: [{ name: 'A', values: [-2, -8] }] } });
      const zeroY = Number(el.querySelector('.void-bar-chart-baseline')!.getAttribute('y1'));
      expect(zeroY).toBeCloseTo(16, 5);
      for (const r of bars(el)) expect(num(r, 'y')).toBeCloseTo(zeroY, 5);
    });

    it('draws no baseline when nothing is negative', async () => {
      const el = await mount<VoidBarChart>(TAG, { data: { series: [{ name: 'A', values: [1, 2] }] } });
      expect(el.querySelector('.void-bar-chart-baseline')).toBeNull();
    });

    it('centres a single bar in the plot area', async () => {
      const el = await mount<VoidBarChart>(TAG, { data: { series: [{ name: 'A', values: [3] }] } });
      const r = bars(el)[0]!;
      const center = num(r, 'x') + (num(r, 'width') + 2) / 2;
      expect(center).toBeCloseTo(LEFT + INNER_W / 2, 5);
    });

    it('keeps all bars inside the plot area horizontally', async () => {
      const el = await mount<VoidBarChart>(TAG, {
        data: { series: [{ name: 'A', values: [1, 2, 3, 4, 5, 6, 7] }, { name: 'B', values: [7, 6, 5, 4, 3, 2, 1] }] },
      });
      for (const r of bars(el)) {
        expect(num(r, 'x')).toBeGreaterThanOrEqual(LEFT);
        expect(num(r, 'x') + num(r, 'width')).toBeLessThanOrEqual(LEFT + INNER_W);
      }
    });

    it('places multiple series side by side within each category', async () => {
      const el = await mount<VoidBarChart>(TAG, {
        data: { series: [{ name: 'A', values: [1, 1] }, { name: 'B', values: [1, 1] }] },
      });
      const [a0, a1, b0, b1] = bars(el);
      expect(num(b0!, 'x')).toBeGreaterThan(num(a0!, 'x'));
      expect(num(b1!, 'x')).toBeGreaterThan(num(a1!, 'x'));
      expect(num(a1!, 'x')).toBeGreaterThan(num(b0!, 'x'));
      expect(num(a0!, 'width')).toBe(num(b0!, 'width'));
    });

    it('shares the y scale across series', async () => {
      const el = await mount<VoidBarChart>(TAG, {
        data: { series: [{ name: 'A', values: [1] }, { name: 'B', values: [4] }] },
      });
      const [a, b] = bars(el);
      expect(num(b!, 'height') / num(a!, 'height')).toBeCloseTo(4, 5);
    });

    it('lets series of different lengths share the category axis', async () => {
      const el = await mount<VoidBarChart>(TAG, {
        data: { series: [{ name: 'A', values: [1, 2, 3] }, { name: 'B', values: [1] }], labels: ['a', 'b', 'c'] },
      });
      expect(bars(el)).toHaveLength(4);
      expect(texts(el, '.void-bar-chart-x-axis')).toEqual(['a', 'b', 'c']);
    });

    it('respects the height property for the baseline', async () => {
      const el = await mount<VoidBarChart>(TAG, { data: sample, height: 400 });
      const r = bars(el)[0]!;
      expect(num(r, 'y') + num(r, 'height')).toBeCloseTo(TOP + (400 - 48), 5);
    });

    it('tolerates NaN values without emitting NaN attributes or rescaling the others', async () => {
      const el = await mount<VoidBarChart>(TAG, { data: { series: [{ name: 'A', values: [1, NaN, 3] }] } });
      expect(el.innerHTML).not.toContain('NaN');
      for (const r of bars(el)) expect(num(r, 'y')).toBeGreaterThanOrEqual(TOP);
    });
  });

  describe('colors', () => {
    const seriesColor = (el: Element, i: number) =>
      (el.querySelectorAll('.void-bar-chart-series')[i] as HTMLElement).getAttribute('style');

    it('defaults to the rotating chart palette tokens', async () => {
      const el = await mount<VoidBarChart>(TAG, {
        data: { series: [{ name: 'A', values: [1] }, { name: 'B', values: [1] }] },
      });
      expect(seriesColor(el, 0)).toContain('var(--void-chart-series-1)');
      expect(seriesColor(el, 1)).toContain('var(--void-chart-series-2)');
    });

    it('wraps around after six series', async () => {
      const series = Array.from({ length: 7 }, (_, i) => ({ name: `S${i}`, values: [1] }));
      const el = await mount<VoidBarChart>(TAG, { data: { series } });
      expect(seriesColor(el, 5)).toContain('var(--void-chart-series-6)');
      expect(seriesColor(el, 6)).toContain('var(--void-chart-series-1)');
    });

    it('uses an explicit series color', async () => {
      const el = await mount<VoidBarChart>(TAG, { data: { series: [{ name: 'A', values: [1], color: '#ff0000' }] } });
      expect(seriesColor(el, 0)).toContain('#ff0000');
    });

    it('applies per-bar colors only where given', async () => {
      const el = await mount<VoidBarChart>(TAG, {
        data: { series: [{ name: 'A', values: [1, 2, 3], colors: [undefined, '#00ff00'] }] },
      });
      const [b0, b1, b2] = bars(el);
      expect(b0!.getAttribute('style')).toBeNull();
      expect(b1!.getAttribute('style')).toContain('#00ff00');
      expect(b2!.getAttribute('style')).toBeNull();
    });
  });

  describe('show-values', () => {
    it('renders no value labels by default', async () => {
      const el = await mount<VoidBarChart>(TAG, { data: sample });
      expect(el.querySelector('.void-bar-chart-values')).toBeNull();
    });

    it('renders a rounded label above every bar when enabled', async () => {
      const el = await mount<VoidBarChart>(TAG, {
        data: { series: [{ name: 'A', values: [1.4, 2.6, 3] }] },
        showValues: true,
      });
      const labels = Array.from(el.querySelectorAll('.void-bar-chart-values text'));
      expect(labels.map((t) => t.textContent)).toEqual(['1', '3', '3']);
      const bs = bars(el);
      labels.forEach((t, i) => expect(num(t, 'y')).toBeLessThan(num(bs[i]!, 'y')));
    });

    it('abbreviates thousands', async () => {
      const el = await mount<VoidBarChart>(TAG, {
        data: { series: [{ name: 'A', values: [1500, 12000, 999] }] },
        showValues: true,
      });
      expect(texts(el, '.void-bar-chart-values')).toEqual(['1.5k', '12k', '999']);
    });

    it('toggles at runtime', async () => {
      const el = await mount<VoidBarChart>(TAG, { data: sample });
      el.showValues = true;
      await settle(el);
      expect(el.querySelector('.void-bar-chart-values')).not.toBeNull();
      el.showValues = false;
      await settle(el);
      expect(el.querySelector('.void-bar-chart-values')).toBeNull();
    });
  });

  describe('reacting to data changes', () => {
    it('re-renders when data is replaced', async () => {
      const el = await mount<VoidBarChart>(TAG, { data: sample });
      expect(bars(el)).toHaveLength(3);
      el.data = { series: [{ name: 'A', values: [5, 5] }], labels: ['x', 'y'] };
      await settle(el);
      expect(bars(el)).toHaveLength(2);
      expect(texts(el, '.void-bar-chart-x-axis')).toEqual(['x', 'y']);
    });

    it('rescales bars to the new data', async () => {
      const el = await mount<VoidBarChart>(TAG, { data: { series: [{ name: 'A', values: [1] }] } });
      const before = num(bars(el)[0]!, 'height');
      el.data = { series: [{ name: 'A', values: [2] }] };
      await settle(el);
      // domain moves 1.1 -> 2 (step), then 2.2 -> 5; both bars are value/domain of the plot
      expect(num(bars(el)[0]!, 'height')).not.toBe(before);
    });

    it('returns to the empty state when data is cleared', async () => {
      const el = await mount<VoidBarChart>(TAG, { data: sample });
      el.data = { series: [] };
      await settle(el);
      expect(bars(el)).toHaveLength(0);
      expect(el.querySelector('.void-bar-chart-grid')).toBeNull();
    });

    it('goes from the empty state to populated', async () => {
      const el = await mount<VoidBarChart>(TAG, {});
      el.data = sample;
      await settle(el);
      expect(bars(el)).toHaveLength(3);
    });

    it('reads back the data it was given', async () => {
      const el = await mount<VoidBarChart>(TAG, { data: sample });
      expect(el.data).toBe(sample);
    });

    it('re-renders when height changes', async () => {
      const el = await mount<VoidBarChart>(TAG, { data: sample, height: 220 });
      el.height = 300;
      await settle(el);
      expect(el.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 600 300');
    });

    it('re-renders when aria-label changes', async () => {
      const el = await mount<VoidBarChart>(TAG, { data: sample });
      el.ariaLabel = 'New name';
      await el.updateComplete;
      expect(el.querySelector('svg')!.getAttribute('aria-label')).toBe('New name');
    });
  });

  describe('animation lifecycle', () => {
    it('starts in the "pre" phase with zero-height bars, before the first frame', async () => {
      const el = document.createElement(TAG) as VoidBarChart;
      el.data = sample;
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.querySelector('svg')!.getAttribute('data-phase')).toBe('pre');
      for (const r of bars(el)) expect(num(r, 'height')).toBe(0);
    });

    it('ends in the "idle" phase with full-height bars', async () => {
      const el = await mount<VoidBarChart>(TAG, { data: sample });
      expect(el.querySelector('svg')!.getAttribute('data-phase')).toBe('idle');
      for (const r of bars(el)) expect(num(r, 'height')).toBeGreaterThan(0);
    });

    it('animates (phase "animating") when a duration is configured, then settles', async () => {
      const el = document.createElement(TAG) as VoidBarChart;
      el.style.setProperty('--void-duration-chart-enter', '60');
      el.style.setProperty('--void-stagger-chart-bars', '0');
      el.data = sample;
      document.body.appendChild(el);
      await el.updateComplete;
      await sleep(25);
      await el.updateComplete;
      expect(el.querySelector('svg')!.getAttribute('data-phase')).toBe('animating');
      await sleep(250);
      await el.updateComplete;
      expect(el.querySelector('svg')!.getAttribute('data-phase')).toBe('idle');
      const hs = bars(el).map((r) => num(r, 'height'));
      expect(hs[2]! / hs[0]!).toBeCloseTo(3, 5);
    });

    it('stagger delays later bars (stagger=false starts them together)', async () => {
      const make = async (stagger: boolean | number) => {
        const el = document.createElement(TAG) as VoidBarChart;
        el.style.setProperty('--void-duration-chart-enter', '40');
        el.stagger = stagger;
        el.data = { series: [{ name: 'A', values: [3, 3] }] };
        document.body.appendChild(el);
        await el.updateComplete;
        await sleep(150);
        await el.updateComplete;
        return bars(el).map((r) => num(r, 'height'));
      };
      const staggered = await make(100000);
      expect(staggered[0]).toBeGreaterThan(0);
      expect(staggered[1]).toBe(0);
      const together = await make(false);
      expect(together[0]).toBeGreaterThan(0);
      expect(together[1]).toBeCloseTo(together[0]!, 5);
    });

    it('morphs from the previous values when data changes rather than from zero', async () => {
      const el = await mount<VoidBarChart>(TAG, { data: { series: [{ name: 'A', values: [2, 2] }] } });
      const old = num(bars(el)[1]!, 'height');
      el.style.setProperty('--void-anim-scale', '1');
      el.style.setProperty('--void-duration-chart-enter', '40');
      el.style.setProperty('--void-stagger-chart-bars', '100000');
      el.stagger = true;
      el.data = { series: [{ name: 'A', values: [2, 4] }] };
      await settle(el);
      await sleep(150);
      await el.updateComplete;
      // bar 0 has finished (value unchanged); bar 1 is held at its previous height
      // because its stagger start time is far in the future.
      expect(num(bars(el)[1]!, 'height')).toBeCloseTo(old, 5);
    });

    it('can be removed mid-animation without throwing', async () => {
      const el = document.createElement(TAG) as VoidBarChart;
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
