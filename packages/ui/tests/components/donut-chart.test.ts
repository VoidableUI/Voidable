// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidDonutChart, type DonutChartData } from '../../src/components/donut-chart.js';
import { mount, settle } from '../helpers/chart.js';

const TAG = 'void-donut-chart';
const TAU = 2 * Math.PI;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const segs = (el: Element) => Array.from(el.querySelectorAll('.void-donut-chart-segment'));
const texts = (el: Element, sel: string) =>
  Array.from(el.querySelectorAll(sel)).map((t) => t.textContent);

/** Numbers of an arcPath() donut wedge: [x0 y0 | R R 0 large 1 x1 y1 | ix0 iy0 | r r 0 large 0 ix1 iy1]. */
function nums(d: string): number[] {
  return (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
}

/** Clockwise angle from 12 o'clock (0..2pi) of an svg-space point about the centre. */
function clock(x: number, y: number, c: number): number {
  let a = Math.atan2(y - c, x - c) + Math.PI / 2;
  if (a < -1e-6) a += TAU;
  return a;
}

/** Start/end clockwise angle and sweep of a rendered segment's outer arc. */
function arc(seg: Element, size: number) {
  const n = nums(seg.getAttribute('d')!);
  const start = clock(n[0]!, n[1]!, size / 2);
  let end = clock(n[7]!, n[8]!, size / 2);
  const large = n[5]!;
  let sweep = end - start;
  if (sweep < 0) sweep += TAU;
  end = start + sweep;
  return { start, end, sweep, large };
}

const four: DonutChartData = {
  segments: [
    { name: 'A', value: 1 },
    { name: 'B', value: 1 },
    { name: 'C', value: 2 },
  ],
};

/** happy-dom has no layout; give the svg a box so client coords == viewBox coords. */
function stubLayout(el: Element, size = 220): void {
  el.querySelector('svg')!.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: size, height: size, right: size, bottom: size, x: 0, y: 0, toJSON() {} }) as DOMRect;
}

async function hoverAt(el: VoidDonutChart, x: number, y: number): Promise<void> {
  el.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y, bubbles: true }));
  await el.updateComplete;
}

/** Point on the ring (radius midway) at a clockwise angle from 12 o'clock. */
function ringPoint(angle: number, size = 220, inner = 0.6): [number, number] {
  const outer = size / 2 - 4;
  const r = (outer + outer * inner) / 2;
  return [size / 2 + r * Math.sin(angle), size / 2 - r * Math.cos(angle)];
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('VoidDonutChart', () => {
  describe('class', () => {
    it('extends VoidElement and renders into itself (light DOM)', () => {
      expect(Object.getPrototypeOf(VoidDonutChart)).toBe(VoidElement);
      const el = document.createElement(TAG) as VoidDonutChart;
      expect(el.createRenderRoot()).toBe(el);
    });

    it('is registered as void-donut-chart', () => {
      expect(customElements.get(TAG)).toBe(VoidDonutChart);
    });
  });

  describe('default property values', () => {
    const el = document.createElement(TAG) as VoidDonutChart;
    it('size defaults to 220', () => expect(el.size).toBe(220));
    it('inner defaults to 0.6', () => expect(el.inner).toBe(0.6));
    it('gaps defaults to false', () => expect(el.gaps).toBe(false));
    it('variant defaults to "filled"', () => expect(el.variant).toBe('filled'));
    it('showValue defaults to false', () => expect(el.showValue).toBe(false));
    it('showTotal defaults to false', () => expect(el.showTotal).toBe(false));
    it('ariaLabel defaults to empty', () => expect(el.ariaLabel).toBe(''));
    it('data defaults to no segments', () => expect(el.data).toEqual({ segments: [] }));
  });

  describe('attributes and reflection', () => {
    it('reflects size, variant, show-value and show-total', async () => {
      const el = await mount<VoidDonutChart>(TAG, { size: 150, variant: 'wireframe', showValue: true, showTotal: true });
      expect(el.getAttribute('size')).toBe('150');
      expect(el.getAttribute('variant')).toBe('wireframe');
      expect(el.hasAttribute('show-value')).toBe(true);
      expect(el.hasAttribute('show-total')).toBe(true);
    });

    it('reads size and inner as numbers from attributes', async () => {
      const el = await mount<VoidDonutChart>(TAG, {});
      el.setAttribute('size', '300');
      el.setAttribute('inner', '0.4');
      await el.updateComplete;
      expect(el.size).toBe(300);
      expect(el.inner).toBe(0.4);
    });

    it('maps the aria-label attribute to ariaLabel', async () => {
      const el = await mount<VoidDonutChart>(TAG, {});
      el.setAttribute('aria-label', 'Share');
      await el.updateComplete;
      expect(el.ariaLabel).toBe('Share');
    });

    describe('gaps converter', () => {
      const make = (attr: string) => {
        const el = document.createElement(TAG) as VoidDonutChart;
        el.setAttribute('gaps', attr);
        return el;
      };
      it('empty attribute means true', () => expect(make('').gaps).toBe(true));
      it('"false" means false', () => expect(make('false').gaps).toBe(false));
      it('a number means that percentage', () => expect(make('5').gaps).toBe(5));
      it('"0" means 0', () => expect(make('0').gaps).toBe(0));
      it('garbage falls back to true', () => expect(make('x').gaps).toBe(true));
    });
  });

  describe('accessibility', () => {
    it('sets role="img" on the host', async () => {
      const el = await mount<VoidDonutChart>(TAG, { data: four });
      expect(el.getAttribute('role')).toBe('img');
    });

    it('gives the svg role="img" and a default name when populated', async () => {
      const el = await mount<VoidDonutChart>(TAG, { data: four });
      const svg = el.querySelector('svg')!;
      expect(svg.getAttribute('role')).toBe('img');
      expect(svg.getAttribute('aria-label')).toBe('Donut chart');
    });

    it('gives the empty svg role="img" and a default name too', async () => {
      const el = await mount<VoidDonutChart>(TAG, {});
      const svg = el.querySelector('svg')!;
      expect(svg.getAttribute('role')).toBe('img');
      expect(svg.getAttribute('aria-label')).toBe('Donut chart');
    });

    it('uses the consumer supplied aria-label', async () => {
      const el = await mount<VoidDonutChart>(TAG, { data: four, ariaLabel: 'Browser share' });
      expect(el.querySelector('svg')!.getAttribute('aria-label')).toBe('Browser share');
    });
  });

  describe('empty and degenerate data', () => {
    it('renders an empty square svg for no segments', async () => {
      const el = await mount<VoidDonutChart>(TAG, { size: 180 });
      const svg = el.querySelector('svg')!;
      expect(svg.getAttribute('viewBox')).toBe('0 0 180 180');
      expect(segs(el)).toHaveLength(0);
    });

    it('renders no segments when every value is zero', async () => {
      const el = await mount<VoidDonutChart>(TAG, { data: { segments: [{ name: 'a', value: 0 }, { name: 'b', value: 0 }] } });
      expect(segs(el)).toHaveLength(0);
      expect(el.innerHTML).not.toContain('NaN');
    });

    it('skips zero-valued segments but keeps the others', async () => {
      const el = await mount<VoidDonutChart>(TAG, {
        data: { segments: [{ name: 'a', value: 0 }, { name: 'b', value: 3 }, { name: 'c', value: 1 }] },
      });
      const idx = segs(el).map((s) => s.getAttribute('data-segment-index'));
      expect(idx).toEqual(['1', '2']);
    });

    it('draws a single segment among zeros as a ring part', async () => {
      const el = await mount<VoidDonutChart>(TAG, {
        data: { segments: [{ name: 'a', value: 1 }, { name: 'b', value: 3 }] },
      });
      expect(segs(el)).toHaveLength(2);
    });

    it('renders a visible ring for a single 100% segment', async () => {
      const el = await mount<VoidDonutChart>(TAG, { data: { segments: [{ name: 'only', value: 5 }] } });
      const [seg] = segs(el);
      expect(seg).toBeDefined();
      const d = seg!.getAttribute('d')!;
      // Closed circles, no radial line (L) that would show as a seam.
      expect(d).not.toContain('L');
      expect(d.match(/Z/g)).toHaveLength(2);
    });

    it('with gaps on, a single 100% segment still closes the ring', async () => {
      const el = await mount<VoidDonutChart>(TAG, { gaps: 5, data: { segments: [{ name: 'only', value: 5 }, { name: 'none', value: 0 }] } });
      expect(segs(el)[0]!.getAttribute('d')).not.toContain('L');
    });

    it('still draws valid segments when another value is NaN', async () => {
      const el = await mount<VoidDonutChart>(TAG, {
        data: { segments: [{ name: 'a', value: 1 }, { name: 'b', value: NaN }] },
      });
      expect(el.innerHTML).not.toContain('NaN');
      expect(segs(el).length).toBeGreaterThan(0);
    });
  });

  describe('rendered structure', () => {
    it('sets the viewBox from size', async () => {
      const el = await mount<VoidDonutChart>(TAG, { data: four, size: 260 });
      expect(el.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 260 260');
    });

    it('renders one path per non-zero segment with its data index', async () => {
      const el = await mount<VoidDonutChart>(TAG, { data: four });
      const s = segs(el);
      expect(s).toHaveLength(3);
      expect(s.map((p) => p.getAttribute('data-segment-index'))).toEqual(['0', '1', '2']);
    });

    it('uses the rotating palette tokens and wraps after six', async () => {
      const segments = Array.from({ length: 7 }, (_, i) => ({ name: `S${i}`, value: 1 }));
      const el = await mount<VoidDonutChart>(TAG, { data: { segments } });
      const s = segs(el);
      expect(s[0]!.getAttribute('style')).toContain('var(--void-chart-series-1)');
      expect(s[5]!.getAttribute('style')).toContain('var(--void-chart-series-6)');
      expect(s[6]!.getAttribute('style')).toContain('var(--void-chart-series-1)');
    });

    it('uses an explicit segment color', async () => {
      const el = await mount<VoidDonutChart>(TAG, { data: { segments: [{ name: 'a', value: 1, color: '#abcdef' }, { name: 'b', value: 1 }] } });
      expect(segs(el)[0]!.getAttribute('style')).toContain('#abcdef');
    });

    it('draws an annular wedge using the inner ratio', async () => {
      const el = await mount<VoidDonutChart>(TAG, { data: four, size: 220, inner: 0.5 });
      const d = segs(el)[0]!.getAttribute('d')!;
      expect(d).toContain('A 106 106');
      expect(d).toContain('A 53 53');
    });

    it('draws pie wedges from the centre when inner is 0', async () => {
      const el = await mount<VoidDonutChart>(TAG, { data: four, size: 220, inner: 0 });
      expect(segs(el)[0]!.getAttribute('d')!.startsWith('M 110 110 L')).toBe(true);
    });
  });

  describe('segment geometry', () => {
    it('starts the first segment at 12 o\'clock', async () => {
      const el = await mount<VoidDonutChart>(TAG, { data: four });
      expect(arc(segs(el)[0]!, 220).start).toBeCloseTo(0, 1);
    });

    it('sizes segments proportionally to value', async () => {
      const el = await mount<VoidDonutChart>(TAG, { data: four });
      const [a, b, c] = segs(el).map((s) => arc(s, 220));
      expect(a!.sweep).toBeCloseTo(Math.PI / 2, 1);
      expect(b!.sweep).toBeCloseTo(Math.PI / 2, 1);
      expect(c!.sweep).toBeCloseTo(Math.PI, 1);
    });

    it('lays segments end to end, clockwise, without gaps by default', async () => {
      const el = await mount<VoidDonutChart>(TAG, { data: four });
      const [a, b, c] = segs(el).map((s) => arc(s, 220));
      expect(b!.start).toBeCloseTo(a!.end, 1);
      expect(c!.start).toBeCloseTo(b!.end, 1);
      expect(c!.end).toBeCloseTo(TAU, 1);
    });

    it('marks the large-arc flag only for segments over 50%', async () => {
      const el = await mount<VoidDonutChart>(TAG, {
        data: { segments: [{ name: 'a', value: 3 }, { name: 'b', value: 1 }] },
      });
      const [a, b] = segs(el).map((s) => arc(s, 220));
      expect(a!.large).toBe(1);
      expect(b!.large).toBe(0);
    });

    it('is invariant to the scale of the values', async () => {
      const el = await mount<VoidDonutChart>(TAG, {
        data: { segments: [{ name: 'a', value: 100 }, { name: 'b', value: 300 }] },
      });
      const [a, b] = segs(el).map((s) => arc(s, 220));
      expect(b!.sweep / a!.sweep).toBeCloseTo(3, 1);
    });

    it('gaps=true consumes about 1% of the arc across segments', async () => {
      const el = await mount<VoidDonutChart>(TAG, { data: four, gaps: true });
      const total = segs(el).map((s) => arc(s, 220).sweep).reduce((x, y) => x + y, 0);
      expect(TAU - total).toBeCloseTo(0.01 * TAU, 1);
    });

    it('a numeric gaps value is the percentage of the arc given to gaps', async () => {
      const el = await mount<VoidDonutChart>(TAG, { data: four, gaps: 10 });
      const total = segs(el).map((s) => arc(s, 220).sweep).reduce((x, y) => x + y, 0);
      expect(TAU - total).toBeCloseTo(0.1 * TAU, 1);
    });

    it('splits the gap evenly so adjacent segments are separated', async () => {
      const el = await mount<VoidDonutChart>(TAG, { data: four, gaps: 10 });
      const [a, b] = segs(el).map((s) => arc(s, 220));
      expect(b!.start - a!.end).toBeGreaterThan(0.01);
    });

    it('gaps=false and gaps=0 are equivalent', async () => {
      const a = await mount<VoidDonutChart>(TAG, { data: four, gaps: false });
      const b = await mount<VoidDonutChart>(TAG, { data: four, gaps: 0 });
      expect(segs(a).map((s) => s.getAttribute('d'))).toEqual(segs(b).map((s) => s.getAttribute('d')));
    });
  });

  describe('total and value labels', () => {
    it('renders no total or value labels by default', async () => {
      const el = await mount<VoidDonutChart>(TAG, { data: four });
      expect(el.querySelector('.void-donut-chart-total')).toBeNull();
      expect(el.querySelector('.void-donut-chart-labels')).toBeNull();
    });

    it('renders the total in the centre when show-total is set', async () => {
      const el = await mount<VoidDonutChart>(TAG, { data: four, showTotal: true });
      const t = el.querySelector('.void-donut-chart-total text')!;
      expect(t.textContent).toBe('4');
      expect(t.getAttribute('x')).toBe('110');
      expect(t.getAttribute('y')).toBe('110');
    });

    it('abbreviates large totals', async () => {
      const el = await mount<VoidDonutChart>(TAG, {
        data: { segments: [{ name: 'a', value: 1000 }, { name: 'b', value: 500 }] },
        showTotal: true,
      });
      expect(el.querySelector('.void-donut-chart-total text')!.textContent).toBe('1.5k');
    });

    it('renders a value label per non-zero segment', async () => {
      const el = await mount<VoidDonutChart>(TAG, {
        data: { segments: [{ name: 'a', value: 2 }, { name: 'z', value: 0 }, { name: 'b', value: 6 }] },
        showValue: true,
      });
      expect(texts(el, '.void-donut-chart-labels text')).toEqual(['2', '6']);
    });

    it('places each value label inside the ring at the segment mid-angle', async () => {
      const el = await mount<VoidDonutChart>(TAG, { data: four, showValue: true });
      const labels = Array.from(el.querySelectorAll('.void-donut-chart-labels text'));
      const mids = [Math.PI / 4, (3 * Math.PI) / 4, (3 * Math.PI) / 2];
      labels.forEach((l, i) => {
        const x = Number(l.getAttribute('x'));
        const y = Number(l.getAttribute('y'));
        expect(Math.hypot(x - 110, y - 110)).toBeCloseTo((106 + 63.6) / 2, 1);
        expect(clock(x, y, 110)).toBeCloseTo(mids[i]!, 1);
      });
    });
  });

  describe('hover (layout stubbed: happy-dom has no real getBoundingClientRect)', () => {
    it('does nothing without a layout box', async () => {
      const el = await mount<VoidDonutChart>(TAG, { data: four });
      await hoverAt(el, ...ringPoint(Math.PI / 4));
      expect(el.querySelector('.void-donut-chart-hover')).toBeNull();
    });

    it('shows a tooltip with name, value and percentage for the segment under the pointer', async () => {
      const el = await mount<VoidDonutChart>(TAG, { data: four });
      stubLayout(el);
      await hoverAt(el, ...ringPoint(Math.PI / 4)); // segment A: 1 of 4
      expect(el.querySelector('.void-donut-chart-hover')).not.toBeNull();
      expect(el.querySelector('.void-donut-chart-tooltip-name')!.textContent).toBe('A');
      const value = el.querySelector('.void-donut-chart-tooltip-value')!;
      expect(value.textContent).toContain('1');
      expect(el.querySelector('.void-donut-chart-tooltip-pct')!.textContent).toBe('(25%)');
    });

    it('identifies each segment by angle', async () => {
      const el = await mount<VoidDonutChart>(TAG, { data: four });
      stubLayout(el);
      const probes: Array<[number, string, string]> = [
        [Math.PI / 4, 'A', '(25%)'],
        [(3 * Math.PI) / 4, 'B', '(25%)'],
        [(3 * Math.PI) / 2, 'C', '(50%)'],
      ];
      for (const [angle, name, pct] of probes) {
        await hoverAt(el, ...ringPoint(angle));
        expect(el.querySelector('.void-donut-chart-tooltip-name')!.textContent).toBe(name);
        expect(el.querySelector('.void-donut-chart-tooltip-pct')!.textContent).toBe(pct);
      }
    });

    it('pins the tooltip to the side opposite the pointer', async () => {
      const el = await mount<VoidDonutChart>(TAG, { data: four });
      stubLayout(el);
      await hoverAt(el, ...ringPoint(Math.PI / 4)); // right half
      expect(Number(el.querySelector('.void-donut-chart-tooltip-bg')!.getAttribute('x'))).toBe(8);
      await hoverAt(el, ...ringPoint((3 * Math.PI) / 2)); // left half
      expect(Number(el.querySelector('.void-donut-chart-tooltip-bg')!.getAttribute('x'))).toBe(220 - 140 - 8);
    });

    it('keeps the tooltip inside the viewBox vertically', async () => {
      const el = await mount<VoidDonutChart>(TAG, { data: four });
      stubLayout(el);
      await hoverAt(el, ...ringPoint(0.05)); // very top of the ring
      const bg = el.querySelector('.void-donut-chart-tooltip-bg')!;
      expect(Number(bg.getAttribute('y'))).toBeGreaterThanOrEqual(8);
      expect(Number(bg.getAttribute('y')) + Number(bg.getAttribute('height'))).toBeLessThanOrEqual(220 - 8);
    });

    it('clears when the pointer is in the hole', async () => {
      const el = await mount<VoidDonutChart>(TAG, { data: four });
      stubLayout(el);
      await hoverAt(el, ...ringPoint(Math.PI / 4));
      await hoverAt(el, 110, 110);
      expect(el.querySelector('.void-donut-chart-hover')).toBeNull();
    });

    it('clears when the pointer is outside the ring', async () => {
      const el = await mount<VoidDonutChart>(TAG, { data: four });
      stubLayout(el);
      await hoverAt(el, ...ringPoint(Math.PI / 4));
      await hoverAt(el, 2, 2);
      expect(el.querySelector('.void-donut-chart-hover')).toBeNull();
    });

    it('clears on mouseleave', async () => {
      const el = await mount<VoidDonutChart>(TAG, { data: four });
      stubLayout(el);
      await hoverAt(el, ...ringPoint(Math.PI / 4));
      el.dispatchEvent(new MouseEvent('mouseleave'));
      await el.updateComplete;
      expect(el.querySelector('.void-donut-chart-hover')).toBeNull();
    });

    it('ignores hover with no data', async () => {
      const el = await mount<VoidDonutChart>(TAG, {});
      stubLayout(el);
      await hoverAt(el, 110, 20);
      expect(el.querySelector('.void-donut-chart-hover')).toBeNull();
    });

    it('stops listening when disconnected and resumes on reconnect', async () => {
      const el = await mount<VoidDonutChart>(TAG, { data: four });
      stubLayout(el);
      el.remove();
      await hoverAt(el, ...ringPoint(Math.PI / 4));
      expect(el.querySelector('.void-donut-chart-hover')).toBeNull();
      document.body.appendChild(el);
      await settle(el);
      stubLayout(el);
      await hoverAt(el, ...ringPoint(Math.PI / 4));
      expect(el.querySelector('.void-donut-chart-hover')).not.toBeNull();
    });
  });

  describe('reacting to changes', () => {
    it('re-renders when data is replaced', async () => {
      const el = await mount<VoidDonutChart>(TAG, { data: four });
      el.data = { segments: [{ name: 'x', value: 1 }, { name: 'y', value: 1 }] };
      await settle(el);
      expect(segs(el)).toHaveLength(2);
    });

    it('ends with the same geometry as a fresh mount of the same data', async () => {
      const next: DonutChartData = { segments: [{ name: 'x', value: 3 }, { name: 'y', value: 1 }, { name: 'z', value: 1 }] };
      const a = await mount<VoidDonutChart>(TAG, { data: four });
      a.data = next;
      await settle(a);
      const b = await mount<VoidDonutChart>(TAG, { data: next });
      expect(segs(a).map((s) => s.getAttribute('d'))).toEqual(segs(b).map((s) => s.getAttribute('d')));
    });

    it('updates the total label with the data', async () => {
      const el = await mount<VoidDonutChart>(TAG, { data: four, showTotal: true });
      el.data = { segments: [{ name: 'x', value: 10 }, { name: 'y', value: 5 }] };
      await settle(el);
      expect(el.querySelector('.void-donut-chart-total text')!.textContent).toBe('15');
    });

    it('returns to the empty state and back', async () => {
      const el = await mount<VoidDonutChart>(TAG, { data: four });
      el.data = { segments: [] };
      await settle(el);
      expect(segs(el)).toHaveLength(0);
      el.data = four;
      await settle(el);
      expect(segs(el)).toHaveLength(3);
    });

    it('re-renders when size or inner change', async () => {
      const el = await mount<VoidDonutChart>(TAG, { data: four });
      el.size = 300;
      el.inner = 0.8;
      await settle(el);
      expect(el.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 300 300');
      expect(segs(el)[0]!.getAttribute('d')).toContain('A 146 146');
      expect(segs(el)[0]!.getAttribute('d')).toMatch(/A 116\.8\d* 116\.8\d* /);
    });

    it('toggles total and value labels at runtime', async () => {
      const el = await mount<VoidDonutChart>(TAG, { data: four });
      el.showTotal = true;
      el.showValue = true;
      await settle(el);
      expect(el.querySelector('.void-donut-chart-total')).not.toBeNull();
      expect(el.querySelector('.void-donut-chart-labels')).not.toBeNull();
      el.showTotal = false;
      el.showValue = false;
      await settle(el);
      expect(el.querySelector('.void-donut-chart-total')).toBeNull();
      expect(el.querySelector('.void-donut-chart-labels')).toBeNull();
    });

    it('reads back the data it was given', async () => {
      const el = await mount<VoidDonutChart>(TAG, { data: four });
      expect(el.data).toBe(four);
    });
  });

  describe('animation lifecycle', () => {
    it('starts in the "pre" phase with nothing drawn yet', async () => {
      const el = document.createElement(TAG) as VoidDonutChart;
      el.data = four;
      document.body.appendChild(el);
      await el.updateComplete;
      expect(el.querySelector('svg')!.getAttribute('data-phase')).toBe('pre');
      expect(segs(el)).toHaveLength(0);
    });

    it('ends in the "idle" phase with the ring complete', async () => {
      const el = await mount<VoidDonutChart>(TAG, { data: four });
      expect(el.querySelector('svg')!.getAttribute('data-phase')).toBe('idle');
      expect(arc(segs(el)[2]!, 220).end).toBeCloseTo(TAU, 1);
    });

    it('sweeps in progressively on entrance, then settles', async () => {
      const el = document.createElement(TAG) as VoidDonutChart;
      el.style.setProperty('--void-duration-chart-enter', '100');
      el.data = four;
      document.body.appendChild(el);
      await el.updateComplete;
      await sleep(40);
      await el.updateComplete;
      expect(el.querySelector('svg')!.getAttribute('data-phase')).toBe('animating');
      const midSweep = segs(el).reduce((s, p) => s + arc(p, 220).sweep, 0);
      expect(midSweep).toBeLessThan(TAU - 0.05);
      await sleep(300);
      await el.updateComplete;
      expect(el.querySelector('svg')!.getAttribute('data-phase')).toBe('idle');
      expect(segs(el).reduce((s, p) => s + arc(p, 220).sweep, 0)).toBeCloseTo(TAU, 1);
    });

    it('can be removed mid-animation without throwing', async () => {
      const el = document.createElement(TAG) as VoidDonutChart;
      el.style.setProperty('--void-duration-chart-enter', '200');
      el.data = four;
      document.body.appendChild(el);
      await el.updateComplete;
      el.remove();
      await sleep(50);
      expect(el.isConnected).toBe(false);
    });
  });
});
