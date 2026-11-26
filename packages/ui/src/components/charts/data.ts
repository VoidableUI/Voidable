import { html, nothing, type TemplateResult } from 'lit';
import { localeOf, msg } from '../../messages.js';

/** Reports a problem with a chart's data through the element's dev warning. */
export type ChartWarn = (subject: string, message: string) => void;

/** What an element remembers of the last attribute text it accepted, so an unchanged attribute draws nothing new. */
export interface ChartSource {
  text: string | null;
}

interface ChartInput<T> {
  /** The attribute the text came from, for the warning. */
  attr: string;
  /** What the attribute should look like, for the warning. */
  shape: string;
  empty: () => T;
  /** Turns parsed JSON into the property's value, or null when it has the wrong shape. */
  normalize: (raw: unknown) => T | null;
  warn: ChartWarn;
}

/**
 * Resolves what was assigned to a chart's `data` (or `zones`): an object (the property), or the text of the
 * JSON attribute. Returns `null` when the text is the one already accepted (an attribute a server morph left
 * alone), so nothing animates; otherwise the value to use. Invalid text gives the empty value (the chart
 * draws nothing) and a dev warning; it never throws.
 */
export function readChartInput<T>(input: unknown, source: ChartSource, o: ChartInput<T>): { value: T } | null {
  if (typeof input !== 'string') {
    source.text = null;
    return { value: input == null ? o.empty() : (input as T) };
  }
  if (input === source.text) return null;
  source.text = input;
  if (input.trim() === '') return { value: o.empty() };
  let raw: unknown;
  try {
    raw = JSON.parse(input);
  } catch (error) {
    o.warn(o.attr, `${o.attr}="${clip(input)}" is not valid JSON (${(error as Error).message}), so nothing is drawn. Expected ${o.shape}.`);
    return { value: o.empty() };
  }
  const value = o.normalize(raw);
  if (value === null) {
    o.warn(o.attr, `${o.attr}="${clip(input)}" does not have the shape the chart takes, so nothing is drawn. Expected ${o.shape}.`);
    return { value: o.empty() };
  }
  return { value };
}

function clip(text: string): string {
  return text.length > 60 ? `${text.slice(0, 57)}...` : text;
}

export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** `{ series: [{ name, values }], labels }`, as the bar and line charts take it. */
export function normalizeSeriesData<S extends { name: string; values: number[] }>(raw: unknown): { series: S[]; labels?: string[] } | null {
  if (!isRecord(raw) || (raw.series !== undefined && !Array.isArray(raw.series))) return null;
  const series = list(raw.series).filter(isRecord).map((s) => ({ ...s, name: String(s.name ?? ''), values: list(s.values) })) as unknown as S[];
  return raw.labels === undefined ? { series } : { series, labels: list(raw.labels).map(String) };
}

/** `{ segments: [{ name, value }] }`, as the donut takes it; the gauge's segments share the shape. */
export function normalizeSegments<S extends { name: string; value: number }>(raw: unknown): S[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.filter(isRecord).map((s) => ({ ...s, name: String(s.name ?? ''), value: s.value })) as unknown as S[];
}

/** The locale the text of `el` is in: its closest `lang` (the page's included), else `en-US`. */
export function chartLocale(el: Element): string {
  return localeOf(el);
}

/** Numbers the way a reader of this element's language expects them, with their full precision (up to three decimals). */
export function tableNumbers(el: Element): { number: (v: number) => string; percent: (v: number) => string } {
  const make = (options: Intl.NumberFormatOptions) => {
    try {
      return new Intl.NumberFormat(chartLocale(el), options);
    } catch {
      return new Intl.NumberFormat(undefined, options);
    }
  };
  const plain = make({ maximumFractionDigits: 3 });
  const pct = make({ style: 'percent', maximumFractionDigits: 1 });
  return {
    number: (v) => (typeof v === 'number' && Number.isFinite(v) ? plain.format(v) : '–'),
    percent: (v) => (Number.isFinite(v) ? pct.format(v) : '–'),
  };
}

export interface ChartTable {
  caption: string;
  /** Column headers; for a table with row headers the first is the corner. */
  head: string[];
  rows: Array<{ header?: string; cells: string[] }>;
}

/**
 * The data table every chart carries: visually hidden, in the accessibility tree, with the chart's label as
 * its caption (the theme shows it below the chart with `show-table`).
 */
export function dataTable(className: string, t: ChartTable | null): TemplateResult | typeof nothing {
  if (!t) return nothing;
  return html`<table class=${className}>
    <caption>${t.caption}</caption>
    <thead><tr>${t.head.map((h) => html`<th scope="col">${h}</th>`)}</tr></thead>
    <tbody>${t.rows.map((r) => html`<tr>${r.header === undefined ? nothing : html`<th scope="row">${r.header}</th>`}${r.cells.map((c) => html`<td>${c}</td>`)}</tr>`)}</tbody>
  </table>`;
}

/** The table of a chart whose data is `series` over `labels` (rows are the labels, columns the series). */
export function seriesTable(
  el: Element,
  caption: string,
  series: Array<{ name: string; values: number[] }>,
  labels: string[],
): ChartTable | null {
  if (series.length === 0) return null;
  const n = tableNumbers(el);
  const rowCount = Math.max(...series.map((s) => s.values.length));
  const rows = [];
  for (let i = 0; i < rowCount; i++) {
    rows.push({ header: labels[i] ?? String(i + 1), cells: series.map((s) => n.number(s.values[i] as number)) });
  }
  return { caption, head: [msg(el, 'chart.label'), ...series.map((s) => s.name)], rows };
}

/** The table of named parts of a whole (donut segments, gauge segments): name, value and share. */
export function segmentsTable(
  el: Element,
  caption: string,
  segments: Array<{ name: string; value: number }>,
): ChartTable | null {
  if (segments.length === 0) return null;
  const n = tableNumbers(el);
  const fin = (v: number) => (Number.isFinite(v) ? v : 0);
  const total = segments.reduce((s, x) => s + fin(x.value), 0);
  return {
    caption,
    head: [msg(el, 'chart.segment'), msg(el, 'chart.value'), msg(el, 'chart.share')],
    rows: segments.map((s) => ({ header: s.name, cells: [n.number(s.value), total > 0 ? n.percent(fin(s.value) / total) : '–'] })),
  };
}
