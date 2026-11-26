import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';
import { argTypesFor } from '../.storybook/manifest';

const meta: Meta = {
  title: 'Charts/Donut Chart',
  argTypes: argTypesFor('void-donut-chart'),
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Animated SVG donut (or pie) chart with a clockwise-sweep entrance, segment variants, and theme-driven colors. All durations scale with --void-anim-scale.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => html`
    <void-donut-chart
      style="width: 220px; height: 220px;"
      aria-label="Traffic sources"
      .data=${{
        segments: [
          { name: 'Organic',   value: 4820 },
          { name: 'Referral',  value: 2310 },
          { name: 'Direct',    value: 1950 },
          { name: 'Paid',      value: 980  },
        ],
      }}
    ></void-donut-chart>
  `,
};

export const Pie: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Setting `inner="0"` removes the hole, producing a traditional pie chart. `arcPath` handles the center-spoke wedge formula automatically.',
      },
    },
  },
  render: () => html`
    <void-donut-chart
      inner="0"
      style="width: 220px; height: 220px;"
      aria-label="Status code distribution"
      .data=${{
        segments: [
          { name: '2xx', value: 8400 },
          { name: '3xx', value: 620  },
          { name: '4xx', value: 310  },
          { name: '5xx', value: 85   },
        ],
      }}
    ></void-donut-chart>
  `,
};

export const WithTotal: Story = {
  parameters: {
    docs: {
      description: {
        story: 'The `show-total` attribute renders the summed value as a large label inside the donut hole. The number ticks up during the entrance animation.',
      },
    },
  },
  render: () => html`
    <void-donut-chart
      show-total
      style="width: 220px; height: 220px;"
      aria-label="Server categories by request count"
      .data=${{
        segments: [
          { name: 'API',       value: 12400 },
          { name: 'Static',    value: 5800  },
          { name: 'CDN',       value: 3200  },
          { name: 'Websocket', value: 1100  },
        ],
      }}
    ></void-donut-chart>
  `,
};

export const WithValues: Story = {
  parameters: {
    docs: {
      description: {
        story: 'The `show-value` attribute overlays each segment\'s value at the arc midpoint.',
      },
    },
  },
  render: () => html`
    <void-donut-chart
      show-value
      gaps="2"
      style="width: 260px; height: 260px;"
      aria-label="Incident types"
      .data=${{
        segments: [
          { name: 'Timeout',  value: 540 },
          { name: 'Error',    value: 280 },
          { name: 'Degraded', value: 190 },
          { name: 'Resolved', value: 90  },
        ],
      }}
    ></void-donut-chart>
  `,
};

export const CustomColors: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Segments accept an explicit `color` that overrides the rotating palette. Use theme color tokens or hex values.',
      },
    },
  },
  render: () => html`
    <void-donut-chart
      show-total
      style="width: 220px; height: 220px;"
      aria-label="Deployment health"
      .data=${{
        segments: [
          { name: 'Healthy',  value: 74, color: 'var(--void-color-success)' },
          { name: 'Warning',  value: 18, color: 'var(--void-color-warning)' },
          { name: 'Critical', value: 8,  color: 'var(--void-color-error)'   },
        ],
      }}
    ></void-donut-chart>
  `,
};

export const Variants: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Three styling tokens: `filled` (solid, default), `outline` (tinted fill + stroke border), `wireframe` (stroke only, no fill).',
      },
    },
  },
  render: () => {
    const sampleData = {
      segments: [
        { name: 'Alpha', value: 420 },
        { name: 'Beta',  value: 310 },
        { name: 'Gamma', value: 180 },
        { name: 'Delta', value: 90  },
      ],
    };
    return html`
      <div style="display: flex; flex-direction: column; gap: var(--void-space-8);">
        <div>
          <div style="font-family: var(--void-font-mono); font-size: var(--void-text-2xs); text-transform: uppercase; letter-spacing: var(--void-tracking-widest); color: var(--void-color-text-muted); margin-bottom: var(--void-space-2);">filled</div>
          <void-donut-chart variant="filled" style="width: 180px; height: 180px;" .data=${sampleData} aria-label="Filled variant"></void-donut-chart>
        </div>
        <div>
          <div style="font-family: var(--void-font-mono); font-size: var(--void-text-2xs); text-transform: uppercase; letter-spacing: var(--void-tracking-widest); color: var(--void-color-text-muted); margin-bottom: var(--void-space-2);">outline</div>
          <void-donut-chart variant="outline" style="width: 180px; height: 180px;" .data=${sampleData} aria-label="Outline variant"></void-donut-chart>
        </div>
        <div>
          <div style="font-family: var(--void-font-mono); font-size: var(--void-text-2xs); text-transform: uppercase; letter-spacing: var(--void-tracking-widest); color: var(--void-color-text-muted); margin-bottom: var(--void-space-2);">wireframe</div>
          <void-donut-chart variant="wireframe" style="width: 180px; height: 180px;" .data=${sampleData} aria-label="Wireframe variant"></void-donut-chart>
        </div>
      </div>
    `;
  },
};

export const Gaps: Story = {
  parameters: {
    docs: {
      description: {
        story: 'The `gaps` prop controls visible whitespace between segments. `false`/`0` = seamless (segments touch). `true` = 1% (sensible default). A number = explicit percent of the total arc consumed by gaps — the precision-vs-clarity tradeoff. Sharp/curvy does NOT apply to donuts since they\'re inherently circular.',
      },
    },
  },
  render: () => {
    const sampleData = {
      segments: [
        { name: 'Compute', value: 380 },
        { name: 'Storage', value: 260 },
        { name: 'Network', value: 200 },
        { name: 'Other',   value: 80  },
      ],
    };
    const tile = (label: string, gaps: string | boolean | number) => html`
      <div>
        <div style="font-family: var(--void-font-mono); font-size: var(--void-text-2xs); text-transform: uppercase; letter-spacing: var(--void-tracking-widest); color: var(--void-color-text-muted); margin-bottom: var(--void-space-2);">${label}</div>
        <void-donut-chart
          gaps=${gaps as never}
          style="width: 200px; height: 200px;"
          aria-label="Donut with gaps=${label}"
          .data=${sampleData}
        ></void-donut-chart>
      </div>
    `;
    return html`
      <div style="display: flex; flex-direction: column; gap: var(--void-space-6);">
        ${tile('false (seamless)', false)}
        ${tile('true (1%)', true)}
        ${tile('5% — visible separation', 5)}
        ${tile('15% — heavy gaps (precision sacrificed)', 15)}
      </div>
    `;
  },
};

export const Dramatic: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Entrance sweep at 2× animation scale with `show-total` — the slow clockwise reveal is the centrepiece of the donut\'s entrance animation.',
      },
    },
  },
  render: () => html`
    <void-donut-chart
      show-total
      style="width: 260px; height: 260px; --void-anim-scale: 2;"
      aria-label="Slow animation demo"
      .data=${{
        segments: [
          { name: 'Q1', value: 24000 },
          { name: 'Q2', value: 31500 },
          { name: 'Q3', value: 28800 },
          { name: 'Q4', value: 41200 },
        ],
      }}
    ></void-donut-chart>
  `,
};

export const SingleSegment: Story = {
  parameters: {
    docs: {
      description: {
        story: 'One segment at 100% is a closed ring: no seam at the top, and no gap even with `gaps` on.',
      },
    },
  },
  render: () => html`
    <void-donut-chart
      style="width: 220px; height: 220px;"
      aria-label="All traffic is organic"
      gaps="4"
      .data=${{ segments: [{ name: 'Organic', value: 4820 }] }}
    ></void-donut-chart>
  `,
};

export const FromMarkup: Story = {
  parameters: {
    docs: {
      description: {
        story: 'The data is the JSON `data` attribute, so server-rendered HTML draws the chart with no script and no property. The attribute is not rewritten when the property is set, and an attribute a server morph leaves unchanged does not animate the chart again.',
      },
    },
  },
  render: () => html`
    <void-donut-chart
      style="width: 220px; height: 220px;"
      aria-label="Traffic by source"
      data='{"segments":[{"name":"Search","value":540},{"name":"Direct","value":320},{"name":"Referral","value":180}]}'
    ></void-donut-chart>
  `,
};

export const WithTable: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Every chart carries a visually hidden data table, captioned with `aria-label`, for screen readers (the drawing is `aria-hidden`). `show-table` shows it below the chart too: one row per segment with its value and share.',
      },
    },
  },
  render: () => html`
    <void-donut-chart
      show-table
      style="width: 260px;"
      aria-label="Traffic by source"
      .data=${{ segments: [{ name: 'Search', value: 540 }, { name: 'Direct', value: 320 }, { name: 'Referral', value: 180 }] }}
    ></void-donut-chart>
  `,
};
