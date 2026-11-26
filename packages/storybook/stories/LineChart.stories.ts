import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';
import { argTypesFor } from '../.storybook/manifest';

const meta: Meta = {
  title: 'Charts/Line Chart',
  argTypes: argTypesFor('void-line-chart'),
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Animated SVG line chart with left-to-right entrance reveal, multi-series support, area fill variants, and theme-driven colors. All durations scale with --void-anim-scale.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => html`
    <void-line-chart
      style="max-width: 600px;"
      aria-label="Daily request volume"
      .data=${{
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        series: [{ name: 'Requests', values: [1200, 1850, 1620, 2100, 1980, 1450, 1100] }],
      }}
    ></void-line-chart>
  `,
};

export const WithValues: Story = {
  render: () => html`
    <void-line-chart
      show-value
      style="max-width: 600px;"
      aria-label="Quarterly revenue"
      .data=${{
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        series: [{ name: 'Revenue', values: [42000, 51000, 48500, 67200] }],
      }}
    ></void-line-chart>
  `,
};

export const MultiSeries: Story = {
  render: () => html`
    <void-line-chart
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
    ></void-line-chart>
  `,
};

export const Stepped: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Step interpolation renders the line as a staircase — each value holds horizontally until the next data point.',
      },
    },
  },
  render: () => html`
    <void-line-chart
      interpolation="step"
      style="max-width: 600px;"
      aria-label="Step interpolation demo"
      .data=${{
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        series: [{ name: 'Events', values: [5, 12, 8, 20, 15, 9, 3] }],
      }}
    ></void-line-chart>
  `,
};

export const Variants: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Three styling tokens: `outline` (line + soft area shade, default), `filled` (line + strong area emphasis), `wireframe` (stroke-only, no area fill).',
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
          <void-line-chart variant="filled" .data=${sampleData} aria-label="Filled variant"></void-line-chart>
        </div>
        <div>
          <div style="font-family: var(--void-font-mono); font-size: var(--void-text-2xs); text-transform: uppercase; letter-spacing: var(--void-tracking-widest); color: var(--void-color-text-muted); margin-bottom: var(--void-space-2);">outline</div>
          <void-line-chart variant="outline" .data=${sampleData} aria-label="Outline variant"></void-line-chart>
        </div>
        <div>
          <div style="font-family: var(--void-font-mono); font-size: var(--void-text-2xs); text-transform: uppercase; letter-spacing: var(--void-tracking-widest); color: var(--void-color-text-muted); margin-bottom: var(--void-space-2);">wireframe</div>
          <void-line-chart variant="wireframe" .data=${sampleData} aria-label="Wireframe variant"></void-line-chart>
        </div>
      </div>
    `;
  },
};

export const Dramatic: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Entrance reveal at 2× animation scale with filled area and value labels — the slow left-to-right sweep makes the area build visible.',
      },
    },
  },
  render: () => html`
    <void-line-chart
      variant="filled"
      show-value
      style="max-width: 600px; --void-anim-scale: 2;"
      aria-label="Slow animation demo"
      .data=${{
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
        series: [{ name: 'Users', values: [240, 380, 520, 690, 820] }],
      }}
    ></void-line-chart>
  `,
};

export const Hover: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Mouse over the chart to see a dashed vertical hairline marking the x-axis position, colored marker boxes at each series\' point, and a tooltip with the exact value per series. The tooltip flips left when it would clip the right edge.',
      },
    },
  },
  render: () => html`
    <void-line-chart
      style="max-width: 600px;"
      aria-label="Hover demo with three series"
      .data=${{
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
        series: [
          { name: 'Requests', values: [1200, 1850, 1620, 2100, 1980, 2240, 2480] },
          { name: 'Errors',   values: [120, 95, 140, 80, 60, 45, 30] },
          { name: 'P95 (ms)', values: [42, 38, 51, 47, 35, 33, 29] },
        ],
      }}
    ></void-line-chart>
  `,
};

export const SharpShape: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Lines default to rounded stroke joins (curvy). Setting `data-shape="sharp"` on a parent (or `<html>`) switches to mitered joins for a harder, more technical look.',
      },
    },
  },
  render: () => html`
    <div data-shape="sharp" style="max-width: 600px;">
      <void-line-chart
        aria-label="Sharp-jointed line"
        .data=${{
          labels: ['Q1', 'Q2', 'Q3', 'Q4'],
          series: [{ name: 'Revenue', values: [42, 51, 48, 67] }],
        }}
      ></void-line-chart>
    </div>
  `,
};
