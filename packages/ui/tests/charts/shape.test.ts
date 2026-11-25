// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import {
  linePath,
  areaPath,
  smoothLinePath,
  smoothAreaPath,
  arcPath,
} from '../../src/components/charts/shape.js';

type Pt = [number, number];

/** Split a path string into commands with their numeric arguments. */
function commands(d: string): Array<{ cmd: string; nums: number[] }> {
  return (d.match(/[MLCAZ][^MLCAZ]*/g) ?? []).map((seg) => ({
    cmd: seg[0]!,
    nums: (seg.slice(1).match(/-?\d+(\.\d+)?(e-?\d+)?/g) ?? []).map(Number),
  }));
}

describe('linePath', () => {
  it('returns an empty string for no points', () => {
    expect(linePath([])).toBe('');
  });

  it('draws a single point as a lone moveto', () => {
    expect(linePath([[10, 20]])).toBe('M 10.00 20.00');
  });

  it('uses M for the first point and L for the rest', () => {
    expect(linePath([[0, 0], [10, 5], [20, 0]])).toBe('M 0.00 0.00 L 10.00 5.00 L 20.00 0.00');
  });

  it('rounds coordinates to two decimals', () => {
    expect(linePath([[1.23456, 2.34567]])).toBe('M 1.23 2.35');
  });

  it('keeps negative coordinates', () => {
    expect(linePath([[-5, -10], [5, 10]])).toBe('M -5.00 -10.00 L 5.00 10.00');
  });
});

describe('areaPath', () => {
  it('returns an empty string for no points', () => {
    expect(areaPath([], 100)).toBe('');
  });

  it('closes the polyline down to the baseline', () => {
    expect(areaPath([[0, 10], [10, 20]], 30)).toBe(
      'M 0.00 10.00 L 10.00 20.00 L 10.00 30.00 L 0.00 30.00 Z',
    );
  });

  it('works for a single point (zero-width area)', () => {
    expect(areaPath([[5, 10]], 50)).toBe('M 5.00 10.00 L 5.00 50.00 L 5.00 50.00 Z');
  });

  it('drops to the baseline at the x of the last and first points', () => {
    const cmds = commands(areaPath([[3, 1], [7, 2], [9, 3]], 40));
    const tail = cmds.slice(-3);
    expect(tail[0]).toEqual({ cmd: 'L', nums: [9, 40] });
    expect(tail[1]).toEqual({ cmd: 'L', nums: [3, 40] });
    expect(tail[2]!.cmd).toBe('Z');
  });
});

describe('smoothLinePath', () => {
  it('returns an empty string for no points', () => {
    expect(smoothLinePath([])).toBe('');
  });

  it('draws one point as a moveto only', () => {
    expect(smoothLinePath([[1, 2]])).toBe('M 1.00 2.00');
  });

  it('falls back to a straight line for two points', () => {
    const pts: Pt[] = [[0, 0], [10, 10]];
    expect(smoothLinePath(pts)).toBe(linePath(pts));
  });

  it('emits one cubic segment per interval, ending at each point', () => {
    const pts: Pt[] = [[0, 0], [10, 5], [20, 2], [30, 8]];
    const cmds = commands(smoothLinePath(pts));
    expect(cmds[0]).toEqual({ cmd: 'M', nums: [0, 0] });
    const cubics = cmds.slice(1);
    expect(cubics).toHaveLength(3);
    cubics.forEach((c, i) => {
      expect(c.cmd).toBe('C');
      expect(c.nums).toHaveLength(6);
      expect(c.nums.slice(4)).toEqual(pts[i + 1]);
    });
  });

  it('places control points at one third of each interval in x', () => {
    const cmds = commands(smoothLinePath([[0, 0], [30, 30], [60, 0]]));
    const first = cmds[1]!.nums;
    expect(first[0]).toBe(10);
    expect(first[2]).toBe(20);
  });

  it('is monotone: control points never leave the y-range of their segment', () => {
    const pts: Pt[] = [[0, 100], [10, 90], [20, 20], [30, 15], [40, 14], [50, 0]];
    const cmds = commands(smoothLinePath(pts)).slice(1);
    cmds.forEach((c, i) => {
      const lo = Math.min(pts[i]![1], pts[i + 1]![1]) - 1e-9;
      const hi = Math.max(pts[i]![1], pts[i + 1]![1]) + 1e-9;
      expect(c.nums[1]!).toBeGreaterThanOrEqual(lo);
      expect(c.nums[1]!).toBeLessThanOrEqual(hi);
      expect(c.nums[3]!).toBeGreaterThanOrEqual(lo);
      expect(c.nums[3]!).toBeLessThanOrEqual(hi);
    });
  });

  it('does not overshoot at a local extremum (flat tangent)', () => {
    const cmds = commands(smoothLinePath([[0, 10], [10, 0], [20, 10]])).slice(1);
    // Middle point is a local minimum: control points adjacent to it share its y.
    expect(cmds[0]!.nums[3]).toBe(0);
    expect(cmds[1]!.nums[1]).toBe(0);
  });

  it('keeps flat runs flat', () => {
    const cmds = commands(smoothLinePath([[0, 5], [10, 5], [20, 5], [30, 5]])).slice(1);
    for (const c of cmds) {
      expect(c.nums[1]).toBe(5);
      expect(c.nums[3]).toBe(5);
    }
  });

  it('does not emit NaN for coincident x values', () => {
    const d = smoothLinePath([[0, 0], [10, 10], [10, 20], [20, 30]]);
    expect(d).not.toContain('NaN');
    expect(d).not.toContain('Infinity');
  });

  it('does not emit NaN for steep monotone data (tangent limiting)', () => {
    const d = smoothLinePath([[0, 0], [1, 1000], [2, 1001], [3, 3000]]);
    expect(d).not.toContain('NaN');
  });
});

describe('smoothAreaPath', () => {
  it('returns an empty string for no points', () => {
    expect(smoothAreaPath([], 10)).toBe('');
  });

  it('starts with the smooth line and closes down to the baseline', () => {
    const pts: Pt[] = [[0, 0], [10, 5], [20, 2]];
    const d = smoothAreaPath(pts, 50);
    expect(d.startsWith(smoothLinePath(pts))).toBe(true);
    expect(d.endsWith('L 20.00 50.00 L 0.00 50.00 Z')).toBe(true);
  });

  it('works for a single point', () => {
    expect(smoothAreaPath([[5, 5]], 9)).toBe('M 5.00 5.00 L 5.00 9.00 L 5.00 9.00 Z');
  });
});

describe('arcPath', () => {
  const cx = 100, cy = 100, R = 50;

  describe('pie wedge (no inner radius)', () => {
    it('draws a quarter wedge from centre to arc and back', () => {
      expect(arcPath(cx, cy, R, 0, Math.PI / 2)).toBe(
        'M 100 100 L 150.00 100.00 A 50 50 0 0 1 100.00 150.00 Z',
      );
    });

    it('treats a non-positive inner radius as a pie', () => {
      expect(arcPath(cx, cy, R, 0, 1, -5)).toBe(arcPath(cx, cy, R, 0, 1, 0));
    });

    it('sets the large-arc flag only when the sweep exceeds half a turn', () => {
      expect(commands(arcPath(cx, cy, R, 0, Math.PI - 0.01))[2]!.nums[3]).toBe(0);
      expect(commands(arcPath(cx, cy, R, 0, Math.PI))[2]!.nums[3]).toBe(0);
      expect(commands(arcPath(cx, cy, R, 0, Math.PI + 0.01))[2]!.nums[3]).toBe(1);
    });
  });

  describe('donut wedge (inner radius)', () => {
    it('draws outer arc, radial line, inner arc backwards, close', () => {
      expect(arcPath(cx, cy, R, 0, Math.PI / 2, 25)).toBe(
        'M 150.00 100.00 A 50 50 0 0 1 100.00 150.00 L 100.00 125.00 A 25 25 0 0 0 125.00 100.00 Z',
      );
    });

    it('goes backwards on the inner arc (sweep flag 0)', () => {
      const cmds = commands(arcPath(cx, cy, R, 0, 1, 20));
      expect(cmds[1]!.nums[4]).toBe(1);
      expect(cmds[3]!.nums[4]).toBe(0);
    });

    it('uses the large-arc flag on both arcs for sweeps over 180 degrees', () => {
      const cmds = commands(arcPath(cx, cy, R, 0, (3 * Math.PI) / 2, 20));
      expect(cmds[1]!.nums[3]).toBe(1);
      expect(cmds[3]!.nums[3]).toBe(1);
    });

    it('points lie on the outer and inner circles', () => {
      const cmds = commands(arcPath(cx, cy, R, 0.3, 2.1, 30));
      const dist = (x: number, y: number) => Math.hypot(x - cx, y - cy);
      expect(dist(cmds[0]!.nums[0]!, cmds[0]!.nums[1]!)).toBeCloseTo(R, 1);
      expect(dist(cmds[1]!.nums[5]!, cmds[1]!.nums[6]!)).toBeCloseTo(R, 1);
      expect(dist(cmds[2]!.nums[0]!, cmds[2]!.nums[1]!)).toBeCloseTo(30, 1);
      expect(dist(cmds[3]!.nums[5]!, cmds[3]!.nums[6]!)).toBeCloseTo(30, 1);
    });
  });

  it('offsets by the centre', () => {
    const a = commands(arcPath(0, 0, 10, 0, 1));
    const b = commands(arcPath(5, 7, 10, 0, 1));
    expect(b[1]!.nums[0]! - a[1]!.nums[0]!).toBeCloseTo(5, 5);
    expect(b[1]!.nums[1]! - a[1]!.nums[1]!).toBeCloseTo(7, 5);
  });

  it('a zero-sweep arc collapses to coincident endpoints', () => {
    const cmds = commands(arcPath(cx, cy, R, 1, 1, 20));
    expect(cmds[0]!.nums).toEqual(cmds[1]!.nums.slice(5));
  });

  it('renders a full-circle sweep as a visible arc (start != end)', () => {
    const cmds = commands(arcPath(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI, 30));
    const start = cmds[0]!.nums;
    const end = cmds[1]!.nums.slice(5);
    expect(`${start[0]},${start[1]}`).not.toBe(`${end[0]},${end[1]}`);
  });
});
