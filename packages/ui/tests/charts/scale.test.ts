// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { LinearScale, BandScale } from '../../src/components/charts/scale.js';

describe('LinearScale', () => {
  describe('scale()', () => {
    it('maps domain endpoints to range endpoints', () => {
      const s = new LinearScale([0, 100], [10, 210]);
      expect(s.scale(0)).toBe(10);
      expect(s.scale(100)).toBe(210);
    });

    it('interpolates linearly', () => {
      const s = new LinearScale([0, 100], [0, 200]);
      expect(s.scale(25)).toBe(50);
      expect(s.scale(50)).toBe(100);
    });

    it('supports an inverted range (SVG y axis)', () => {
      const s = new LinearScale([0, 10], [200, 0]);
      expect(s.scale(0)).toBe(200);
      expect(s.scale(10)).toBe(0);
      expect(s.scale(5)).toBe(100);
    });

    it('supports negative domains', () => {
      const s = new LinearScale([-50, 50], [0, 100]);
      expect(s.scale(-50)).toBe(0);
      expect(s.scale(0)).toBe(50);
      expect(s.scale(50)).toBe(100);
    });

    it('supports a domain that does not start at zero', () => {
      const s = new LinearScale([20, 40], [0, 100]);
      expect(s.scale(30)).toBe(50);
    });

    it('extrapolates (does not clamp) values outside the domain', () => {
      const s = new LinearScale([0, 100], [0, 200]);
      expect(s.scale(150)).toBe(300);
      expect(s.scale(-50)).toBe(-100);
    });

    it('returns the range midpoint for a zero-width domain', () => {
      const s = new LinearScale([5, 5], [0, 100]);
      expect(s.scale(5)).toBe(50);
      expect(s.scale(999)).toBe(50);
    });

    it('propagates NaN for NaN input', () => {
      expect(new LinearScale([0, 1], [0, 1]).scale(NaN)).toBeNaN();
    });

    it('reads domain/range lazily so they can be reassigned', () => {
      const s = new LinearScale([0, 1], [0, 1]);
      s.domain = [0, 10];
      s.range = [0, 100];
      expect(s.scale(5)).toBe(50);
    });
  });

  describe('ticks()', () => {
    it('produces nice round values spanning the domain', () => {
      expect(new LinearScale([0, 100], [0, 1]).ticks(5)).toEqual([0, 20, 40, 60, 80, 100]);
    });

    it('defaults to a target of 5 ticks', () => {
      expect(new LinearScale([0, 100], [0, 1]).ticks()).toEqual([0, 20, 40, 60, 80, 100]);
    });

    it('includes the upper bound when it lands on a step', () => {
      const t = new LinearScale([0, 10], [0, 1]).ticks(5);
      expect(t[0]).toBe(0);
      expect(t[t.length - 1]).toBe(10);
    });

    it('starts at the first multiple of the step at or above the domain minimum', () => {
      // span 94 -> raw 18.8 -> step 20
      expect(new LinearScale([3, 97], [0, 1]).ticks(5)).toEqual([20, 40, 60, 80]);
    });

    it('never emits ticks outside the domain', () => {
      const s = new LinearScale([3, 97], [0, 1]);
      for (const t of s.ticks(7)) {
        expect(t).toBeGreaterThanOrEqual(3);
        expect(t).toBeLessThanOrEqual(97);
      }
    });

    it('handles domains straddling zero and includes zero', () => {
      expect(new LinearScale([-50, 50], [0, 1]).ticks(5)).toEqual([-40, -20, 0, 20, 40]);
    });

    it('handles fractional domains with 1/2/5 steps', () => {
      const t = new LinearScale([0, 1], [0, 1]).ticks(5);
      expect(t).toHaveLength(6);
      t.forEach((v, i) => expect(v).toBeCloseTo(i * 0.2, 10));
    });

    it('uses a step of 2 times a power of ten when raw step is in (1, 2]', () => {
      const t = new LinearScale([0, 15], [0, 1]).ticks(10); // raw 1.5 -> 2
      expect(t).toEqual([0, 2, 4, 6, 8, 10, 12, 14]);
    });

    it('uses a step of 5 times a power of ten when raw step is in (2, 5]', () => {
      const t = new LinearScale([0, 30], [0, 1]).ticks(10); // raw 3 -> 5
      expect(t).toEqual([0, 5, 10, 15, 20, 25, 30]);
    });

    it('rounds a raw step in (5, 10] up to the next power of ten', () => {
      const t = new LinearScale([0, 70], [0, 1]).ticks(10); // raw 7 -> 10
      expect(t).toEqual([0, 10, 20, 30, 40, 50, 60, 70]);
    });

    it('scales to large domains', () => {
      expect(new LinearScale([0, 1_000_000], [0, 1]).ticks(5)).toEqual([
        0, 200_000, 400_000, 600_000, 800_000, 1_000_000,
      ]);
    });

    it('returns the single value for a zero-width domain', () => {
      expect(new LinearScale([7, 7], [0, 1]).ticks()).toEqual([7]);
    });

    it('returns an empty array rather than hanging for NaN domains', () => {
      expect(new LinearScale([NaN, NaN], [0, 1]).ticks()).toEqual([]);
      expect(new LinearScale([0, NaN], [0, 1]).ticks()).toEqual([]);
    });

    it('returns an empty array for infinite spans', () => {
      expect(new LinearScale([0, Infinity], [0, 1]).ticks()).toEqual([]);
    });

    it('returns ticks in ascending order', () => {
      const t = new LinearScale([0, 1234], [0, 1]).ticks(6);
      expect([...t].sort((a, b) => a - b)).toEqual(t);
    });
  });
});

describe('BandScale', () => {
  it('divides the range evenly into bands', () => {
    const s = new BandScale(4, [0, 400], 0.2);
    expect(s.step).toBe(100);
    expect(s.bandwidth).toBeCloseTo(80, 10);
  });

  it('positions bands with the padding split on both sides', () => {
    const s = new BandScale(4, [0, 400], 0.2);
    expect(s.scale(0)).toBeCloseTo(10, 10);
    expect(s.scale(1)).toBeCloseTo(110, 10);
    expect(s.scale(3)).toBeCloseTo(310, 10);
  });

  it('offsets all bands by the range start', () => {
    const s = new BandScale(2, [40, 440], 0.2);
    expect(s.step).toBe(200);
    expect(s.scale(0)).toBeCloseTo(40 + 20, 10);
    expect(s.scale(1)).toBeCloseTo(40 + 200 + 20, 10);
  });

  it('defaults padding to 0.2', () => {
    const s = new BandScale(1, [0, 100]);
    expect(s.padding).toBe(0.2);
    expect(s.bandwidth).toBeCloseTo(80, 10);
  });

  it('with zero padding bands fill the whole step', () => {
    const s = new BandScale(5, [0, 100], 0);
    expect(s.bandwidth).toBe(20);
    expect(s.scale(2)).toBe(40);
  });

  it('with full padding bands have zero width and sit mid-step', () => {
    const s = new BandScale(2, [0, 100], 1);
    expect(s.bandwidth).toBe(0);
    expect(s.scale(0)).toBe(25);
  });

  it('a single band is centred in the range', () => {
    const s = new BandScale(1, [0, 100], 0.2);
    expect(s.scale(0) + s.bandwidth / 2).toBeCloseTo(50, 10);
  });

  it('keeps every band inside the range', () => {
    const s = new BandScale(7, [40, 584], 0.3);
    for (let i = 0; i < 7; i++) {
      expect(s.scale(i)).toBeGreaterThanOrEqual(40);
      expect(s.scale(i) + s.bandwidth).toBeLessThanOrEqual(584 + 1e-9);
    }
  });

  it('does not produce NaN or Infinity for zero bands', () => {
    const s = new BandScale(0, [0, 100]);
    expect(Number.isFinite(s.step)).toBe(true);
    expect(Number.isFinite(s.bandwidth)).toBe(true);
    expect(Number.isFinite(s.scale(0))).toBe(true);
  });

  it('handles a zero-width range', () => {
    const s = new BandScale(3, [50, 50]);
    expect(s.step).toBe(0);
    expect(s.bandwidth).toBe(0);
    expect(s.scale(2)).toBe(50);
  });
});
