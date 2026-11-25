import { html, svg, nothing } from 'lit';
import { VoidElement } from '../base.js';
import { property, state } from 'lit/decorators.js';
import { LinearScale, BandScale } from './charts/scale.js';

export interface BarChartSeries {
  name: string;
  values: number[];
  /** Series-wide color. Falls back to the rotating palette when omitted. */
  color?: string;
  /** Per-bar color override, index-aligned with `values`. Use a sparse array
      (or `undefined`s) to override only specific bars; the rest fall back to
      `series.color` or the palette. */
  colors?: Array<string | undefined>;
}

export interface BarChartData {
  series: BarChartSeries[];
  labels?: string[];
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function formatTick(v: number): string {
  if (v === 0) return '0';
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function formatValue(v: number): string {
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
  return Math.round(v).toString();
}

// Shared with scale.ts to avoid re-import
function niceStepLocal(raw: number): number {
  if (raw <= 0) return 1;
  const exp = Math.floor(Math.log10(raw));
  const mag = Math.pow(10, exp);
  const frac = raw / mag;
  const niceFrac = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
  return niceFrac * mag;
}

/**
 * Bar chart for comparing categories and series, drawn in SVG with animated bars. Give it `data`
 * (`{ series: [{ name, values }], labels }`) from script; it has no children. The chart is an image to
 * assistive technology, so set `aria-label` and state the key figures in the surrounding text.
 */
export class VoidBarChart extends VoidElement {

  /** Height of the chart in pixels. Defaults to 220. The width fills the container. */
  @property({ type: Number, reflect: true }) height = 220;
  /** Print each bar's value above it, abbreviated above 1000 (`1.2k`). */
  @property({ type: Boolean, attribute: 'show-values', reflect: true }) showValues = false;
  /**
   * How bars are drawn: `filled` (default, solid), `outline` (tinted fill with a border) or `wireframe`
   * (border only).
   */
  @property({ reflect: true }) variant: 'filled' | 'outline' | 'wireframe' = 'filled';
  /**
   * Accessible name of the chart, such as `Revenue by quarter`. The chart is an image to assistive
   * technology, so set it and put the key figures in the text around it.
   */
  @property({ attribute: 'aria-label' }) ariaLabel = '';

  /**
   * Animate the bars in one after another. On by default; `stagger="false"` animates them together, and
   * a number sets the delay in milliseconds between bars.
   */
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
  }) stagger: boolean | number = true;

  private _data: BarChartData = { series: [] };

  /**
   * The chart's data: `{ series: [{ name, values, color?, colors? }], labels? }`. `values` are aligned with
   * `labels` (the category names along the axis); `color` colours a whole series and `colors` overrides single
   * bars. Property only: assign a new object to update the chart and animate to it.
   */
  get data(): BarChartData { return this._data; }
  set data(next: BarChartData) {
    const prev = new Map(this._display);
    this._data = next;
    this._refreshTargets();
    this.requestUpdate();
    this.updateComplete.then(() => this._startAnimation(prev));
  }

  @state() private _phase: 'pre' | 'animating' | 'idle' = 'pre';
  private _display = new Map<string, number>();
  private _targets = new Map<string, number>();
  private _animFrom = new Map<string, number>();
  private _animStart = 0;
  private _animDuration = 0;
  private _staggerMs = 0;
  private _rafHandle = 0;

  private _key(seriesIdx: number, barIdx: number) { return `${seriesIdx}-${barIdx}`; }

  private _refreshTargets() {
    this._targets.clear();
    this._data.series.forEach((s, si) => {
      s.values.forEach((v, bi) => this._targets.set(this._key(si, bi), Number.isFinite(v) ? v : 0));
    });
  }

  connectedCallback() {
    super.connectedCallback();
    this.setHostAttribute('role', 'img');
    this._refreshTargets();
    requestAnimationFrame(() => { this._startAnimation(new Map()); });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    cancelAnimationFrame(this._rafHandle);
  }

  private _startAnimation(prev: Map<string, number>) {
    cancelAnimationFrame(this._rafHandle);
    const cs = getComputedStyle(this);
    const scaleStr = cs.getPropertyValue('--void-anim-scale').trim();
    const scale = scaleStr === '' ? 1 : parseFloat(scaleStr);
    const baseDur = parseFloat(cs.getPropertyValue('--void-duration-chart-enter')) || 700;
    const baseStg = parseFloat(cs.getPropertyValue('--void-stagger-chart-bars')) || 40;
    this._animDuration = baseDur * scale;
    if (this.stagger === false) {
      this._staggerMs = 0;
    } else if (this.stagger === true) {
      this._staggerMs = baseStg * scale;
    } else {
      this._staggerMs = this.stagger * scale;
    }
    this._animFrom = prev;
    this._animStart = performance.now();

    if (this._animDuration <= 0) {
      this._display = new Map(this._targets);
      this._phase = 'idle';
      this.requestUpdate();
      return;
    }
    this._phase = 'animating';
    this._rafHandle = requestAnimationFrame(this._tick);
  }

  private _tick = (now: number) => {
    const elapsed = now - this._animStart;
    let inFlight = false;
    for (const [key, target] of this._targets) {
      const [, biStr] = key.split('-');
      const barIdx = Number(biStr);
      const localStart = barIdx * this._staggerMs;
      const localEnd = localStart + this._animDuration;
      const from = this._animFrom.get(key) ?? 0;
      if (elapsed <= localStart) {
        this._display.set(key, from);
        inFlight = true;
      } else if (elapsed >= localEnd) {
        this._display.set(key, target);
      } else {
        const t = (elapsed - localStart) / this._animDuration;
        this._display.set(key, from + (target - from) * easeOutCubic(t));
        inFlight = true;
      }
    }
    this.requestUpdate();
    if (inFlight) {
      this._rafHandle = requestAnimationFrame(this._tick);
    } else {
      this._phase = 'idle';
    }
  };

  render() {
    const { series, labels = [] } = this._data;
    if (series.length === 0) {
      return html`<svg viewBox="0 0 600 ${this.height}" role="img" aria-label=${this.ariaLabel || 'Bar chart'}></svg>`;
    }

    const topMargin = 16, rightMargin = 16, bottomMargin = 32, leftMargin = 40;
    const width = 600;
    const innerWidth = width - leftMargin - rightMargin;
    const innerHeight = this.height - topMargin - bottomMargin;
    const numCategories = Math.max(...series.map(s => s.values.length));
    const allValues = series.flatMap(s => s.values).filter(Number.isFinite);
    const maxValue = Math.max(...allValues, 0);
    const domainMax = niceStepLocal(maxValue * 1.1) || 1;
    const yScale = new LinearScale([0, domainMax], [topMargin + innerHeight, topMargin]);
    const xScale = new BandScale(numCategories, [leftMargin, leftMargin + innerWidth], 0.2);
    const yTicks = yScale.ticks(5);

    return html`
      <svg
        viewBox="0 0 600 ${this.height}"
        preserveAspectRatio="none"
        role="img"
        aria-label=${this.ariaLabel || 'Bar chart'}
        data-phase=${this._phase}
      >
        <g class="void-bar-chart-grid">
          ${yTicks.map(tick => {
            const y = yScale.scale(tick);
            return svg`<line x1=${leftMargin} x2=${leftMargin + innerWidth} y1=${y} y2=${y}></line>`;
          })}
        </g>

        <g class="void-bar-chart-y-axis">
          ${yTicks.map(tick => {
            const y = yScale.scale(tick);
            return svg`<text x=${leftMargin - 8} y=${y} dy="0.32em" text-anchor="end">${formatTick(tick)}</text>`;
          })}
        </g>

        ${series.map((s, si) => {
          const seriesColor = s.color ?? `var(--void-chart-series-${(si % 6) + 1})`;
          const subBandWidth = xScale.bandwidth / series.length;
          return svg`
            <g class="void-bar-chart-series" style="--series-color: ${seriesColor}">
              ${s.values.map((_, bi) => {
                const display = this._display.get(this._key(si, bi)) ?? 0;
                const barX = xScale.scale(bi) + subBandWidth * si;
                const barY = yScale.scale(display);
                const barH = Math.max(0, (topMargin + innerHeight) - barY);
                const barColor = s.colors?.[bi];
                return svg`<rect
                  class="void-bar-chart-bar"
                  x=${barX}
                  y=${barY}
                  width=${subBandWidth - 2}
                  height=${barH}
                  style=${barColor ? `--series-color: ${barColor}` : nothing}
                ></rect>`;
              })}
            </g>
          `;
        })}

        ${this.showValues
          ? series.map((s, si) => {
              const subBandWidth = xScale.bandwidth / series.length;
              return svg`
                <g class="void-bar-chart-values">
                  ${s.values.map((_, bi) => {
                    const display = this._display.get(this._key(si, bi)) ?? 0;
                    const barX = xScale.scale(bi) + subBandWidth * si + (subBandWidth - 2) / 2;
                    const barY = yScale.scale(display);
                    return svg`<text x=${barX} y=${barY - 6} text-anchor="middle">${formatValue(display)}</text>`;
                  })}
                </g>
              `;
            })
          : nothing}

        <g class="void-bar-chart-x-axis">
          ${labels.slice(0, numCategories).map((label, i) => {
            const x = xScale.scale(i) + xScale.bandwidth / 2;
            const y = topMargin + innerHeight + 18;
            return svg`<text x=${x} y=${y} text-anchor="middle">${label}</text>`;
          })}
        </g>
      </svg>
    `;
  }
}

if (!customElements.get('void-bar-chart')) {
  customElements.define('void-bar-chart', VoidBarChart);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-bar-chart': VoidBarChart;
  }
}
