// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidGauge, type GaugeData, type GaugeZone } from '../../src/components/gauge.js';
import { mount, settle, noAnimation } from '../helpers/chart.js';

const TAG = 'void-gauge';
const PI = Math.PI;
const TAU = 2 * PI;

// Defaults: size 220, thickness 14 -> centre 110, centreline radius 220/2 - max(8, 7) = 102.
const C = 110;
const R = 102;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const q = (el: Element, sel: string) => el.querySelector(sel);
const qa = (el: Element, sel: string) => Array.from(el.querySelectorAll(sel));
const num = (e: Element, a: string) => Number(e.getAttribute(a));
const nums = (d: string) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
const centerText = (el: Element) => q(el, '.void-gauge-center-value')?.textContent ?? null;

const ARC = {
  full: { start: -PI / 2, sweep: TAU },
  semi: { start: -PI, sweep: PI },
  triple: { start: (3 * PI) / 4, sweep: (3 * PI) / 2 },
} as const;

/** Fraction (0..1) along the gauge arc of an svg-space point about the centre. */
function ratioOf(x: number, y: number, circular: keyof typeof ARC = 'triple'): number {
  const { start, sweep } = ARC[circular];
  let rel = Math.atan2(y - C, x - C) - start;
  while (rel < -1e-3) rel += TAU;
  while (rel > TAU) rel -= TAU;
  return rel / sweep;
}

/** End point (last two numbers) of a `M .. A ..` stroke arc, as a fraction along the gauge. */
function arcEndRatio(d: string, circular: keyof typeof ARC = 'triple'): number {
  const n = nums(d);
  return ratioOf(n[n.length - 2]!, n[n.length - 1]!, circular);
}

function stubLayout(el: Element, w = 220, h = 187): void {
  q(el, 'svg')!.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: w, height: h, right: w, bottom: h, x: 0, y: 0, toJSON() {} }) as DOMRect;
}

async function hoverAt(el: VoidGauge, x: number, y: number): Promise<void> {
  el.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y, bubbles: true }));
  await el.updateComplete;
}

/** Point on the band centreline at a fraction along a triple gauge. */
function bandPoint(frac: number): [number, number] {
  const a = ARC.triple.start + frac * ARC.triple.sweep;
  return [C + R * Math.cos(a), C + R * Math.sin(a)];
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('VoidGauge', () => {
  describe('class', () => {
    it('extends VoidElement and renders into itself (light DOM)', () => {
      expect(Object.getPrototypeOf(VoidGauge)).toBe(VoidElement);
      const el = document.createElement(TAG) as VoidGauge;
      expect(el.createRenderRoot()).toBe(el);
    });

    it('is registered as void-gauge', () => {
      expect(customElements.get(TAG)).toBe(VoidGauge);
    });
  });

  describe('default property values', () => {
    const el = document.createElement(TAG) as VoidGauge;
    it('unit defaults to empty', () => expect(el.unit).toBe(''));
    it('value defaults to 0', () => expect(el.value).toBe(0));
    it('min defaults to 0', () => expect(el.min).toBe(0));
    it('max defaults to 100', () => expect(el.max).toBe(100));
    it('size defaults to 220', () => expect(el.size).toBe(220));
    it('thickness defaults to 14', () => expect(el.thickness).toBe(14));
    it('circular defaults to "triple"', () => expect(el.circular).toBe('triple'));
    it('variant defaults to "filled"', () => expect(el.variant).toBe('filled'));
    it('showValue defaults to true', () => expect(el.showValue).toBe(true));
    it('unitInline defaults to false', () => expect(el.unitInline).toBe(false));
    it('tickMajor and tickMinor default to 0', () => {
      expect(el.tickMajor).toBe(0);
      expect(el.tickMinor).toBe(0);
    });
    it('tickMin and tickMax default to true', () => {
      expect(el.tickMin).toBe(true);
      expect(el.tickMax).toBe(true);
    });
    it('segmentsSort defaults to "value"', () => expect(el.segmentsSort).toBe('value'));
    it('gaps defaults to false', () => expect(el.gaps).toBe(false));
    it('zones defaults to an empty list', () => expect(el.zones).toEqual([]));
    it('data defaults to an empty object', () => expect(el.data).toEqual({}));
  });

  describe('attributes and reflection', () => {
    it('reads numeric attributes', () => {
      const el = document.createElement(TAG) as VoidGauge;
      el.setAttribute('value', '42');
      el.setAttribute('min', '-10');
      el.setAttribute('max', '10');
      el.setAttribute('thickness', '20');
      el.setAttribute('tick-major', '5');
      el.setAttribute('tick-minor', '1');
      expect([el.value, el.min, el.max, el.thickness, el.tickMajor, el.tickMinor]).toEqual([42, -10, 10, 20, 5, 1]);
    });

    it('reflects size, circular, variant, show-value, unit-inline, tick-min and tick-max', async () => {
      const el = await mount<VoidGauge>(TAG, { size: 180, circular: 'semi', variant: 'outline', unitInline: true });
      expect(el.getAttribute('size')).toBe('180');
      expect(el.getAttribute('circular')).toBe('semi');
      expect(el.getAttribute('variant')).toBe('outline');
      expect(el.hasAttribute('unit-inline')).toBe(true);
      expect(el.hasAttribute('show-value')).toBe(true);
      expect(el.hasAttribute('tick-min')).toBe(true);
      expect(el.hasAttribute('tick-max')).toBe(true);
    });

    it('maps segments-sort and aria-label attributes', () => {
      const el = document.createElement(TAG) as VoidGauge;
      el.setAttribute('segments-sort', 'manual');
      el.setAttribute('aria-label', 'CPU');
      expect(el.segmentsSort).toBe('manual');
      expect(el.ariaLabel).toBe('CPU');
    });

    it('removing the tick-min attribute restores the default (on), as markup without it means', () => {
      const el = document.createElement(TAG) as VoidGauge;
      el.setAttribute('tick-min', 'false');
      el.removeAttribute('tick-min');
      expect(el.tickMin).toBe(true);
    });

    it('tick-min="false" disables the min tick (as documented)', () => {
      const el = document.createElement(TAG) as VoidGauge;
      el.setAttribute('tick-min', 'false');
      expect(el.tickMin).toBe(false);
    });

    it('tick-max="false" disables the max tick (as documented)', () => {
      const el = document.createElement(TAG) as VoidGauge;
      el.setAttribute('tick-max', 'false');
      expect(el.tickMax).toBe(false);
    });

    describe('gaps converter', () => {
      const make = (attr: string) => {
        const el = document.createElement(TAG) as VoidGauge;
        el.setAttribute('gaps', attr);
        return el;
      };
      it('empty attribute means true', () => expect(make('').gaps).toBe(true));
      it('"false" means false', () => expect(make('false').gaps).toBe(false));
      it('a number means that percentage', () => expect(make('4').gaps).toBe(4));
      it('garbage falls back to true', () => expect(make('x').gaps).toBe(true));
    });
  });

  describe('accessibility', () => {
    it('sets role="img" on the host', async () => {
      const el = await mount<VoidGauge>(TAG, { value: 10 });
      expect(el.getAttribute('role')).toBe('img');
    });

    it('gives the svg role="img" and a default name', async () => {
      const el = await mount<VoidGauge>(TAG, { value: 10 });
      const svg = q(el, 'svg')!;
      expect(svg.getAttribute('role')).toBe('img');
      expect(svg.getAttribute('aria-label')).toBe('Gauge chart');
    });

    it('uses the consumer supplied aria-label', async () => {
      const el = await mount<VoidGauge>(TAG, { value: 10, ariaLabel: 'CPU load' });
      expect(q(el, 'svg')!.getAttribute('aria-label')).toBe('CPU load');
    });
  });

  describe('viewBox per arc shape', () => {
    it('full is square', async () => {
      const el = await mount<VoidGauge>(TAG, { circular: 'full' });
      expect(q(el, 'svg')!.getAttribute('viewBox')).toBe('0 0 220 220');
    });

    it('triple is 85% of the width tall', async () => {
      const el = await mount<VoidGauge>(TAG, { circular: 'triple' });
      expect(Number(q(el, 'svg')!.getAttribute('viewBox')!.split(' ')[3])).toBeCloseTo(187, 5);
    });

    it('semi is 60% of the width tall', async () => {
      const el = await mount<VoidGauge>(TAG, { circular: 'semi' });
      expect(Number(q(el, 'svg')!.getAttribute('viewBox')!.split(' ')[3])).toBeCloseTo(132, 5);
    });

    it('scales with size', async () => {
      const el = await mount<VoidGauge>(TAG, { circular: 'semi', size: 100 });
      expect(q(el, 'svg')!.getAttribute('viewBox')).toBe('0 0 100 60');
    });
  });

  describe('track', () => {
    it('is always rendered, even with no value', async () => {
      const el = await mount<VoidGauge>(TAG, {});
      expect(q(el, '.void-gauge-track')).not.toBeNull();
    });

    it('uses the thickness as stroke width', async () => {
      const el = await mount<VoidGauge>(TAG, { thickness: 20 });
      expect(q(el, '.void-gauge-track')!.getAttribute('style')).toContain('stroke-width: 20');
    });

    it('semi track is a half circle from left to right over the top', async () => {
      const el = await mount<VoidGauge>(TAG, { circular: 'semi', size: 220 });
      expect(q(el, '.void-gauge-track')!.getAttribute('d')).toBe('M 8.00 110.00 A 102 102 0 0 1 212.00 110.00');
    });

    it('triple track spans 270 degrees (large arc)', async () => {
      const el = await mount<VoidGauge>(TAG, { circular: 'triple' });
      const n = nums(q(el, '.void-gauge-track')!.getAttribute('d')!);
      expect(n[5]).toBe(1);
      expect(arcEndRatio(q(el, '.void-gauge-track')!.getAttribute('d')!)).toBeCloseTo(1, 1);
    });

    it('full track is clamped just short of 2pi so it still renders', async () => {
      const el = await mount<VoidGauge>(TAG, { circular: 'full' });
      const n = nums(q(el, '.void-gauge-track')!.getAttribute('d')!);
      expect(n[5]).toBe(1);
      expect(el.innerHTML).not.toContain('NaN');
    });
  });

  describe('value fill', () => {
    it('draws nothing for a zero value', async () => {
      const el = await mount<VoidGauge>(TAG, { value: 0 });
      expect(q(el, '.void-gauge-value')).toBeNull();
    });

    it('ends at the matching fraction of the sweep', async () => {
      for (const frac of [0.25, 0.5, 0.75]) {
        const el = await mount<VoidGauge>(TAG, { value: frac * 100 });
        expect(arcEndRatio(q(el, '.void-gauge-value')!.getAttribute('d')!)).toBeCloseTo(frac, 1);
      }
    });

    it('works for every arc shape', async () => {
      for (const circular of ['full', 'semi', 'triple'] as const) {
        const el = await mount<VoidGauge>(TAG, { value: 50, circular });
        expect(arcEndRatio(q(el, '.void-gauge-value')!.getAttribute('d')!, circular), circular).toBeCloseTo(0.5, 1);
      }
    });

    it('honours min and max', async () => {
      const el = await mount<VoidGauge>(TAG, { value: 150, min: 100, max: 200 });
      expect(arcEndRatio(q(el, '.void-gauge-value')!.getAttribute('d')!)).toBeCloseTo(0.5, 1);
    });

    it('supports negative ranges', async () => {
      const el = await mount<VoidGauge>(TAG, { value: 0, min: -50, max: 50 });
      expect(arcEndRatio(q(el, '.void-gauge-value')!.getAttribute('d')!)).toBeCloseTo(0.5, 1);
    });

    it('clamps values above max to a full arc', async () => {
      const el = await mount<VoidGauge>(TAG, { value: 500 });
      expect(arcEndRatio(q(el, '.void-gauge-value')!.getAttribute('d')!)).toBeCloseTo(1, 1);
    });

    it('clamps values below min to an empty arc', async () => {
      const el = await mount<VoidGauge>(TAG, { value: -20 });
      expect(q(el, '.void-gauge-value')).toBeNull();
    });

    it('renders without NaN when max equals min', async () => {
      const el = await mount<VoidGauge>(TAG, { value: 5, min: 5, max: 5 });
      expect(el.innerHTML).not.toContain('NaN');
      expect(q(el, '.void-gauge-value')).toBeNull();
    });

    it('uses the accent token as the default fill color', async () => {
      const el = await mount<VoidGauge>(TAG, { value: 40 });
      expect(q(el, '.void-gauge-value')!.getAttribute('style')).toContain('--value-color: var(--void-color-accent)');
    });

    it('uses the thickness as the fill stroke width', async () => {
      const el = await mount<VoidGauge>(TAG, { value: 40, thickness: 22 });
      expect(q(el, '.void-gauge-value')!.getAttribute('style')).toContain('stroke-width: 22');
    });

    it('outline variant draws a closed band instead of a stroked arc', async () => {
      const el = await mount<VoidGauge>(TAG, { value: 40, variant: 'outline' });
      const d = q(el, '.void-gauge-value')!.getAttribute('d')!;
      expect(d.endsWith('Z')).toBe(true);
      expect(d.match(/A /g)).toHaveLength(4);
    });

    it('filled and wireframe variants draw an open stroked arc', async () => {
      for (const variant of ['filled', 'wireframe'] as const) {
        const el = await mount<VoidGauge>(TAG, { value: 40, variant });
        const d = q(el, '.void-gauge-value')!.getAttribute('d')!;
        expect(d.endsWith('Z'), variant).toBe(false);
        expect(d.match(/A /g), variant).toHaveLength(1);
      }
    });

    it('sets the large-arc flag once the fill exceeds half a turn', async () => {
      const small = await mount<VoidGauge>(TAG, { value: 20, circular: 'full' });
      const big = await mount<VoidGauge>(TAG, { value: 80, circular: 'full' });
      expect(nums(q(small, '.void-gauge-value')!.getAttribute('d')!)[5]).toBe(0);
      expect(nums(q(big, '.void-gauge-value')!.getAttribute('d')!)[5]).toBe(1);
    });
  });

  describe('center label', () => {
    it('shows the rounded value', async () => {
      const el = await mount<VoidGauge>(TAG, { value: 75.6 });
      expect(centerText(el)).toBe('76');
    });

    it('abbreviates thousands and millions', async () => {
      expect(centerText(await mount<VoidGauge>(TAG, { value: 1500, max: 5000 }))).toBe('1.5k');
      expect(centerText(await mount<VoidGauge>(TAG, { value: 12000, max: 50000 }))).toBe('12k');
      expect(centerText(await mount<VoidGauge>(TAG, { value: 2_500_000, max: 5_000_000 }))).toBe('2.5M');
    });

    it('is hidden when show-value is false', async () => {
      const el = await mount<VoidGauge>(TAG, { value: 10, showValue: false });
      expect(q(el, '.void-gauge-center-value')).toBeNull();
    });

    it('places the unit on a separate line by default', async () => {
      const el = await mount<VoidGauge>(TAG, { value: 10, unit: 'MB/s' });
      const unit = q(el, '.void-gauge-center-unit')!;
      expect(unit.textContent).toBe('MB/s');
      expect(num(unit, 'y')).toBeGreaterThan(num(q(el, '.void-gauge-center-value')!, 'y'));
      expect(q(el, '.void-gauge-center-unit-inline')).toBeNull();
    });

    it('places the unit inline as a tspan with unit-inline', async () => {
      const el = await mount<VoidGauge>(TAG, { value: 75, unit: '%', unitInline: true });
      expect(q(el, '.void-gauge-center-unit')).toBeNull();
      expect(q(el, '.void-gauge-center-unit-inline')!.textContent).toBe('%');
      expect(centerText(el)).toBe('75%');
    });

    it('renders no unit element when unit is empty', async () => {
      const el = await mount<VoidGauge>(TAG, { value: 75, unitInline: true });
      expect(q(el, '.void-gauge-center-unit')).toBeNull();
      expect(q(el, '.void-gauge-center-unit-inline')).toBeNull();
    });

    it('is centred horizontally, and raised for semi gauges', async () => {
      const full = await mount<VoidGauge>(TAG, { value: 1, circular: 'triple' });
      expect(num(q(full, '.void-gauge-center-value')!, 'x')).toBe(110);
      expect(num(q(full, '.void-gauge-center-value')!, 'y')).toBe(110);
      const semi = await mount<VoidGauge>(TAG, { value: 1, circular: 'semi' });
      expect(num(q(semi, '.void-gauge-center-value')!, 'y')).toBeLessThan(110);
    });
  });

  describe('reacting to property changes', () => {
    it('re-renders when thickness changes', async () => {
      const el = await mount<VoidGauge>(TAG, { value: 40 });
      el.thickness = 30;
      await settle(el);
      expect(q(el, '.void-gauge-track')!.getAttribute('style')).toContain('stroke-width: 30');
    });

    it('re-renders when min/max change', async () => {
      const el = await mount<VoidGauge>(TAG, { value: 50 });
      el.max = 200;
      await settle(el);
      expect(arcEndRatio(q(el, '.void-gauge-value')!.getAttribute('d')!)).toBeCloseTo(0.25, 1);
    });

    it('re-renders when circular changes', async () => {
      const el = await mount<VoidGauge>(TAG, { value: 50 });
      el.circular = 'semi';
      await settle(el);
      expect(q(el, 'svg')!.getAttribute('viewBox')).toBe('0 0 220 132');
    });

    it('toggles the center label', async () => {
      const el = await mount<VoidGauge>(TAG, { value: 50 });
      el.showValue = false;
      await settle(el);
      expect(q(el, '.void-gauge-center-value')).toBeNull();
    });

    it('re-renders the center label and fill when `value` changes after mount', async () => {
      const el = await mount<VoidGauge>(TAG, { value: 20 });
      el.value = 80;
      await settle(el);
      expect(centerText(el)).toBe('80');
      expect(arcEndRatio(q(el, '.void-gauge-value')!.getAttribute('d')!)).toBeCloseTo(0.8, 1);
    });
  });

  describe('data property', () => {
    it('data.value takes precedence over the value property', async () => {
      const el = await mount<VoidGauge>(TAG, { value: 10, data: { value: 60 } });
      expect(centerText(el)).toBe('60');
    });

    it('falls back to the value property when data is empty', async () => {
      const el = await mount<VoidGauge>(TAG, { value: 33, data: {} });
      expect(centerText(el)).toBe('33');
    });

    it('sums segments when no explicit value is given', async () => {
      const el = await mount<VoidGauge>(TAG, {
        data: { segments: [{ name: 'a', value: 30 }, { name: 'b', value: 20 }] },
      });
      expect(centerText(el)).toBe('50');
    });

    it('re-renders when data is replaced', async () => {
      const el = await mount<VoidGauge>(TAG, { data: { value: 20 } });
      el.data = { value: 90 };
      await settle(el);
      expect(centerText(el)).toBe('90');
      expect(arcEndRatio(q(el, '.void-gauge-value')!.getAttribute('d')!)).toBeCloseTo(0.9, 1);
    });

    it('ends with the same geometry as a fresh mount of the same data', async () => {
      const next: GaugeData = { segments: [{ name: 'x', value: 40 }, { name: 'y', value: 60 }] };
      const a = await mount<VoidGauge>(TAG, { data: { value: 10 } });
      a.data = next;
      await settle(a);
      const b = await mount<VoidGauge>(TAG, { data: next });
      expect(qa(a, '.void-gauge-segment').map((s) => s.getAttribute('d'))).toEqual(
        qa(b, '.void-gauge-segment').map((s) => s.getAttribute('d')),
      );
    });

    it('reads back the data it was given', async () => {
      const d: GaugeData = { value: 5 };
      const el = await mount<VoidGauge>(TAG, { data: d });
      expect(el.data).toBe(d);
    });
  });

  describe('zones', () => {
    const zones: GaugeZone[] = [
      { from: 0, to: 50, color: 'green' },
      { from: 50, to: 100, color: 'red' },
    ];
    const fill = (el: Element) => q(el, '.void-gauge-value')!.getAttribute('style')!;

    it('colors the fill by the zone containing the value', async () => {
      expect(fill(await mount<VoidGauge>(TAG, { value: 25, zones }))).toContain('--value-color: green');
      expect(fill(await mount<VoidGauge>(TAG, { value: 75, zones }))).toContain('--value-color: red');
    });

    it('picks the first matching zone on a shared boundary', async () => {
      expect(fill(await mount<VoidGauge>(TAG, { value: 50, zones }))).toContain('--value-color: green');
    });

    it('falls back to the last zone when the value exceeds every zone', async () => {
      expect(fill(await mount<VoidGauge>(TAG, { value: 100, max: 200, zones: [zones[0]!] }))).toContain('--value-color: green');
      expect(fill(await mount<VoidGauge>(TAG, { value: 150, max: 200, zones }))).toContain('--value-color: red');
    });

    it('does not use the last zone colour for a value below the first zone', async () => {
      const low: GaugeZone[] = [
        { from: 20, to: 50, color: 'green' },
        { from: 50, to: 100, color: 'red' },
      ];
      expect(fill(await mount<VoidGauge>(TAG, { value: 10, zones: low }))).not.toContain('--value-color: red');
    });

    it('renders one band per zone behind the value in the filled variant', async () => {
      const el = await mount<VoidGauge>(TAG, { value: 25, zones });
      expect(qa(el, '.void-gauge-zone')).toHaveLength(2);
      expect(qa(el, '.void-gauge-zone')[0]!.getAttribute('style')).toContain('--zone-color: green');
      expect(qa(el, '.void-gauge-zone')[0]!.getAttribute('style')).toContain('stroke-width: 14');
    });

    it('adds round caps at the gauge extremes when zones reach min and max', async () => {
      const el = await mount<VoidGauge>(TAG, { value: 25, zones });
      expect(qa(el, '.void-gauge-zone-cap')).toHaveLength(2);
    });

    it('adds no caps when zones stop short of min/max', async () => {
      const el = await mount<VoidGauge>(TAG, {
        value: 25,
        zones: [{ from: 10, to: 40, color: 'a' }, { from: 40, to: 90, color: 'b' }],
      });
      expect(qa(el, '.void-gauge-zone-cap')).toHaveLength(0);
    });

    it('draws zone arcs at their own positions', async () => {
      const el = await mount<VoidGauge>(TAG, { value: 10, zones });
      const [z0, z1] = qa(el, '.void-gauge-zone');
      expect(arcEndRatio(z0!.getAttribute('d')!)).toBeCloseTo(0.5, 1);
      expect(arcEndRatio(z1!.getAttribute('d')!)).toBeCloseTo(1, 1);
    });

    it('uses a thinner stroke for zones in the wireframe variant', async () => {
      const el = await mount<VoidGauge>(TAG, { value: 25, zones, variant: 'wireframe' });
      expect(qa(el, '.void-gauge-zone')[0]!.getAttribute('style')).toContain('stroke-width: 7.5');
    });

    it('outline variant skips zones fully covered by the value', async () => {
      const el = await mount<VoidGauge>(TAG, { value: 75, zones, variant: 'outline' });
      const bands = qa(el, '.void-gauge-zone');
      expect(bands).toHaveLength(1);
      expect(bands[0]!.getAttribute('style')).toContain('--zone-color: red');
      expect(bands[0]!.getAttribute('d')!.endsWith('Z')).toBe(true);
    });

    it('outline variant renders every zone when there is no fill', async () => {
      const el = await mount<VoidGauge>(TAG, { value: 0, zones, variant: 'outline' });
      expect(qa(el, '.void-gauge-zone')).toHaveLength(2);
    });

    it('renders no zones when segments are present', async () => {
      const el = await mount<VoidGauge>(TAG, { zones, data: { segments: [{ name: 'a', value: 100 }] } });
      expect(q(el, '.void-gauge-zones')).toBeNull();
    });

    it('renders no zone group without zones', async () => {
      const el = await mount<VoidGauge>(TAG, { value: 50 });
      expect(q(el, '.void-gauge-zones')).toBeNull();
    });

    it('re-renders when zones are assigned after mount', async () => {
      const el = await mount<VoidGauge>(TAG, { value: 25 });
      el.zones = zones;
      await settle(el);
      expect(qa(el, '.void-gauge-zone')).toHaveLength(2);
    });
  });

  describe('ticks', () => {
    const tickEls = (el: Element) => qa(el, '.void-gauge-tick');
    const major = (el: Element) => qa(el, '.void-gauge-tick-major');
    const minor = (el: Element) => qa(el, '.void-gauge-tick-minor');
    const len = (t: Element) => Math.hypot(num(t, 'x2') - num(t, 'x1'), num(t, 'y2') - num(t, 'y1'));

    it('renders no ticks by default (tick-min/max alone do not enable ticks)', async () => {
      const el = await mount<VoidGauge>(TAG, { value: 50 });
      expect(q(el, '.void-gauge-ticks')).toBeNull();
    });

    it('major interval produces ticks at min, every step, and max', async () => {
      const el = await mount<VoidGauge>(TAG, { tickMajor: 25 });
      expect(major(el)).toHaveLength(5);
      expect(minor(el)).toHaveLength(0);
    });

    it('positions ticks at their values along the arc', async () => {
      const el = await mount<VoidGauge>(TAG, { tickMajor: 25 });
      const ratios = major(el).map((t) => ratioOf(num(t, 'x1'), num(t, 'y1')));
      [0, 0.25, 0.5, 0.75, 1].forEach((r, i) => expect(ratios[i]).toBeCloseTo(r, 1));
    });

    it('major + minor intervals classify shared positions as major', async () => {
      const el = await mount<VoidGauge>(TAG, { tickMajor: 25, tickMinor: 5, tickMin: false, tickMax: false });
      // Documented example: 4 majors (25..100) and 16 minors.
      expect(major(el)).toHaveLength(4);
      expect(minor(el)).toHaveLength(16);
    });

    it('tick-min / tick-max add forced major ticks at the ends', async () => {
      const el = await mount<VoidGauge>(TAG, { tickMajor: 25, tickMinor: 5 });
      expect(major(el)).toHaveLength(5);
      expect(minor(el)).toHaveLength(16);
    });

    it('minor-only ticks still get forced major end ticks', async () => {
      const el = await mount<VoidGauge>(TAG, { tickMinor: 10 });
      expect(major(el)).toHaveLength(2);
      expect(minor(el)).toHaveLength(9);
    });

    it('tick-max forces a major tick at max when it is off-step', async () => {
      const el = await mount<VoidGauge>(TAG, { tickMajor: 30, tickMin: false });
      const ratios = tickEls(el).map((t) => ratioOf(num(t, 'x1'), num(t, 'y1')));
      expect(major(el)).toHaveLength(4); // 30, 60, 90, 100
      expect(ratios[ratios.length - 1]).toBeCloseTo(1, 1);
    });

    it('omits the max tick when off-step and tick-max is disabled', async () => {
      const el = await mount<VoidGauge>(TAG, { tickMajor: 30, tickMin: false, tickMax: false });
      expect(major(el)).toHaveLength(3); // 30, 60, 90
    });

    it('draws major ticks longer than minor ticks, inside the band', async () => {
      const el = await mount<VoidGauge>(TAG, { tickMajor: 50, tickMinor: 10 });
      const maj = major(el)[0]!;
      const min = minor(el)[0]!;
      expect(len(maj)).toBeGreaterThan(len(min));
      // starts below the inner edge of the band (R - thickness/2 = 95)
      expect(Math.hypot(num(maj, 'x1') - C, num(maj, 'y1') - C)).toBeLessThan(95);
    });

    it('works with a non-zero min', async () => {
      const el = await mount<VoidGauge>(TAG, { min: 100, max: 200, tickMajor: 50 });
      const ratios = tickEls(el).map((t) => ratioOf(num(t, 'x1'), num(t, 'y1')));
      expect(ratios).toHaveLength(3);
      expect(ratios[1]).toBeCloseTo(0.5, 1);
    });

    it('renders nothing for an empty or inverted range', async () => {
      expect(q(await mount<VoidGauge>(TAG, { tickMajor: 10, min: 5, max: 5 }), '.void-gauge-ticks')).toBeNull();
      expect(q(await mount<VoidGauge>(TAG, { tickMajor: 10, min: 10, max: 0 }), '.void-gauge-ticks')).toBeNull();
    });

    it('ignores negative intervals', async () => {
      const el = await mount<VoidGauge>(TAG, { tickMajor: -10 });
      expect(q(el, '.void-gauge-ticks')).toBeNull();
    });

    it('does not emit NaN coordinates', async () => {
      const el = await mount<VoidGauge>(TAG, { tickMajor: 20, tickMinor: 5 });
      expect(el.innerHTML).not.toContain('NaN');
    });
  });

  describe('segments', () => {
    const total100: GaugeData = {
      segments: [
        { name: 'small', value: 25, color: 'blue' },
        { name: 'big', value: 75, color: 'orange' },
      ],
    };
    const segs = (el: Element) => qa(el, '.void-gauge-segment');

    it('renders no segment group without segments', async () => {
      const el = await mount<VoidGauge>(TAG, { value: 50 });
      expect(q(el, '.void-gauge-segments')).toBeNull();
    });

    it('replaces the value fill when segments are present', async () => {
      const el = await mount<VoidGauge>(TAG, { data: total100 });
      expect(q(el, '.void-gauge-value')).toBeNull();
      expect(segs(el)).toHaveLength(2);
    });

    it('tags each segment with its original data index and colour', async () => {
      const el = await mount<VoidGauge>(TAG, { data: total100 });
      const byIdx = new Map(segs(el).map((s) => [s.getAttribute('data-segment-index'), s]));
      expect(byIdx.get('0')!.getAttribute('style')).toContain('--segment-color: blue');
      expect(byIdx.get('1')!.getAttribute('style')).toContain('--segment-color: orange');
    });

    it('defaults to the accent colour', async () => {
      const el = await mount<VoidGauge>(TAG, { data: { segments: [{ name: 'a', value: 100 }] } });
      expect(segs(el)[0]!.getAttribute('style')).toContain('var(--void-color-accent)');
    });

    it('sorts largest first by default', async () => {
      const el = await mount<VoidGauge>(TAG, { data: total100 });
      expect(segs(el).map((s) => s.getAttribute('data-segment-index'))).toEqual(['1', '0']);
    });

    it('keeps the given order with segments-sort="manual"', async () => {
      const el = await mount<VoidGauge>(TAG, { data: total100, segmentsSort: 'manual' });
      expect(segs(el).map((s) => s.getAttribute('data-segment-index'))).toEqual(['0', '1']);
    });

    it('sizes segments in proportion to their value', async () => {
      const el = await mount<VoidGauge>(TAG, { data: total100, segmentsSort: 'manual' });
      const [a, b] = segs(el).map((s) => nums(s.getAttribute('d')!));
      const aEnd = ratioOf(a![a!.length - 2]!, a![a!.length - 1]!);
      const bEnd = ratioOf(b![b!.length - 2]!, b![b!.length - 1]!);
      expect(aEnd).toBeCloseTo(0.25, 1);
      expect(bEnd).toBeCloseTo(1, 1);
    });

    it('skips zero-valued segments', async () => {
      const el = await mount<VoidGauge>(TAG, {
        data: { segments: [{ name: 'a', value: 0 }, { name: 'b', value: 100 }] },
      });
      expect(segs(el).map((s) => s.getAttribute('data-segment-index'))).toEqual(['1']);
    });

    it('adds a round cap circle at each end of the fill', async () => {
      const el = await mount<VoidGauge>(TAG, { data: total100 });
      const caps = qa(el, '.void-gauge-segment-cap');
      expect(caps).toHaveLength(2);
      for (const c of caps) expect(num(c, 'r')).toBe(7);
    });

    it('outline variant draws closed bands', async () => {
      const el = await mount<VoidGauge>(TAG, { data: total100, variant: 'outline' });
      for (const s of segs(el)) expect(s.getAttribute('d')!.endsWith('Z')).toBe(true);
    });

    it('gaps=false leaves no space between segments', async () => {
      const el = await mount<VoidGauge>(TAG, { data: total100, segmentsSort: 'manual' });
      const [a, b] = segs(el).map((s) => nums(s.getAttribute('d')!));
      // end of first == start of second
      expect([a![a!.length - 2], a![a!.length - 1]]).toEqual([b![0], b![1]]);
    });

    it('gaps open space only between segments, not at the ends', async () => {
      const el = await mount<VoidGauge>(TAG, { data: total100, segmentsSort: 'manual', gaps: 10 });
      const [a, b] = segs(el).map((s) => nums(s.getAttribute('d')!));
      const aStart = ratioOf(a![0]!, a![1]!);
      const aEnd = ratioOf(a![a!.length - 2]!, a![a!.length - 1]!);
      const bStart = ratioOf(b![0]!, b![1]!);
      const bEnd = ratioOf(b![b!.length - 2]!, b![b!.length - 1]!);
      expect(aStart).toBeCloseTo(0, 1);
      expect(bEnd).toBeCloseTo(1, 1);
      expect(bStart - aEnd).toBeCloseTo(0.1, 1);
    });

    it('a single segment is not padded by gaps', async () => {
      const el = await mount<VoidGauge>(TAG, { data: { segments: [{ name: 'a', value: 100 }] }, gaps: 20 });
      const d = nums(segs(el)[0]!.getAttribute('d')!);
      expect(ratioOf(d[0]!, d[1]!)).toBeCloseTo(0, 1);
      expect(ratioOf(d[d.length - 2]!, d[d.length - 1]!)).toBeCloseTo(1, 1);
    });

    it('does not emit NaN', async () => {
      const el = await mount<VoidGauge>(TAG, { data: total100, gaps: true });
      expect(el.innerHTML).not.toContain('NaN');
    });

    it('draws every segment when the segments sum to less than max', async () => {
      const el = await mount<VoidGauge>(TAG, {
        data: { segments: [{ name: 'a', value: 30 }, { name: 'b', value: 20 }] },
        segmentsSort: 'manual',
      });
      expect(segs(el)).toHaveLength(2);
      const [a] = segs(el).map((s) => nums(s.getAttribute('d')!));
      expect(ratioOf(a![a!.length - 2]!, a![a!.length - 1]!)).toBeCloseTo(0.3, 1);
    });
  });

  describe('hover (layout stubbed: happy-dom has no real getBoundingClientRect)', () => {
    const data: GaugeData = {
      segments: [
        { name: 'small', value: 25 },
        { name: 'big', value: 75 },
      ],
    };

    it('does nothing without a layout box', async () => {
      const el = await mount<VoidGauge>(TAG, { data });
      await hoverAt(el, ...bandPoint(0.1));
      expect(q(el, '.void-gauge-hover')).toBeNull();
    });

    it('does nothing for a gauge without segments', async () => {
      const el = await mount<VoidGauge>(TAG, { value: 80 });
      stubLayout(el);
      await hoverAt(el, ...bandPoint(0.1));
      expect(q(el, '.void-gauge-hover')).toBeNull();
    });

    it('shows a tooltip with the name, value and percentage of the segment under the pointer', async () => {
      const el = await mount<VoidGauge>(TAG, { data });
      stubLayout(el);
      await hoverAt(el, ...bandPoint(0.1)); // inside the first (largest) 75% slice
      expect(q(el, '.void-gauge-tooltip-name')!.textContent).toBe('big');
      expect(q(el, '.void-gauge-tooltip-value')!.textContent).toContain('75');
      expect(q(el, '.void-gauge-tooltip-pct')!.textContent).toBe('(75%)');
      await hoverAt(el, ...bandPoint(0.9));
      expect(q(el, '.void-gauge-tooltip-name')!.textContent).toBe('small');
      expect(q(el, '.void-gauge-tooltip-pct')!.textContent).toBe('(25%)');
    });

    it('follows manual ordering', async () => {
      const el = await mount<VoidGauge>(TAG, { data, segmentsSort: 'manual' });
      stubLayout(el);
      await hoverAt(el, ...bandPoint(0.1));
      expect(q(el, '.void-gauge-tooltip-name')!.textContent).toBe('small');
    });

    it('clears when the pointer is off the band (in the hole or outside)', async () => {
      const el = await mount<VoidGauge>(TAG, { data });
      stubLayout(el);
      await hoverAt(el, ...bandPoint(0.1));
      await hoverAt(el, 110, 110);
      expect(q(el, '.void-gauge-hover')).toBeNull();
      await hoverAt(el, ...bandPoint(0.1));
      await hoverAt(el, 2, 2);
      expect(q(el, '.void-gauge-hover')).toBeNull();
    });

    it('clears when the pointer is in the open gap of the arc', async () => {
      const el = await mount<VoidGauge>(TAG, { data });
      stubLayout(el);
      await hoverAt(el, ...bandPoint(0.1));
      await hoverAt(el, C, C + R); // straight down: inside the 90 degree opening of a triple gauge
      expect(q(el, '.void-gauge-hover')).toBeNull();
    });

    it('clears on mouseleave', async () => {
      const el = await mount<VoidGauge>(TAG, { data });
      stubLayout(el);
      await hoverAt(el, ...bandPoint(0.1));
      el.dispatchEvent(new MouseEvent('mouseleave'));
      await el.updateComplete;
      expect(q(el, '.void-gauge-hover')).toBeNull();
    });

    it('keeps the tooltip inside the viewBox', async () => {
      const el = await mount<VoidGauge>(TAG, { data });
      stubLayout(el);
      for (const f of [0.02, 0.5, 0.98]) {
        await hoverAt(el, ...bandPoint(f));
        const bg = q(el, '.void-gauge-tooltip-bg');
        if (!bg) continue;
        expect(num(bg, 'x')).toBeGreaterThanOrEqual(0);
        expect(num(bg, 'x') + num(bg, 'width')).toBeLessThanOrEqual(220);
        expect(num(bg, 'y')).toBeGreaterThanOrEqual(0);
      }
    });

    it('stops listening when disconnected and resumes on reconnect', async () => {
      const el = await mount<VoidGauge>(TAG, { data });
      stubLayout(el);
      el.remove();
      await hoverAt(el, ...bandPoint(0.1));
      expect(q(el, '.void-gauge-hover')).toBeNull();
      document.body.appendChild(el);
      await settle(el);
      stubLayout(el);
      await hoverAt(el, ...bandPoint(0.1));
      expect(q(el, '.void-gauge-hover')).not.toBeNull();
    });
  });

  describe('animation lifecycle', () => {
    it('starts in the "pre" phase showing zero', async () => {
      const el = document.createElement(TAG) as VoidGauge;
      el.value = 60;
      document.body.appendChild(el);
      await el.updateComplete;
      expect(q(el, 'svg')!.getAttribute('data-phase')).toBe('pre');
      expect(centerText(el)).toBe('0');
      expect(q(el, '.void-gauge-value')).toBeNull();
    });

    it('ends in the "idle" phase showing the value', async () => {
      const el = await mount<VoidGauge>(TAG, { value: 60 });
      expect(q(el, 'svg')!.getAttribute('data-phase')).toBe('idle');
      expect(centerText(el)).toBe('60');
    });

    it('counts up while animating, then settles on the value', async () => {
      const el = document.createElement(TAG) as VoidGauge;
      el.style.setProperty('--void-duration-chart-enter', '120');
      el.value = 100;
      document.body.appendChild(el);
      await el.updateComplete;
      await sleep(50);
      await el.updateComplete;
      expect(q(el, 'svg')!.getAttribute('data-phase')).toBe('animating');
      const mid = Number(centerText(el));
      expect(mid).toBeGreaterThan(0);
      expect(mid).toBeLessThan(100);
      await sleep(400);
      await el.updateComplete;
      expect(q(el, 'svg')!.getAttribute('data-phase')).toBe('idle');
      expect(centerText(el)).toBe('100');
    });

    it('animates segments from their previous size on data change, ending at the new layout', async () => {
      const el = await mount<VoidGauge>(TAG, { data: { segments: [{ name: 'a', value: 50 }, { name: 'b', value: 50 }] } });
      noAnimation(el);
      el.data = { segments: [{ name: 'a', value: 10 }, { name: 'b', value: 90 }] };
      await settle(el);
      expect(q(el, 'svg')!.getAttribute('data-phase')).toBe('idle');
      expect(qa(el, '.void-gauge-segment')).toHaveLength(2);
    });

    it('can be removed mid-animation without throwing', async () => {
      const el = document.createElement(TAG) as VoidGauge;
      el.style.setProperty('--void-duration-chart-enter', '200');
      el.value = 50;
      document.body.appendChild(el);
      await el.updateComplete;
      el.remove();
      await sleep(50);
      expect(el.isConnected).toBe(false);
    });
  });
});
