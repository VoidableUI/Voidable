import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';
import { argTypesFor } from '../.storybook/manifest';

const meta: Meta = {
  title: 'Charts/Bar Chart',
  argTypes: argTypesFor('void-bar-chart'),
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Animated SVG bar chart with staggered entrance, multi-series support, and theme-driven colors. All durations scale with --void-anim-scale.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => html`
    <void-bar-chart
      style="max-width: 600px;"
      aria-label="Daily request volume"
      .data=${{
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        series: [{ name: 'Requests', values: [1200, 1850, 1620, 2100, 1980, 1450, 1100] }],
      }}
    ></void-bar-chart>
  `,
};

export const WithValues: Story = {
  render: () => html`
    <void-bar-chart
      show-value
      style="max-width: 600px;"
      .data=${{
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        series: [{ name: 'Revenue', values: [42000, 51000, 48500, 67200] }],
      }}
    ></void-bar-chart>
  `,
};

export const MultiSeries: Story = {
  render: () => html`
    <void-bar-chart
      style="max-width: 600px;"
      aria-label="Quarterly metrics by region"
      .data=${{
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        series: [
          { name: 'North', values: [220, 280, 310, 350] },
          { name: 'South', values: [180, 200, 240, 270] },
          { name: 'East',  values: [140, 170, 200, 230] },
        ],
      }}
    ></void-bar-chart>
  `,
};

export const NoStagger: Story = {
  render: () => html`
    <void-bar-chart
      stagger="0"
      show-value
      style="max-width: 600px;"
      .data=${{
        labels: ['A', 'B', 'C', 'D', 'E'],
        series: [{ name: 'Value', values: [30, 80, 45, 65, 50] }],
      }}
    ></void-bar-chart>
  `,
};

export const CustomStagger: Story = {
  render: () => html`
    <void-bar-chart
      stagger="150"
      show-value
      style="max-width: 600px;"
      .data=${{
        labels: ['A', 'B', 'C', 'D', 'E'],
        series: [{ name: 'Value', values: [30, 80, 45, 65, 50] }],
      }}
    ></void-bar-chart>
  `,
};

export const Dramatic: Story = {
  render: () => html`
    <void-bar-chart
      show-value
      style="max-width: 600px; --void-anim-scale: 2;"
      aria-label="Slow animation demo"
      .data=${{
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
        series: [{ name: 'Users', values: [240, 380, 520, 690, 820] }],
      }}
    ></void-bar-chart>
  `,
};

export const Variants: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Three styling tokens: `filled` (solid, default), `outline` (tinted fill + border), `wireframe` (border only). Wireframe replaces the legacy `ghost` variant for charts.',
      },
    },
  },
  render: () => {
    const sampleData = {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      series: [{ name: 'Requests', values: [1200, 1850, 1620, 2100, 1980] }],
    };
    return html`
      <div style="display: flex; flex-direction: column; gap: var(--void-space-8); max-width: 600px;">
        <div>
          <div style="font-family: var(--void-font-mono); font-size: var(--void-text-2xs); text-transform: uppercase; letter-spacing: var(--void-tracking-widest); color: var(--void-color-text-muted); margin-bottom: var(--void-space-2);">filled</div>
          <void-bar-chart variant="filled" .data=${sampleData} aria-label="Filled variant"></void-bar-chart>
        </div>
        <div>
          <div style="font-family: var(--void-font-mono); font-size: var(--void-text-2xs); text-transform: uppercase; letter-spacing: var(--void-tracking-widest); color: var(--void-color-text-muted); margin-bottom: var(--void-space-2);">outline</div>
          <void-bar-chart variant="outline" .data=${sampleData} aria-label="Outline variant"></void-bar-chart>
        </div>
        <div>
          <div style="font-family: var(--void-font-mono); font-size: var(--void-text-2xs); text-transform: uppercase; letter-spacing: var(--void-tracking-widest); color: var(--void-color-text-muted); margin-bottom: var(--void-space-2);">wireframe</div>
          <void-bar-chart variant="wireframe" .data=${sampleData} aria-label="Wireframe variant"></void-bar-chart>
        </div>
      </div>
    `;
  },
};

export const PerBarColors: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Per-bar coloring via `series.colors[]` — useful for highlighting specific data points or encoding categorical state per bar (e.g. healthy vs warning vs critical thresholds).',
      },
    },
  },
  render: () => html`
    <void-bar-chart
      show-value
      style="max-width: 600px;"
      aria-label="Per-bar coloring example"
      .data=${{
        labels: ['p50', 'p75', 'p90', 'p95', 'p99'],
        series: [{
          name: 'Latency (ms)',
          values: [42, 68, 145, 320, 890],
          colors: [
            'var(--void-color-success)',
            'var(--void-color-success)',
            'var(--void-color-warning)',
            'var(--void-color-warning)',
            'var(--void-color-error)',
          ],
        }],
      }}
    ></void-bar-chart>
  `,
};

export const SharpShape: Story = {
  parameters: {
    docs: {
      description: {
        story: 'The bar corner radius references `--void-radius-sm` from the theme. Setting `data-shape="sharp"` on a parent (or `<html>`) zeroes all radius tokens — bars become squared.',
      },
    },
  },
  render: () => html`
    <div data-shape="sharp" style="max-width: 600px;">
      <void-bar-chart
        show-value
        aria-label="Sharp-cornered bars"
        .data=${{
          labels: ['Q1', 'Q2', 'Q3', 'Q4'],
          series: [{ name: 'Revenue', values: [42, 51, 48, 67] }],
        }}
      ></void-bar-chart>
    </div>
  `,
};

export const WithZeroValues: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Bars at value 0 render as flat baseline marks — no height, but the label still appears at "0" and the category position is preserved. Useful for confirming gaps in data don\'t silently disappear (the missing data should be a visible "0", not an invisible omission).',
      },
    },
  },
  render: () => html`
    <void-bar-chart
      show-value
      style="max-width: 600px;"
      aria-label="Daily error count with zero days"
      .data=${{
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        series: [{ name: 'Errors', values: [4, 0, 7, 2, 0, 0, 5] }],
      }}
    ></void-bar-chart>
  `,
};

export const NegativeValues: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Negative values are bars below a zero baseline: the value axis reaches the lowest value, a baseline is drawn at zero and `show-value` prints a negative value under its bar.',
      },
    },
  },
  render: () => html`
    <void-bar-chart
      show-value
      style="max-width: 600px;"
      aria-label="Net change per quarter: Q1 +40, Q2 -25, Q3 +10, Q4 -5"
      .data=${{
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        series: [{ name: 'Net', values: [40, -25, 10, -5] }],
      }}
    ></void-bar-chart>
  `,
};

export const FromMarkup: Story = {
  parameters: {
    docs: {
      description: {
        story: 'The data is the JSON `data` attribute, so server-rendered HTML draws the chart with no script and no property. The attribute is not rewritten when the property is set, and an attribute a server morph leaves unchanged does not animate the chart again. Invalid JSON draws nothing and is reported by `@voidable/ui/dev`.',
      },
    },
  },
  render: () => html`
    <void-bar-chart
      style="max-width: 600px;"
      aria-label="Revenue by quarter"
      data='{"labels":["Q1","Q2","Q3","Q4"],"series":[{"name":"Revenue","values":[42000,51000,48500,67200]}]}'
    ></void-bar-chart>
  `,
};

export const WithTable: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Every chart carries a visually hidden data table, captioned with `aria-label`, for screen readers (the drawing is `aria-hidden`). `show-table` shows it below the chart too: one row per category, one column per series.',
      },
    },
  },
  render: () => html`
    <void-bar-chart
      show-table
      style="max-width: 600px;"
      aria-label="Quarterly metrics by region"
      .data=${{
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        series: [
          { name: 'North', values: [220, 280, 310, 350] },
          { name: 'South', values: [180, 200, 240, 270] },
        ],
      }}
    ></void-bar-chart>
  `,
};
