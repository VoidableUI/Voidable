import { html, svg, nothing, type TemplateResult } from 'lit';
import { VoidElement } from '../base.js';
import { property, state } from 'lit/decorators.js';
import { arcPath } from './charts/shape.js';

export interface DonutChartSegment {
  name: string;
  value: number;
  color?: string;
}

export interface DonutChartData {
  segments: DonutChartSegment[];
}

/** Non-finite values (NaN, Infinity) count as zero. */
function fin(v: number): number {
  return Number.isFinite(v) ? v : 0;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function formatTotal(v: number): string {
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
  return Math.round(v).toString();
}

function formatValue(v: number): string {
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
  return Math.round(v).toString();
}

/**
 * Donut chart for part-to-whole breakdowns, drawn in SVG with animated segments and an optional total in the
 * centre. Give it `data` (`{ segments: [{ name, value }] }`) from script; it has no children. The chart is an
 * image to assistive technology, so set `aria-label` and state the key figures in the surrounding text.
 */
export class VoidDonutChart extends VoidElement {

  /** Width and height of the chart in pixels. Defaults to 220. */
  @property({ type: Number, reflect: true }) size = 220;
  /**
   * Inner radius as a fraction of the outer radius, from 0 (a pie) to just under 1 (a thin ring).
   * Defaults to 0.6.
   */
  @property({ type: Number }) inner = 0.6;
  /** Visible gap between segments. `false`/`0` = seamless (segments touch).
      `true` = 1% of the total arc consumed by gaps (the sensible default
      when you want visible separation). A number = explicit percent of the
      total arc consumed by gaps. Higher % = clearer segmentation but more
      arc sacrificed to whitespace; the precision-vs-clarity tradeoff. */
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
   * How segments are drawn: `filled` (default), `outline` (tinted with a border) or `wireframe` (border
   * only).
   */
  @property({ reflect: true }) variant: 'filled' | 'outline' | 'wireframe' = 'filled';
  /** Print each segment's value on its arc, abbreviated above 1000 (`1.2k`). */
  @property({ type: Boolean, attribute: 'show-value', reflect: true }) showValue = false;
  /** Print the sum of the segments in the centre of the ring. */
  @property({ type: Boolean, attribute: 'show-total', reflect: true }) showTotal = false;
  /**
   * Accessible name of the chart, such as `Traffic by source`. The chart is an image to assistive
   * technology, so set it and put the key figures in the text around it.
   */
  @property({ attribute: 'aria-label' }) ariaLabel = '';

  private _data: DonutChartData = { segments: [] };

  /**
   * The chart's data: `{ segments: [{ name, value, color? }] }`. Each segment's share of the ring is its
   * `value` over the sum of all values. Property only: assign a new object to update the chart and animate to it.
   */
  get data(): DonutChartData { return this._data; }
  set data(next: DonutChartData) {
    const prevSegments = this._data.segments;
    const prevProgress = this._progress;
    const prevDisplayValues = new Map(this._displayValues);
    const prevDisplayTotal = this._displayTotal;
    this._data = next;
    this._refreshTargets();
    this.requestUpdate();
    this.updateComplete.then(() => {
      // Snapshot current displayed state before re-animating
      const fromValues = new Map<number, number>();
      for (let i = 0; i < prevSegments.length; i++) {
        fromValues.set(i, prevDisplayValues.get(i) ?? 0);
      }
      // Pad new segments that didn't exist before
      for (let i = 0; i < next.segments.length; i++) {
        if (!fromValues.has(i)) fromValues.set(i, 0);
      }
      this._startAnimation(fromValues, prevDisplayTotal, prevProgress >= 1 ? 1 : prevProgress, false);
    });
  }

  @state() private _phase: 'pre' | 'animating' | 'idle' = 'pre';
  @state() private _hoverSegment: number | null = null;
  @state() private _hoverX: number = 0;
  @state() private _hoverY: number = 0;
  private _progress = 0;
  private _progressFrom = 0;
  private _displayValues = new Map<number, number>();
  private _targetValues = new Map<number, number>();
  private _animFrom = new Map<number, number>();
  private _displayTotal = 0;
  private _displayTotalFrom = 0;
  private _targetTotal = 0;
  private _animStart = 0;
  private _animDuration = 0;
  private _rafHandle = 0;

  private _refreshTargets() {
    this._targetValues.clear();
    const segments = this._data.segments;
    for (let i = 0; i < segments.length; i++) {
      this._targetValues.set(i, fin(segments[i]!.value));
    }
    this._targetTotal = segments.reduce((s, x) => s + fin(x.value), 0);
  }

  connectedCallback() {
    super.connectedCallback();
    this.setHostAttribute('role', 'img');
    this._refreshTargets();
    requestAnimationFrame(() => { this._startAnimation(new Map(), 0, 0, true); });
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
    if (segments.length === 0 || this._displayTotal <= 0) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0) return;
    // Mouse coords in viewBox space (viewBox is size × size)
    const mx = ((e.clientX - rect.left) / rect.width) * this.size;
    const my = ((e.clientY - rect.top) / rect.height) * this.size;
    const cx = this.size / 2;
    const cy = this.size / 2;
    const dx = mx - cx;
    const dy = my - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const outerR = this.size / 2 - 4;
    const innerR = outerR * this.inner;
    if (dist < innerR || dist > outerR) {
      if (this._hoverSegment !== null) this._hoverSegment = null;
      return;
    }
    // Normalize angle: start at -π/2 (top), clockwise positive
    let angle = Math.atan2(dy, dx) - (-Math.PI / 2);
    if (angle < 0) angle += 2 * Math.PI;
    // Walk segments to find which one this angle falls in
    const fullSweep = 2 * Math.PI;
    let cum = 0;
    for (let i = 0; i < segments.length; i++) {
      const segValue = fin(segments[i]!.value);
      const segSweep = (segValue / this._targetTotal) * fullSweep;
      if (angle >= cum && angle < cum + segSweep) {
        if (this._hoverSegment !== i) this._hoverSegment = i;
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
    fromValues: Map<number, number>,
    fromTotal: number,
    progressFrom: number,
    isEntrance: boolean,
  ) {
    cancelAnimationFrame(this._rafHandle);
    const cs = getComputedStyle(this);
    const scaleStr = cs.getPropertyValue('--void-anim-scale').trim();
    const scale = scaleStr === '' ? 1 : parseFloat(scaleStr);
    const baseDur = parseFloat(cs.getPropertyValue('--void-duration-chart-enter')) || 700;
    this._animDuration = baseDur * scale;

    this._animFrom = fromValues;
    this._displayTotalFrom = fromTotal;
    this._progressFrom = isEntrance ? 0 : progressFrom;
    this._progress = this._progressFrom;
    this._animStart = performance.now();

    if (this._animDuration <= 0) {
      this._progress = 1;
      this._displayValues = new Map(this._targetValues);
      this._displayTotal = this._targetTotal;
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

    this._progress = this._progressFrom + (1 - this._progressFrom) * e;

    for (const [i, target] of this._targetValues) {
      const from = this._animFrom.get(i) ?? 0;
      this._displayValues.set(i, from + (target - from) * e);
    }
    this._displayTotal = this._displayTotalFrom + (this._targetTotal - this._displayTotalFrom) * e;

    this.requestUpdate();

    if (t < 1) {
      this._rafHandle = requestAnimationFrame(this._tick);
    } else {
      this._phase = 'idle';
    }
  };

  render() {
    const { segments } = this._data;
    const total = segments.reduce((s, x) => s + fin(x.value), 0);
    if (segments.length === 0 || total === 0) {
      return html`<svg viewBox="0 0 ${this.size} ${this.size}" role="img" aria-label=${this.ariaLabel || 'Donut chart'}></svg>`;
    }

    const cx = this.size / 2;
    const cy = this.size / 2;
    const margin = 4;
    const outerR = this.size / 2 - margin;
    const innerR = outerR * this.inner;

    const displayedTotal = Math.max(this._displayTotal, 0.001);
    const fullSweep = 2 * Math.PI;
    const stopAngle = -Math.PI / 2 + this._progress * fullSweep;

    // Resolve `gaps`: false=0%, true=1% (sensible default), number=explicit %.
    const gapPercent = this.gaps === true ? 1
                     : this.gaps === false ? 0
                     : this.gaps;
    const gapTotal = (gapPercent / 100) * fullSweep;
    // A ring with one non-zero segment has nothing to separate: no gap, no seam.
    const drawn = segments.filter((_, j) => (this._displayValues.get(j) ?? 0) > 0).length;
    const gapPerSegment = drawn > 1 ? gapTotal / segments.length : 0;
    const padHalf = gapPerSegment / 2;

    const arcs: TemplateResult[] = [];
    let cumulative = -Math.PI / 2;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]!;
      const displayVal = this._displayValues.get(i) ?? 0;
      const segStart = cumulative;
      const segEnd = segStart + (displayVal / displayedTotal) * fullSweep;
      const renderedEnd = Math.min(segEnd, stopAngle);

      if (renderedEnd > segStart + 0.001) {
        const color = seg.color ?? `var(--void-chart-series-${(i % 6) + 1})`;
        const startPadded = segStart + padHalf;
        const endPadded = drawn === 1 && renderedEnd >= segStart + fullSweep - 1e-9
          ? startPadded + fullSweep
          : Math.max(startPadded + 0.001, renderedEnd - padHalf);
        arcs.push(svg`
          <path
            class="void-donut-chart-segment"
            d=${arcPath(cx, cy, outerR, startPadded, endPadded, innerR)}
            style="--segment-color: ${color}"
            data-segment-index=${i}
          ></path>
        `);
      }
      cumulative = segEnd;
    }

    return html`
      <svg
        viewBox="0 0 ${this.size} ${this.size}"
        role="img"
        aria-label=${this.ariaLabel || 'Donut chart'}
        data-phase=${this._phase}
      >
        ${arcs}
        ${this.showTotal
          ? svg`
            <g class="void-donut-chart-total">
              <text x=${cx} y=${cy} text-anchor="middle" dy="0.32em">${formatTotal(this._displayTotal)}</text>
            </g>
          `
          : nothing}
        ${this.showValue
          ? svg`
            <g class="void-donut-chart-labels">
              ${segments.map((_seg, i) => {
                const display = this._displayValues.get(i) ?? 0;
                if (display < 0.001) return nothing;
                let cum = -Math.PI / 2;
                for (let j = 0; j < i; j++) {
                  cum += ((this._displayValues.get(j) ?? 0) / displayedTotal) * fullSweep;
                }
                const mid = cum + (display / displayedTotal) * fullSweep / 2;
                const labelR = (outerR + innerR) / 2;
                const x = cx + labelR * Math.cos(mid);
                const y = cy + labelR * Math.sin(mid);
                return svg`<text x=${x} y=${y} text-anchor="middle" dy="0.32em">${formatValue(display)}</text>`;
              })}
            </g>
          `
          : nothing}

        ${this._hoverSegment !== null && this._hoverSegment < segments.length
          ? this._renderHoverTooltip(segments, this._hoverSegment)
          : nothing}
      </svg>
    `;
  }

  private _renderHoverTooltip(
    segments: DonutChartSegment[],
    hi: number,
  ): unknown {
    const seg = segments[hi]!;
    const display = this._displayValues.get(hi) ?? fin(seg.value);
    const totalSum = [...this._displayValues.values()].reduce((s, v) => s + v, 0)
      || this._targetTotal || 1;
    const pct = Math.round((display / totalSum) * 100);
    // Tooltip dimensions
    const padding = 8;
    const titleH = 14;
    const lineH = 14;
    const tooltipW = 140;
    const tooltipH = padding * 2 + titleH + lineH;
    // Pin the tooltip to the side OPPOSITE the cursor so it never overlaps
    // the donut ring on the same side as the hovered segment.
    // Cursor on left half  → tooltip pinned to right edge.
    // Cursor on right half → tooltip pinned to left edge.
    const edgePad = 8;
    const cxCenter = this.size / 2;
    const tx = this._hoverX < cxCenter
      ? this.size - tooltipW - edgePad
      : edgePad;
    let ty = this._hoverY - tooltipH / 2;  // vertically centered on cursor
    if (ty < edgePad) ty = edgePad;
    if (ty + tooltipH > this.size - edgePad) ty = this.size - tooltipH - edgePad;
    return svg`
      <g class="void-donut-chart-hover" pointer-events="none">
        <rect
          class="void-donut-chart-tooltip-bg"
          x=${tx} y=${ty}
          width=${tooltipW} height=${tooltipH}
          rx="6" ry="6"
        ></rect>
        <text
          class="void-donut-chart-tooltip-name"
          x=${tx + padding}
          y=${ty + padding + 10}
        >${seg.name}</text>
        <text
          class="void-donut-chart-tooltip-value"
          x=${tx + padding}
          y=${ty + padding + titleH + 10}
        >${formatValue(display)} <tspan class="void-donut-chart-tooltip-pct">(${pct}%)</tspan></text>
      </g>
    `;
  }
}

if (!customElements.get('void-donut-chart')) {
  customElements.define('void-donut-chart', VoidDonutChart);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-donut-chart': VoidDonutChart;
  }
}
