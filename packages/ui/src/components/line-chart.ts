import { html, svg, nothing } from 'lit';
import { VoidElement } from '../base.js';
import { property, state } from 'lit/decorators.js';
import { LinearScale } from './charts/scale.js';
import { linePath, areaPath, smoothLinePath, smoothAreaPath } from './charts/shape.js';
import { guard } from 'lit/directives/guard.js';
import { useProjection } from '../projection.js';
import { readChartInput, normalizeSeriesData, dataTable, seriesTable, chartLocale, type ChartSource } from './charts/data.js';

useProjection();

export interface LineChartSeries {
  name: string;
  values: number[];
  color?: string;
}

export interface LineChartData {
  series: LineChartSeries[];
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

function niceStepLocal(raw: number): number {
  if (raw <= 0) return 1;
  const exp = Math.floor(Math.log10(raw));
  const mag = Math.pow(10, exp);
  const frac = raw / mag;
  const niceFrac = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
  return niceFrac * mag;
}

/**
 * Line chart for trends over time with one or more series, linear or stepped, drawn in SVG with an animated
 * entry. Give it `data` (`{ series: [{ name, values }], labels }`) as the `data` property or as JSON in the
 * `data` attribute, so server-rendered markup draws it with no script; it has no children. The drawing is
 * hidden from assistive technology and a visually hidden data table (captioned with `aria-label`) carries
 * the values instead; add `show-table` to show the table below the chart too.
 */
export class VoidLineChart extends VoidElement {

  /** Height of the chart in pixels. Defaults to 220. The width fills the container. */
  @property({ type: Number, reflect: true }) height = 220;
  /** Print each point's value above it, abbreviated above 1000 (`1.2k`). */
  @property({ type: Boolean, attribute: 'show-value', reflect: true }) showValue = false;
  /**
   * How the area under each line is drawn: `outline` (default, a light tint), `filled` (a stronger tint)
   * or `wireframe` (no area, just the line).
   */
  @property({ reflect: true }) variant: 'filled' | 'outline' | 'wireframe' = 'outline';
  /**
   * How points are joined: `linear` (default, straight segments) or `step` (a horizontal run, then a
   * vertical jump).
   */
  @property({ reflect: true }) interpolation: 'linear' | 'step' = 'linear';
  /**
   * Accessible name of the chart, such as `Visitors per day`; it is also the caption of the data table.
   * Set it: the drawing itself is hidden from assistive technology.
   */
  @property({ attribute: 'aria-label' }) ariaLabel = '';
  /**
   * Show the data table (one row per point, one column per series) below the chart. The table is always
   * there for assistive technology; this makes it visible too.
   */
  @property({ type: Boolean, attribute: 'show-table', reflect: true }) showTable = false;

  private _data: LineChartData = { series: [] };
  private _source: ChartSource = { text: null };
  private _entered = false;

  /**
   * The chart's data: `{ series: [{ name, values, color? }], labels? }`. `values` are aligned with `labels`
   * (the names along the horizontal axis); `color` overrides a series' colour. Give it as a property
   * (assign a new object to update the chart and animate to it) or as JSON in the `data` attribute:
   * `<void-line-chart data='{"series":[{"name":"Visitors","values":[3,5,4]}],"labels":["Mon","Tue","Wed"]}'>`.
   * Invalid JSON draws nothing and is reported by `@voidable/ui/dev`. The property is not reflected to the
   * attribute (the data can be large), and an attribute a server morph leaves unchanged does not animate again.
   */
  @property({ attribute: 'data' })
  get data(): LineChartData { return this._data; }
  set data(input: LineChartData) {
    const r = readChartInput<LineChartData>(input, this._source, {
      attr: 'data',
      shape: '{"series":[{"name":"Visitors","values":[3,5,4]}],"labels":["Mon","Tue","Wed"]}',
      empty: () => ({ series: [] }),
      normalize: normalizeSeriesData,
      warn: (subject, message) => this.reportDev('invalid-data', subject, message),
    });
    if (!r) return;
    const prev = new Map(this._display);
    this._data = r.value;
    this._refreshTargets();
    this.requestUpdate();
    // Before the entrance animation has started, it draws whatever is there.
    if (this._entered) this.updateComplete.then(() => this._startAnimation(prev, false));
  }

  @state() private _phase: 'pre' | 'animating' | 'idle' = 'pre';
  private _display = new Map<string, number>();
  private _targets = new Map<string, number>();
  private _animFrom = new Map<string, number>();
  private _animStart = 0;
  private _animDuration = 0;
  private _rafHandle = 0;
  private _reveal = 0;
  private _revealFrom = 0;

  private _key(si: number, pi: number) { return `${si}-${pi}`; }

  private _refreshTargets() {
    this._targets.clear();
    this._data.series.forEach((s, si) => {
      s.values.forEach((v, pi) => this._targets.set(this._key(si, pi), Number.isFinite(v) ? v : 0));
    });
  }

  @state() private _hoverIndex: number | null = null;

  connectedCallback() {
    super.connectedCallback();
    // A figure, not an image: an image's children are presentational and would hide the data table.
    this.setHostAttribute('role', 'figure');
    this._refreshTargets();
    requestAnimationFrame(() => { this._entered = true; this._startAnimation(new Map(), true); });
    this.addEventListener('mousemove', this._onMouseMove);
    this.addEventListener('mouseleave', this._onMouseLeave);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    cancelAnimationFrame(this._rafHandle);
    this.removeEventListener('mousemove', this._onMouseMove);
    this.removeEventListener('mouseleave', this._onMouseLeave);
  }

  private _startAnimation(prev: Map<string, number>, isEntrance: boolean) {
    cancelAnimationFrame(this._rafHandle);
    const cs = getComputedStyle(this);
    const scaleStr = cs.getPropertyValue('--void-anim-scale').trim();
    const scale = scaleStr === '' ? 1 : parseFloat(scaleStr);
    const baseDur = parseFloat(cs.getPropertyValue('--void-duration-chart-enter')) || 700;
    this._animDuration = baseDur * scale;
    this._animStart = performance.now();

    if (isEntrance) {
      // Entrance: line shape is already at target positions. Only the clip-path
      // reveals left-to-right. _display = _targets so the rendered path is fixed
      // in shape from the very first frame; only _reveal animates 0 → 1.
      this._display = new Map(this._targets);
      this._animFrom = new Map(this._targets);
      this._revealFrom = 0;
      this._reveal = 0;
    } else {
      // Data update: line stays fully revealed; point y-values morph old → new.
      this._animFrom = prev;
      this._revealFrom = 1;
      this._reveal = 1;
    }

    if (this._animDuration <= 0) {
      this._display = new Map(this._targets);
      this._reveal = 1;
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

    this._reveal = this._revealFrom + (1 - this._revealFrom) * e;

    for (const [key, target] of this._targets) {
      const from = this._animFrom.get(key) ?? 0;
      this._display.set(key, from + (target - from) * e);
    }

    this.requestUpdate();

    if (t < 1) {
      this._rafHandle = requestAnimationFrame(this._tick);
    } else {
      this._phase = 'idle';
    }
  };

  private _onMouseMove = (e: MouseEvent) => {
    const svg = this.querySelector('svg');
    if (!svg) return;
    const numPoints = Math.max(0, ...this._data.series.map(s => s.values.length));
    if (numPoints < 2) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0) return;
    // Mouse x in viewBox coordinates (viewBox is 600 wide)
    const vbX = ((e.clientX - rect.left) / rect.width) * 600;
    const leftMargin = 40, rightMargin = 16;
    const innerWidth = 600 - leftMargin - rightMargin;
    if (vbX < leftMargin || vbX > leftMargin + innerWidth) {
      if (this._hoverIndex !== null) { this._hoverIndex = null; }
      return;
    }
    const xRatio = (vbX - leftMargin) / innerWidth;
    const index = Math.round(xRatio * (numPoints - 1));
    if (index !== this._hoverIndex) {
      this._hoverIndex = index;
    }
  };

  private _onMouseLeave = () => {
    this._hoverIndex = null;
  };

  render() {
    const { series, labels = [] } = this._data;
    if (series.length === 0) {
      return html`<svg viewBox="0 0 600 ${this.height}" aria-hidden="true"></svg>`;
    }

    const topMargin = 16, rightMargin = 16, bottomMargin = 32, leftMargin = 40;
    const width = 600;
    const innerWidth = width - leftMargin - rightMargin;
    const innerHeight = this.height - topMargin - bottomMargin;
    const numPoints = Math.max(...series.map(s => s.values.length));
    const allValues = series.flatMap(s => s.values).filter(Number.isFinite);
    const maxValue = Math.max(...allValues, 0);
    const domainMax = niceStepLocal(maxValue * 1.1) || 1;

    const xScale = new LinearScale(
      [0, Math.max(0, numPoints - 1)],
      [leftMargin, leftMargin + innerWidth],
    );
    const yScale = new LinearScale(
      [0, domainMax],
      [topMargin + innerHeight, topMargin],
    );
    const yTicks = yScale.ticks(5);
    const baseline = topMargin + innerHeight;

    // When the global shape is curvy (--void-radius-sm > 0), interpolate the
    // line as monotone-cubic Bezier so the curve LOOKS curvy, not just the
    // segment joins. data-shape="sharp" zeroes the radius and falls back to
    // straight segments. Stepped interpolation always uses straight (the
    // staircase shape is the whole point).
    const cs = getComputedStyle(this);
    const shapeRadius = parseFloat(cs.getPropertyValue('--void-radius-sm')) || 0;
    const useSmooth = shapeRadius > 0 && this.interpolation === 'linear';
    const linePathFn = useSmooth ? smoothLinePath : linePath;
    const areaPathFn = useSmooth ? smoothAreaPath : areaPath;

    const seriesPoints = series.map((s, si) => {
      const pts: Array<[number, number]> = [];
      for (let pi = 0; pi < s.values.length; pi++) {
        const display = this._display.get(this._key(si, pi)) ?? 0;
        pts.push([xScale.scale(pi), yScale.scale(display)]);
      }
      if (this.interpolation === 'step') {
        const step: Array<[number, number]> = [];
        for (let i = 0; i < pts.length; i++) {
          step.push(pts[i]!);
          if (i < pts.length - 1) step.push([pts[i + 1]![0], pts[i]![1]]);
        }
        return step;
      }
      return pts;
    });

    return html`
      <svg
        viewBox="0 0 ${width} ${this.height}"
        preserveAspectRatio="none"
        aria-hidden="true"
        data-phase=${this._phase}
        style="--reveal: ${this._reveal}"
      >
        <g class="void-line-chart-grid">
          ${yTicks.map(tick => {
            const y = yScale.scale(tick);
            return svg`<line x1=${leftMargin} x2=${leftMargin + innerWidth} y1=${y} y2=${y}></line>`;
          })}
        </g>

        <g class="void-line-chart-y-axis">
          ${yTicks.map(tick => {
            const y = yScale.scale(tick);
            return svg`<text x=${leftMargin - 8} y=${y} dy="0.32em" text-anchor="end">${formatTick(tick)}</text>`;
          })}
        </g>

        ${series.map((s, si) => {
          const color = s.color ?? `var(--void-chart-series-${(si % 6) + 1})`;
          const pts = seriesPoints[si]!;
          return svg`
            <g class="void-line-chart-series" style="--series-color: ${color}">
              <path class="void-line-chart-area" d=${areaPathFn(pts, baseline)}></path>
              <path class="void-line-chart-line" d=${linePathFn(pts)}></path>
            </g>
          `;
        })}

        ${this.showValue
          ? series.map((s, si) => {
              return svg`
                <g class="void-line-chart-values">
                  ${s.values.map((_, pi) => {
                    const display = this._display.get(this._key(si, pi)) ?? 0;
                    const x = xScale.scale(pi);
                    const y = yScale.scale(display);
                    return svg`<text x=${x} y=${y - 8} text-anchor="middle">${formatValue(display)}</text>`;
                  })}
                </g>
              `;
            })
          : nothing}

        <g class="void-line-chart-x-axis">
          ${labels.slice(0, numPoints).map((label, i) => {
            const x = xScale.scale(i);
            const y = topMargin + innerHeight + 18;
            return svg`<text x=${x} y=${y} text-anchor="middle">${label}</text>`;
          })}
        </g>

        ${this._hoverIndex !== null && this._hoverIndex < numPoints
          ? this._renderHover(series, labels, xScale, yScale, this._hoverIndex, topMargin, innerHeight, leftMargin, innerWidth)
          : nothing}
      </svg>
      ${this._table()}
    `;
  }

  /** The data table for assistive technology (and `show-table`), from the data as given, not the animated state. */
  private _table() {
    const data = this._data;
    const label = this.ariaLabel || 'Line chart';
    return guard([data, label, chartLocale(this)], () =>
      dataTable('void-line-chart-table', seriesTable(this, label, data.series, data.labels ?? [])));
  }

  private _renderHover(
    series: LineChartSeries[],
    labels: string[],
    xScale: LinearScale,
    yScale: LinearScale,
    hi: number,
    topMargin: number,
    innerHeight: number,
    leftMargin: number,
    innerWidth: number,
  ) {
    const hx = xScale.scale(hi);
    // Collect per-series displayed values at the hovered index
    const rows = series.map((s, si) => {
      const v = this._display.get(this._key(si, hi)) ?? 0;
      const color = s.color ?? `var(--void-chart-series-${(si % 6) + 1})`;
      return { name: s.name, value: v, color, y: yScale.scale(v) };
    });
    // Tooltip dimensions / placement
    const padding = 8;
    const lineH = 14;
    const headerH = 16;
    const tooltipH = headerH + rows.length * lineH + padding * 2;
    const tooltipW = 140;
    // Place tooltip to the right of hairline unless it would clip — then flip left
    const wouldClip = hx + 12 + tooltipW > leftMargin + innerWidth;
    const tx = wouldClip ? hx - 12 - tooltipW : hx + 12;
    const ty = Math.max(topMargin, Math.min(topMargin + innerHeight - tooltipH, topMargin + 8));
    const labelText = labels[hi] ?? String(hi);

    return svg`
      <g class="void-line-chart-hover">
        <line
          class="void-line-chart-hairline"
          x1=${hx} x2=${hx}
          y1=${topMargin} y2=${topMargin + innerHeight}
        ></line>
        ${rows.map(r => svg`
          <rect
            class="void-line-chart-marker"
            x=${hx - 5} y=${r.y - 5}
            width="10" height="10"
            style="--marker-color: ${r.color}"
          ></rect>
        `)}
        <rect
          class="void-line-chart-tooltip-bg"
          x=${tx} y=${ty}
          width=${tooltipW} height=${tooltipH}
          rx="6" ry="6"
        ></rect>
        <text
          class="void-line-chart-tooltip-label"
          x=${tx + padding}
          y=${ty + padding + 10}
        >${labelText}</text>
        ${rows.map((r, i) => svg`
          <circle
            class="void-line-chart-tooltip-swatch"
            cx=${tx + padding + 5}
            cy=${ty + headerH + padding + i * lineH + 4}
            r="4"
            style="--swatch-color: ${r.color}"
          ></circle>
          <text
            class="void-line-chart-tooltip-name"
            x=${tx + padding + 14}
            y=${ty + headerH + padding + i * lineH + 8}
          >${r.name}</text>
          <text
            class="void-line-chart-tooltip-value"
            x=${tx + tooltipW - padding}
            y=${ty + headerH + padding + i * lineH + 8}
            text-anchor="end"
          >${formatValue(r.value)}</text>
        `)}
      </g>
    `;
  }
}

if (!customElements.get('void-line-chart')) {
  customElements.define('void-line-chart', VoidLineChart);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-line-chart': VoidLineChart;
  }
}
