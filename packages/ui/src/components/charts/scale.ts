/** Maps a continuous numeric domain to a pixel range. */
export class LinearScale {
  constructor(
    public domain: [number, number],
    public range: [number, number],
  ) {}

  scale(value: number): number {
    const [d0, d1] = this.domain;
    const [r0, r1] = this.range;
    if (d1 === d0) return (r0 + r1) / 2;
    return r0 + ((value - d0) / (d1 - d0)) * (r1 - r0);
  }

  /** Generate "nice" round tick values that span the domain. */
  ticks(count = 5): number[] {
    const [d0, d1] = this.domain;
    const span = d1 - d0;
    if (span === 0) return [d0];
    const step = niceStep(span / count);
    const start = Math.ceil(d0 / step) * step;
    const result: number[] = [];
    for (let v = start; v <= d1 + step * 1e-9; v += step) result.push(v);
    return result;
  }
}

/** Maps categorical indices to evenly-spaced band positions. */
export class BandScale {
  bandwidth: number;
  step: number;
  private innerOffset: number;

  constructor(
    public count: number,
    public range: [number, number],
    public padding = 0.2,
  ) {
    const usable = range[1] - range[0];
    this.step = count > 0 ? usable / count : usable;
    this.bandwidth = this.step * (1 - padding);
    this.innerOffset = (this.step - this.bandwidth) / 2;
  }

  /** Left-edge x for the band at index. */
  scale(index: number): number {
    return this.range[0] + this.step * index + this.innerOffset;
  }
}

/** Pick a "nice" round step value. Returns one of {1, 2, 5} * 10^n. */
function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const exp = Math.floor(Math.log10(raw));
  const mag = Math.pow(10, exp);
  const frac = raw / mag;
  const niceFrac = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
  return niceFrac * mag;
}
