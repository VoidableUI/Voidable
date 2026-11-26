import { html, svg, nothing } from 'lit';
import { VoidElement } from '../base.js';
import { property, state } from 'lit/decorators.js';

export interface GaugeZone {
  from: number;
  to: number;
  color: string;
}

export interface GaugeSegment {
  name: string;
  value: number;
  color?: string;
}

export interface GaugeData {
  value?: number;
  segments?: GaugeSegment[];
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function formatValue(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
  return Math.round(v).toString();
}

/** Stroke-based arc path — browser renders as a centered stroke of the given width. */
function gaugeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const sweep = endAngle - startAngle;
  // Clamp to just under 2π for full circles so the arc renders
  const clampedEnd = Math.abs(sweep) >= 2 * Math.PI
    ? startAngle + Math.sign(sweep) * (2 * Math.PI - 0.0001)
    : endAngle;
  const x0 = cx + r * Math.cos(startAngle);
  const y0 = cy + r * Math.sin(startAngle);
  const x1 = cx + r * Math.cos(clampedEnd);
  const y1 = cy + r * Math.sin(clampedEnd);
  const largeArc = Math.abs(clampedEnd - startAngle) > Math.PI ? 1 : 0;
  const sweepDir = (clampedEnd - startAngle) >= 0 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${largeArc} ${sweepDir} ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/** Closed-band arc path with semicircular leading/trailing caps — a
    pill-shaped ring slice. Used for the outline variant so SVG fill
    renders the faint tint AND stroke renders a hairline border that
    follows the rounded contour. The end-caps replace what would be
    straight radial lines, giving the band the same rounded leading/
    trailing edges as a stroke-linecap:round centerline arc. */
function gaugeBand(
  cx: number,
  cy: number,
  r: number,
  thickness: number,
  startAngle: number,
  endAngle: number,
): string {
  const outerR = r + thickness / 2;
  const innerR = Math.max(0, r - thickness / 2);
  const capR = thickness / 2;
  const sweep = endAngle - startAngle;
  const clampedEnd = Math.abs(sweep) >= 2 * Math.PI
    ? startAngle + Math.sign(sweep) * (2 * Math.PI - 0.0001)
    : endAngle;
  const x0o = cx + outerR * Math.cos(startAngle);
  const y0o = cy + outerR * Math.sin(startAngle);
  const x1o = cx + outerR * Math.cos(clampedEnd);
  const y1o = cy + outerR * Math.sin(clampedEnd);
  const x0i = cx + innerR * Math.cos(startAngle);
  const y0i = cy + innerR * Math.sin(startAngle);
  const x1i = cx + innerR * Math.cos(clampedEnd);
  const y1i = cy + innerR * Math.sin(clampedEnd);
  const largeArc = Math.abs(clampedEnd - startAngle) > Math.PI ? 1 : 0;
  // End-cap uses sweep-flag=1 to bulge OUTWARD past clampedEnd in the
  // tangent direction; start-cap uses sweep-flag=1 too, but the arc goes
  // from inner-start to outer-start, so the same flag bulges outward
  // OPPOSITE the tangent — extending past startAngle in the direction
  // the gauge "came from" rather than where it's heading.
  return `M ${x0o.toFixed(2)} ${y0o.toFixed(2)} `
       + `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x1o.toFixed(2)} ${y1o.toFixed(2)} `
       + `A ${capR} ${capR} 0 0 1 ${x1i.toFixed(2)} ${y1i.toFixed(2)} `
       + `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x0i.toFixed(2)} ${y0i.toFixed(2)} `
       + `A ${capR} ${capR} 0 0 1 ${x0o.toFixed(2)} ${y0o.toFixed(2)} `
       + `Z`;
}

/** Closed-band path with per-end configurable cap modes. Used for
    outline-variant zones so each end can express:
    - 'butt'  — straight radial line (zone-to-zone boundary)
    - 'round' — convex half-disk bulging outward past the band end
                (matches the gauge's overall rounded leading/trailing
                edges at min/max)
    - 'cup'   — concave half-disk carved INTO the band's interior, so a
                value's outward-bulging cap nests against the zone's
                inverse curve without overlap (puzzle-piece fit). Only
                valid at the leading edge — there's no symmetric
                "carve from the value side" case at the trailing end.

    Closed bands are required (instead of stroked arcs) because the
    cup geometry is a SUBTRACTION from the band's area; strokes paint
    along centerlines and can't carve out negative space. */
function gaugeZoneBand(
  cx: number,
  cy: number,
  r: number,
  thickness: number,
  startAngle: number,
  endAngle: number,
  leadingCap: 'butt' | 'cup' | 'round',
  trailingCap: 'butt' | 'round',
): string {
  const outerR = r + thickness / 2;
  const innerR = Math.max(0, r - thickness / 2);
  const capR = thickness / 2;
  const sweep = endAngle - startAngle;
  const clampedEnd = Math.abs(sweep) >= 2 * Math.PI
    ? startAngle + Math.sign(sweep) * (2 * Math.PI - 0.0001)
    : endAngle;
  const x0o = cx + outerR * Math.cos(startAngle);
  const y0o = cy + outerR * Math.sin(startAngle);
  const x1o = cx + outerR * Math.cos(clampedEnd);
  const y1o = cy + outerR * Math.sin(clampedEnd);
  const x0i = cx + innerR * Math.cos(startAngle);
  const y0i = cy + innerR * Math.sin(startAngle);
  const x1i = cx + innerR * Math.cos(clampedEnd);
  const y1i = cy + innerR * Math.sin(clampedEnd);
  const largeArc = Math.abs(clampedEnd - startAngle) > Math.PI ? 1 : 0;

  let path = `M ${x0o.toFixed(2)} ${y0o.toFixed(2)} `;
  // Outer arc: outer-leading → outer-trailing.
  path += `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x1o.toFixed(2)} ${y1o.toFixed(2)} `;
  // Trailing cap.
  if (trailingCap === 'round') {
    // Sweep=1: bulges past clampedEnd in +tangent direction.
    path += `A ${capR} ${capR} 0 0 1 ${x1i.toFixed(2)} ${y1i.toFixed(2)} `;
  } else {
    path += `L ${x1i.toFixed(2)} ${y1i.toFixed(2)} `;
  }
  // Inner arc: inner-trailing → inner-leading.
  path += `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x0i.toFixed(2)} ${y0i.toFixed(2)} `;
  // Leading cap.
  if (leadingCap === 'round') {
    // Sweep=1 going inner→outer at startAngle bulges in -tangent
    // direction (extends past startAngle in the direction the gauge
    // "came from"). Same arc as gaugeBand's leading cap.
    path += `A ${capR} ${capR} 0 0 1 ${x0o.toFixed(2)} ${y0o.toFixed(2)} `;
  } else if (leadingCap === 'cup') {
    // Sweep=0 going inner→outer at startAngle bulges in +tangent
    // direction (into the band's interior). The path's interior is
    // on the opposite side of the arc, so this carves a half-disk-
    // shaped negative space out of the leading edge — exactly the
    // complement of a value cap bulging +tangent FROM the same
    // diameter line.
    path += `A ${capR} ${capR} 0 0 0 ${x0o.toFixed(2)} ${y0o.toFixed(2)} `;
  } else {
    path += `L ${x0o.toFixed(2)} ${y0o.toFixed(2)} `;
  }
  path += `Z`;
  return path;
}

/** Wireframe variant stroke widths. The value/track/segment paths are
    overridden by CSS to 1.5px (the "value line" width). Zones default
    to 5× that — wide enough to read as a colored threshold backdrop,
    but proportionate to the wireframe aesthetic instead of dominating
    it. The relationship is expressed multiplicatively so tuning the
    line stroke (here or in the matching CSS rule) keeps the zone in
    proportion. Cap radii in _renderZones derive from the zone stroke
    so the half-disk endpoint caps stay flush with the band width. */
const WIREFRAME_LINE_STROKE = 1.5;
const WIREFRAME_ZONE_STROKE = WIREFRAME_LINE_STROKE * 5;

function arcAngles(circular: 'full' | 'semi' | 'triple'): {
  startAngle: number;
  endAngle: number;
  totalSweep: number;
} {
  const PI = Math.PI;
  if (circular === 'full') {
    return { startAngle: -PI / 2, endAngle: -PI / 2 + 2 * PI, totalSweep: 2 * PI };
  }
  if (circular === 'semi') {
    // left → over top → right (gap at bottom)
    return { startAngle: -PI, endAngle: 0, totalSweep: PI };
  }
  // triple: 270° sweep, gap at bottom-ish
  return { startAngle: (3 * PI) / 4, endAngle: (PI) / 4 + 2 * PI, totalSweep: (3 * PI) / 2 };
}

/**
 * Radial gauge for a single value within a range (capacity, score, load) or for a few segments that share
 * it, drawn in SVG as a full, semi or three-quarter arc with optional tick marks and colour zones. Set
 * `value` between `min` and `max`, or give it `data.segments`; it has no children. The gauge is an image to
 * assistive technology, so set `aria-label` and state the figure in the surrounding text.
 */
export class VoidGauge extends VoidElement {

  /**
   * Text shown with the value, such as `%` or `MB/s`. Centered under the number, or right after it with
   * `unit-inline`.
   */
  @property() unit = '';
  /**
   * The reading, between `min` and `max`, for a single-value gauge. For a gauge split into segments set
   * `data.segments` instead.
   */
  @property({ type: Number, reflect: true }) value = 0;
  /** Value at the start of the arc. Defaults to 0. */
  @property({ type: Number }) min = 0;
  /** Value at the end of the arc. Defaults to 100. */
  @property({ type: Number }) max = 100;
  /** Width of the gauge in pixels. Defaults to 220; the height follows from `circular`. */
  @property({ type: Number, reflect: true }) size = 220;
  /** Width of the arc stroke in pixels. Defaults to 14. */
  @property({ type: Number }) thickness = 14;
  /** How much of a circle the arc covers: `triple` (270 degrees, default), `semi` (180) or `full` (360). */
  @property({ reflect: true }) circular: 'full' | 'semi' | 'triple' = 'triple';
  /**
   * How the arc is drawn: `filled` (default, solid), `outline` (tinted with a border) or `wireframe`
   * (thin lines only).
   */
  @property({ reflect: true }) variant: 'filled' | 'outline' | 'wireframe' = 'filled';
  /** Leave the reading out of the centre (it is printed by default). */
  @property({ type: Boolean, attribute: 'hide-value', reflect: true }) hideValue = false;
  /** When true, render the unit right next to the value (e.g. "75%").
      When false (default), render it on the line below. Short units like
      % or ° look better inline; longer multi-char units often look
      better stacked. */
  @property({ type: Boolean, attribute: 'unit-inline', reflect: true }) unitInline = false;
  /** Major tick interval in value units. 0 disables major ticks. Ticks are
      placed at every multiple of this value within (min, max], drawn as
      thicker, longer outward marks. Speedometer-style layout: pair with
      `tick-minor` for a major-grade-with-subdivisions look. */
  @property({ type: Number, attribute: 'tick-major' }) tickMajor: number = 0;
  /** Minor tick interval in value units. 0 disables minor ticks. Positions
      that are also major-tick positions are rendered as majors, not minors.
      For example, max=100 / tick-major=25 / tick-minor=5 yields 4 major
      ticks (25, 50, 75, 100) and 16 minor ticks (everything else divisible
      by 5 within the range). */
  @property({ type: Number, attribute: 'tick-minor' }) tickMinor: number = 0;
  /** When true (default), force a major tick at `min` (the gauge start
      position). Independent of `tick-major` — useful when min isn't a
      multiple of the major interval but you still want an endpoint
      marker. Add `hide-tick-min` to leave it out. */
  @property({ type: Boolean, attribute: 'hide-tick-min', reflect: true }) hideTickMin = false;
  /** When true (default), force a major tick at `max` (the gauge end
      position). Useful when max doesn't naturally fall on a major-interval
      boundary (e.g. max=100 with tick-major=30) but you still want the
      endpoint marked. If max naturally falls on a step, this upgrades the
      classification to major. Add `hide-tick-max` to leave it out. */
  @property({ type: Boolean, attribute: 'hide-tick-max', reflect: true }) hideTickMax = false;
  /**
   * Order of segments around the arc: `value` (default, largest first) or `manual` (the order of
   * `data.segments`).
   */
  @property({ attribute: 'segments-sort' }) segmentsSort: 'value' | 'manual' = 'value';
  /** Visible gap between segments. `false`/`0` = seamless. `true` = 1% of the
      filled arc consumed by gaps. Number = explicit percent. Higher % = clearer
      segmentation but more arc sacrificed; the precision-vs-clarity tradeoff. */
  @property({
    converter: {
      fromAttribute(v: string | null) {
        if (v === null || v === '' || v === 'true') return true;
        if (v === 'false') return false;
        const n = Number(v);
        return isNaN(n) ? true : n;
      },
      toAttribute(v: boolean | number) {
        return v === true ? '' : v === false ? 'false' : String(v);
      },
    },
  }) gaps: boolean | number = false;
  /**
   * Accessible name of the gauge, such as `Disk usage`. The gauge is an image to assistive technology,
   * so set it and put the figure in the text around it.
   */
  @property({ attribute: 'aria-label' }) ariaLabel = '';

  /** Colour bands over the value range. Assign an array of `{ from, to, color }`;
      the fill takes the colour of the zone containing the value. Property only. */
  @property({ attribute: false }) zones: GaugeZone[] = [];

  private _data: GaugeData = {};

  /**
   * Segmented data: `{ segments: [{ name, value, color? }] }` splits the arc between named parts; the
   * optional `value` is the headline reading. Property only: assign a new object to update the gauge and
   * animate to it. For a single reading, set the `value` attribute instead.
   */
  get data(): GaugeData { return this._data; }
  set data(next: GaugeData) {
    const prevData = this._data;
    const prevDisplayValue = this._displayValue;
    const prevDisplaySegments = new Map(this._displaySegments);
    this._data = next;
    this._refreshTargets();
    this.requestUpdate();
    this.updateComplete.then(() => {
      const prevSegs = prevData.segments ?? [];
      const fromSegs = new Map<number, number>();
      for (let i = 0; i < prevSegs.length; i++) {
        fromSegs.set(i, prevDisplaySegments.get(i) ?? 0);
      }
      const nextSegs = next.segments ?? [];
      for (let i = 0; i < nextSegs.length; i++) {
        if (!fromSegs.has(i)) fromSegs.set(i, 0);
      }
      this._startAnimation(fromSegs, prevDisplayValue, true);
    });
  }

  @state() private _phase: 'pre' | 'animating' | 'idle' = 'pre';
  @state() private _hoverSegment: number | null = null;
  @state() private _hoverX: number = 0;
  @state() private _hoverY: number = 0;
  private _displayValue = 0;
  private _displayValueFrom = 0;
  private _targetValue = 0;
  private _displaySegments = new Map<number, number>();
  private _segmentsFrom = new Map<number, number>();
  private _targetSegments = new Map<number, number>();
  private _animStart = 0;
  private _animDuration = 0;
  private _rafHandle = 0;
  private _hasAnimated = false;

  protected willUpdate(changed: Map<PropertyKey, unknown>) {
    super.willUpdate?.(changed as never);
    if (changed.has('value') || changed.has('min') || changed.has('max')) {
      this._refreshTargets();
      // After the entry animation has run, animate from the displayed value
      // to the new target instead of leaving the old value on screen.
      if (this._hasAnimated && this.isConnected) {
        this._startAnimation(new Map(this._displaySegments), this._displayValue, true);
      }
    }
  }

  private _refreshTargets() {
    const segs = this._data.segments ?? [];
    this._targetSegments.clear();
    for (let i = 0; i < segs.length; i++) {
      this._targetSegments.set(i, segs[i]!.value);
    }
    this._targetValue = this._resolveTotal();
  }

  private _resolveTotal(): number {
    if (this._data.value !== undefined) return this._data.value;
    const segs = this._data.segments;
    if (segs && segs.length > 0) return segs.reduce((s, x) => s + x.value, 0);
    return this.value;
  }

  connectedCallback() {
    super.connectedCallback();
    this.setHostAttribute('role', 'img');
    this._refreshTargets();
    requestAnimationFrame(() => {
      const fromSegs = new Map<number, number>();
      const segs = this._data.segments ?? [];
      for (let i = 0; i < segs.length; i++) fromSegs.set(i, 0);
      this._startAnimation(fromSegs, 0, false);
    });
    this.addEventListener('mousemove', this._onMouseMove);
    this.addEventListener('mouseleave', this._onMouseLeave);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    cancelAnimationFrame(this._rafHandle);
    this.removeEventListener('mousemove', this._onMouseMove);
    this.removeEventListener('mouseleave', this._onMouseLeave);
  }

  private _onMouseMove = (e: MouseEvent) => {
    const svg = this.querySelector('svg');
    if (!svg) return;
    const segments = this._data.segments;
    if (!segments || segments.length === 0) {
      if (this._hoverSegment !== null) this._hoverSegment = null;
      return;
    }
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0) return;
    const vbHeight = this._viewBoxHeight();
    const mx = ((e.clientX - rect.left) / rect.width) * this.size;
    const my = ((e.clientY - rect.top) / rect.height) * vbHeight;
    const cx = this.size / 2;
    const cy = this.size / 2;
    const dx = mx - cx;
    const dy = my - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const r = this.size / 2 - Math.max(8, this.thickness / 2);
    const halfThick = this.thickness / 2;
    if (dist < r - halfThick || dist > r + halfThick) {
      if (this._hoverSegment !== null) this._hoverSegment = null;
      return;
    }
    const { startAngle, totalSweep } = arcAngles(this.circular);
    const endAngle = startAngle + totalSweep;
    let angle = Math.atan2(dy, dx);
    // Normalize so angle falls within [startAngle, endAngle] when possible
    while (angle < startAngle) angle += 2 * Math.PI;
    while (angle > startAngle + 2 * Math.PI) angle -= 2 * Math.PI;
    if (angle > endAngle) {
      if (this._hoverSegment !== null) this._hoverSegment = null;
      return;
    }
    // Constrain to the filled portion
    const ratio = (this.max - this.min === 0) ? 0
      : (this._displayValue - this.min) / (this.max - this.min);
    const fillEndAngle = startAngle + Math.max(0, Math.min(1, ratio)) * totalSweep;
    if (angle > fillEndAngle) {
      if (this._hoverSegment !== null) this._hoverSegment = null;
      return;
    }
    const sorted = this.segmentsSort === 'value'
      ? [...segments].sort((a, b) => b.value - a.value)
      : segments;
    const displayedTotal = [...this._displaySegments.values()].reduce((s, v) => s + v, 0)
      || this._displayValue || 1;
    const filledSweep = fillEndAngle - startAngle;
    let cum = startAngle;
    for (let i = 0; i < sorted.length; i++) {
      const seg = sorted[i]!;
      const origIdx = segments.indexOf(seg);
      const display = this._displaySegments.get(origIdx) ?? 0;
      const segSweep = (display / displayedTotal) * filledSweep;
      if (angle >= cum && angle < cum + segSweep) {
        if (this._hoverSegment !== origIdx) this._hoverSegment = origIdx;
        this._hoverX = mx;
        this._hoverY = my;
        return;
      }
      cum += segSweep;
    }
    if (this._hoverSegment !== null) this._hoverSegment = null;
  };

  private _onMouseLeave = () => {
    this._hoverSegment = null;
  };

  private _startAnimation(
    fromSegs: Map<number, number>,
    fromValue: number,
    isUpdate: boolean,
  ) {
    cancelAnimationFrame(this._rafHandle);
    const cs = getComputedStyle(this);
    const scaleStr = cs.getPropertyValue('--void-anim-scale').trim();
    const scale = scaleStr === '' ? 1 : parseFloat(scaleStr);
    const baseDur = parseFloat(cs.getPropertyValue('--void-duration-chart-enter')) || 700;
    this._animDuration = baseDur * scale;

    this._segmentsFrom = fromSegs;
    this._displayValueFrom = isUpdate ? fromValue : 0;
    this._animStart = performance.now();
    this._hasAnimated = true;

    if (this._animDuration <= 0) {
      this._displayValue = this._targetValue;
      this._displaySegments = new Map(this._targetSegments);
      this._phase = 'idle';
      this.requestUpdate();
      return;
    }

    this._phase = 'animating';
    this._rafHandle = requestAnimationFrame(this._tick);
  }

  private _tick = (now: number) => {
    const elapsed = now - this._animStart;
    const t = Math.min(elapsed / this._animDuration, 1);
    const e = easeOutCubic(t);

    this._displayValue = this._displayValueFrom + (this._targetValue - this._displayValueFrom) * e;

    for (const [i, target] of this._targetSegments) {
      const from = this._segmentsFrom.get(i) ?? 0;
      this._displaySegments.set(i, from + (target - from) * e);
    }

    this.requestUpdate();

    if (t < 1) {
      this._rafHandle = requestAnimationFrame(this._tick);
    } else {
      this._phase = 'idle';
    }
  };

  private _viewBoxHeight(): number {
    if (this.circular === 'semi') return this.size * 0.6;
    if (this.circular === 'triple') return this.size * 0.85;
    return this.size;
  }

  private _angleAt(v: number): number {
    const { startAngle, totalSweep } = arcAngles(this.circular);
    const clamped = Math.max(this.min, Math.min(this.max, v));
    const ratio = this.max - this.min === 0 ? 0 : (clamped - this.min) / (this.max - this.min);
    return startAngle + ratio * totalSweep;
  }

  private _resolveFillColor(): string {
    if (this.zones.length === 0) return 'var(--void-color-accent)';
    const v = this._resolveTotal();
    for (const zone of this.zones) {
      if (v >= zone.from && v <= zone.to) return zone.color;
    }
    // below the first zone: use the zone that starts lowest
    const lowest = this.zones.reduce((a, b) => (b.from < a.from ? b : a));
    if (v < lowest.from) return lowest.color;
    // fallback to last zone if over max
    return this.zones[this.zones.length - 1]!.color;
  }

  private _hasSegments(): boolean {
    return (this._data.segments?.length ?? 0) > 0;
  }

  private _renderZones(
    cx: number,
    cy: number,
    r: number,
    fillEndAngle: number,
  ): unknown {
    if (this.zones.length === 0 || this._hasSegments()) return nothing;

    // Outline variant: render zones as closed bands with per-end cap
    // modes baked in. The zone whose leading edge meets the value gets
    // a CONCAVE cup that mirrors the value's convex trailing cap —
    // their half-disk perimeters coincide, so the two shapes nest as
    // puzzle pieces with no overlap. End-of-gauge round caps (zone
    // reaches min or max) are baked into the band too, so no separate
    // half-disk cap paths are needed for outline.
    if (this.variant === 'outline') {
      const startAngle = this._angleAt(this.min);
      const hasFill = fillEndAngle > startAngle + 1e-6;
      const bands: unknown[] = [];

      for (let i = 0; i < this.zones.length; i++) {
        const z = this.zones[i]!;
        const zoneStart = this._angleAt(z.from);
        const zoneEnd = this._angleAt(z.to);
        if (zoneEnd <= fillEndAngle + 1e-6) continue;

        // A zone's leading edge meets the value when its natural start
        // is at or before fillEndAngle. The rendered leading edge then
        // sits exactly at fillEndAngle, where the value's trailing cap
        // also sits — perfect for a cup. If the zone is entirely past
        // fillEndAngle (gap between value end and zone start), no cup
        // is needed because the two shapes don't share a boundary.
        const meetsValue = zoneStart <= fillEndAngle + 1e-6;
        const renderStart = meetsValue ? fillEndAngle : zoneStart;

        let leadingCap: 'butt' | 'cup' | 'round' = 'butt';
        if (meetsValue && hasFill) {
          leadingCap = 'cup';
        } else if (Math.abs(z.from - this.min) < 1e-6) {
          // Zone reaches gauge start AND value isn't covering it —
          // give the band a rounded outward cap so the gauge's start
          // edge is still rounded.
          leadingCap = 'round';
        }

        const isLast = i === this.zones.length - 1;
        const trailingCap: 'butt' | 'round' =
          (isLast && Math.abs(z.to - this.max) < 1e-6) ? 'round' : 'butt';

        bands.push(svg`
          <path
            class="void-gauge-zone"
            style="--zone-color: ${z.color};"
            d=${gaugeZoneBand(cx, cy, r, this.thickness, renderStart, zoneEnd, leadingCap, trailingCap)}
          ></path>
        `);
      }

      return svg`<g class="void-gauge-zones">${bands}</g>`;
    }

    // Filled and wireframe variants: stroked centerline arcs + separate
    // half-disk caps at gauge extremes. Filled value strokes cover any
    // zone underneath cleanly (no bleed-through), and wireframe value
    // lines are too thin to need cup geometry — so no clipping. The
    // only variant-specific knob is zone thickness: filled uses the
    // full band width, wireframe uses 5× the line stroke (proportionate
    // to its thin-line aesthetic).
    const zoneThickness = this.variant === 'wireframe'
      ? WIREFRAME_ZONE_STROKE
      : this.thickness;
    const bands: unknown[] = [];
    for (const z of this.zones) {
      bands.push(svg`
        <path
          class="void-gauge-zone"
          style="--zone-color: ${z.color}; --gauge-stroke-width: ${zoneThickness};"
          d=${gaugeArc(cx, cy, r, this._angleAt(z.from), this._angleAt(z.to))}
        ></path>
      `);
    }

    const capR = zoneThickness / 2;
    const halfDisk = (angle: number, sweep: 0 | 1) => {
      const cos = Math.cos(angle), sin = Math.sin(angle);
      const ix = (cx + (r - capR) * cos).toFixed(2);
      const iy = (cy + (r - capR) * sin).toFixed(2);
      const ox = (cx + (r + capR) * cos).toFixed(2);
      const oy = (cy + (r + capR) * sin).toFixed(2);
      return `M ${ix} ${iy} A ${capR} ${capR} 0 0 ${sweep} ${ox} ${oy} Z`;
    };
    const caps: unknown[] = [];
    const first = this.zones[0];
    if (first && Math.abs(first.from - this.min) < 1e-6) {
      caps.push(svg`<path class="void-gauge-zone-cap" d=${halfDisk(this._angleAt(first.from), 1)} style="--zone-color: ${first.color};"></path>`);
    }
    const last = this.zones[this.zones.length - 1];
    if (last && Math.abs(last.to - this.max) < 1e-6) {
      caps.push(svg`<path class="void-gauge-zone-cap" d=${halfDisk(this._angleAt(last.to), 0)} style="--zone-color: ${last.color};"></path>`);
    }

    return svg`<g class="void-gauge-zones">${bands}${caps}</g>`;
  }

  private _renderSegments(
    cx: number,
    cy: number,
    r: number,
    startAngle: number,
    displayedTotal: number,
    fillEndAngle: number,
  ) {
    if (!this._hasSegments()) return nothing;
    const segs = this._data.segments!;
    const sorted = this.segmentsSort === 'value'
      ? [...segs].sort((a, b) => b.value - a.value)
      : segs;

    // Gaps are consumed BETWEEN adjacent segments only — never at the
    // leading or trailing edge of the fill. With N segments there are
    // N-1 interior boundaries; each boundary takes gapPerBoundary of
    // angular space (half from each adjacent segment).
    const filledSweep = fillEndAngle - startAngle;
    const gapPercent = this.gaps === true ? 1
                     : this.gaps === false ? 0
                     : this.gaps;
    const gapTotal = (gapPercent / 100) * filledSweep;
    const N = sorted.length;
    const gapPerBoundary = N > 1 ? gapTotal / (N - 1) : 0;
    const padHalf = gapPerBoundary / 2;

    const results = [];
    let cumAngle = startAngle;
    // Track the visible leading/trailing arc positions + colors so we can
    // add round-cap circles at the outermost ends.
    let firstColor: string | null = null;
    let firstStart: number | null = null;
    let lastColor: string | null = null;
    let lastEnd: number | null = null;

    for (let i = 0; i < sorted.length; i++) {
      const seg = sorted[i]!;
      const origIdx = segs.indexOf(seg);
      const displayVal = this._displaySegments.get(origIdx) ?? 0;
      if (displayVal <= 0 || displayedTotal <= 0) { cumAngle += 0; continue; }

      const segSweep = (displayVal / displayedTotal) * filledSweep;
      const segEnd = Math.min(cumAngle + segSweep, fillEndAngle);
      // Pad only at INTERIOR boundaries — leave the very first segment's
      // start and the very last segment's end un-padded so there's no gap
      // at the leading/trailing edge of the fill.
      const startPadded = i > 0 ? cumAngle + padHalf : cumAngle;
      const endPadded = i < N - 1 ? segEnd - padHalf : segEnd;

      if (endPadded > startPadded + 0.001) {
        const color = seg.color ?? 'var(--void-color-accent)';
        const d = this.variant === 'outline'
          ? gaugeBand(cx, cy, r, this.thickness, startPadded, endPadded)
          : gaugeArc(cx, cy, r, startPadded, endPadded);
        results.push(svg`
          <path
            class="void-gauge-segment"
            d=${d}
            style="--segment-color: ${color}; --gauge-stroke-width: ${this.thickness};"
            data-segment-index=${origIdx}
          ></path>
        `);
        if (firstColor === null) {
          firstColor = color;
          firstStart = startPadded;
        }
        lastColor = color;
        lastEnd = endPadded;
      }
      cumAngle += segSweep;
    }

    if (results.length === 0) return nothing;

    // Leading/trailing round caps as separate circles in the respective
    // segments' colors. Painted BEFORE the segment arcs (lower z-order)
    // so the butt-cap arcs cover the inward-facing half of each circle —
    // only the outward-facing half remains visible, forming the rounded
    // leading/trailing edge.
    const capR = this.thickness / 2;
    const caps: unknown[] = [];
    if (firstStart !== null && firstColor !== null) {
      const lx = cx + r * Math.cos(firstStart);
      const ly = cy + r * Math.sin(firstStart);
      caps.push(svg`<circle class="void-gauge-segment-cap" cx=${lx} cy=${ly} r=${capR} style="--segment-color: ${firstColor};"></circle>`);
    }
    if (lastEnd !== null && lastColor !== null) {
      const tx = cx + r * Math.cos(lastEnd);
      const ty = cy + r * Math.sin(lastEnd);
      caps.push(svg`<circle class="void-gauge-segment-cap" cx=${tx} cy=${ty} r=${capR} style="--segment-color: ${lastColor};"></circle>`);
    }

    return svg`<g class="void-gauge-segments">${caps}${results}</g>`;
  }

  private _renderCenter(cx: number, cy: number) {
    const displayVal = this._displayValue;
    const formatted = formatValue(displayVal);
    // For semi-circle place label slightly above center; for others at center
    const labelY = this.circular === 'semi' ? cy * 0.7 : cy;
    const unitY = labelY + 20;

    if (this.unitInline && this.unit) {
      // Inline: value + unit on the same baseline, with a small gap
      return svg`
        <text
          class="void-gauge-center-value"
          x=${cx}
          y=${labelY}
          text-anchor="middle"
          dy="0.32em"
        >${formatted}<tspan class="void-gauge-center-unit-inline" dx="6">${this.unit}</tspan></text>
      `;
    }

    return svg`
      <text
        class="void-gauge-center-value"
        x=${cx}
        y=${labelY}
        text-anchor="middle"
        dy="0.32em"
      >${formatted}</text>
      ${this.unit ? svg`
        <text
          class="void-gauge-center-unit"
          x=${cx}
          y=${unitY}
          text-anchor="middle"
          dy="0.32em"
        >${this.unit}</text>
      ` : nothing}
    `;
  }

  private _hasTicks(): boolean {
    // tick-min and tick-max alone don't enable the tick infrastructure —
    // they default to true and decorate the tick set that tick-major /
    // tick-minor produce. A bare gauge with no major/minor interval
    // doesn't get any ticks.
    return this.tickMajor > 0 || this.tickMinor > 0;
  }

  private _renderTicks(cx: number, cy: number, r: number) {
    if (!this._hasTicks()) return nothing;
    const range = this.max - this.min;
    if (range <= 0) return nothing;
    // Ticks live INSIDE the band — they extend inward from just below the
    // band's inner edge toward the gauge center.
    const innerR = Math.max(0, r - this.thickness / 2);
    const tickStartR = Math.max(0, innerR - 3);
    const tickEndMinor = Math.max(0, tickStartR - 5);
    const tickEndMajor = Math.max(0, tickStartR - 10);
    // Collect tick positions (v, major) in order along the arc. tick-min
    // and tick-max are only active when major/minor enables the tick
    // infrastructure (see _hasTicks).
    const positions: Array<{ v: number; major: boolean }> = [];
    const step = this.tickMinor > 0 ? this.tickMinor : this.tickMajor;
    if (step <= 0) return nothing;
    if (!this.hideTickMin) {
      positions.push({ v: this.min, major: true });
    }
    const eps = step * 1e-6;
    for (let v = this.min + step; v < this.max - eps; v += step) {
      const isMajor = this.tickMajor > 0
        && Math.abs(((v - this.min) / this.tickMajor) - Math.round((v - this.min) / this.tickMajor)) < 1e-6;
      positions.push({ v, major: isMajor });
    }
    const ratio = (this.max - this.min) / step;
    const onStep = Math.abs(ratio - Math.round(ratio)) < eps;
    if (!this.hideTickMax || onStep) {
      const naturallyMajor = this.tickMajor > 0
        && Math.abs(((this.max - this.min) / this.tickMajor) - Math.round((this.max - this.min) / this.tickMajor)) < 1e-6;
      positions.push({ v: this.max, major: !this.hideTickMax || naturallyMajor });
    }

    if (positions.length === 0) return nothing;

    const ticks: unknown[] = positions.map(({ v, major }) => {
      const angle = this._angleAt(v);
      const endR = major ? tickEndMajor : tickEndMinor;
      const x1 = (cx + tickStartR * Math.cos(angle)).toFixed(2);
      const y1 = (cy + tickStartR * Math.sin(angle)).toFixed(2);
      const x2 = (cx + endR * Math.cos(angle)).toFixed(2);
      const y2 = (cy + endR * Math.sin(angle)).toFixed(2);
      const cls = major ? 'void-gauge-tick-major' : 'void-gauge-tick-minor';
      return svg`<line class="void-gauge-tick ${cls}" x1=${x1} y1=${y1} x2=${x2} y2=${y2}></line>`;
    });
    return svg`<g class="void-gauge-ticks">${ticks}</g>`;
  }

  render() {
    const { startAngle, endAngle, totalSweep } = arcAngles(this.circular);
    const cx = this.size / 2;
    const cy = this.size / 2;
    const margin = Math.max(8, this.thickness / 2);
    const r = this.size / 2 - margin;
    const vbH = this._viewBoxHeight();

    const displayedTotal = [...this._displaySegments.values()].reduce((s, v) => s + v, 0);
    const clamped = Math.max(this.min, Math.min(this.max, this._displayValue));
    const ratio = this.max - this.min === 0 ? 0 : (clamped - this.min) / (this.max - this.min);
    const fillEndAngle = startAngle + Math.max(0, Math.min(1, ratio)) * totalSweep;
    const fillColor = this._resolveFillColor();
    const hasFill = fillEndAngle > startAngle + 0.001;

    return html`
      <svg
        viewBox="0 0 ${this.size} ${vbH}"
        role="img"
        aria-label=${this.ariaLabel || 'Gauge chart'}
        data-phase=${this._phase}
      >
        <!-- Track — full arc, always. Gaps between segments reveal the
             track color underneath, which represents the "empty" gauge
             state (semantically: the gap is "behind" the segments,
             matching the unfilled portion of the gauge). -->
        <path
          class="void-gauge-track"
          style="--gauge-stroke-width: ${this.thickness};"
          d=${gaugeArc(cx, cy, r, startAngle, endAngle)}
        ></path>

        <!-- Zone bands. Filled variant: zones render full-width and are
             covered by the value's opaque stroke. Outline variant: zones
             under the fill are clipped so the active-zone color reads
             contiguously (otherwise the 14% tint composites through). -->
        ${this._renderZones(cx, cy, r, fillEndAngle)}

        <!-- Value fill (skip when segments are present — segments paint
             their own colors directly). For the 'outline' variant use a
             closed band shape so SVG fill renders the faint tint AND
             stroke renders a hairline border. Other variants use a
             stroked centerline arc. -->
        ${hasFill && !this._hasSegments() ? svg`
          <path
            class="void-gauge-value"
            style="--value-color: ${fillColor}; --gauge-stroke-width: ${this.thickness};"
            d=${this.variant === 'outline'
              ? gaugeBand(cx, cy, r, this.thickness, startAngle, fillEndAngle)
              : gaugeArc(cx, cy, r, startAngle, fillEndAngle)}
          ></path>
        ` : nothing}

        <!-- Segment overlays -->
        ${this._renderSegments(cx, cy, r, startAngle, displayedTotal, fillEndAngle)}

        <!-- Tick marks (outside the band) -->
        ${this._renderTicks(cx, cy, r)}

        <!-- Center label -->
        ${!this.hideValue ? this._renderCenter(cx, cy) : nothing}

        <!-- Hover tooltip -->
        ${this._hoverSegment !== null && this._data.segments && this._hoverSegment < this._data.segments.length
          ? this._renderHoverTooltip(this._data.segments, this._hoverSegment)
          : nothing}
      </svg>
    `;
  }

  private _renderHoverTooltip(segments: GaugeSegment[], hi: number): unknown {
    const seg = segments[hi]!;
    const display = this._displaySegments.get(hi) ?? seg.value;
    const totalSum = [...this._displaySegments.values()].reduce((s, v) => s + v, 0)
      || this._displayValue || 1;
    const pct = Math.round((display / totalSum) * 100);
    const padding = 8;
    const titleH = 14;
    const lineH = 14;
    const tooltipW = 140;
    const tooltipH = padding * 2 + titleH + lineH;
    const offset = 12;
    const vbH = this._viewBoxHeight();
    let tx = this._hoverX + offset;
    let ty = this._hoverY + offset;
    if (tx + tooltipW > this.size) tx = this._hoverX - offset - tooltipW;
    if (ty + tooltipH > vbH) ty = this._hoverY - offset - tooltipH;
    if (tx < 0) tx = 0;
    if (ty < 0) ty = 0;
    return svg`
      <g class="void-gauge-hover" pointer-events="none">
        <rect
          class="void-gauge-tooltip-bg"
          x=${tx} y=${ty}
          width=${tooltipW} height=${tooltipH}
          rx="6" ry="6"
        ></rect>
        <text
          class="void-gauge-tooltip-name"
          x=${tx + padding}
          y=${ty + padding + 10}
        >${seg.name}</text>
        <text
          class="void-gauge-tooltip-value"
          x=${tx + padding}
          y=${ty + padding + titleH + 10}
        >${formatValue(display)} <tspan class="void-gauge-tooltip-pct">(${pct}%)</tspan></text>
      </g>
    `;
  }
}

if (!customElements.get('void-gauge')) {
  customElements.define('void-gauge', VoidGauge);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-gauge': VoidGauge;
  }
}
