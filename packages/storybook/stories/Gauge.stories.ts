import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';
import { argTypesFor } from '../.storybook/manifest';

const meta: Meta = {
  title: 'Charts/Gauge',
  argTypes: argTypesFor('void-gauge'),
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Animated arc gauge with optional segment breakdowns, zone-based threshold coloring, and three arc shapes (triple, semi, full). All durations scale with --void-anim-scale.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => html`
    <void-gauge
      value="67"
      unit="%"

      circular="triple"
      aria-label="CPU usage: 67%"
      style="max-width: 320px;"
    ></void-gauge>
  `,
};

export const UnitInline: Story = {
  parameters: {
    docs: {
      description: {
        story: 'The `unit-inline` attribute renders the unit on the same baseline as the value (e.g. "67%") instead of stacking it on the line below. Short units like `%`, `°`, or `°C` look much better inline — stacking puts them in a tiny separate line that feels disconnected from the number.',
      },
    },
  },
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(2, max-content); gap: var(--void-space-6) var(--void-space-8);">
      <div>
        <div style="font-family: var(--void-font-mono); font-size: var(--void-text-2xs); text-transform: uppercase; letter-spacing: var(--void-tracking-widest); color: var(--void-color-text-muted); margin-bottom: var(--void-space-2);">stacked (default)</div>
        <void-gauge value="67" unit="%" circular="triple" style="max-width: 240px;" aria-label="Stacked unit"></void-gauge>
      </div>
      <div>
        <div style="font-family: var(--void-font-mono); font-size: var(--void-text-2xs); text-transform: uppercase; letter-spacing: var(--void-tracking-widest); color: var(--void-color-text-muted); margin-bottom: var(--void-space-2);">inline</div>
        <void-gauge value="67" unit="%" unit-inline circular="triple" style="max-width: 240px;" aria-label="Inline unit"></void-gauge>
      </div>
      <div>
        <div style="font-family: var(--void-font-mono); font-size: var(--void-text-2xs); text-transform: uppercase; letter-spacing: var(--void-tracking-widest); color: var(--void-color-text-muted); margin-bottom: var(--void-space-2);">inline with °C</div>
        <void-gauge value="22" unit="°C" unit-inline min="-10" max="40" circular="triple" style="max-width: 240px;" aria-label="Temperature"></void-gauge>
      </div>
      <div>
        <div style="font-family: var(--void-font-mono); font-size: var(--void-text-2xs); text-transform: uppercase; letter-spacing: var(--void-tracking-widest); color: var(--void-color-text-muted); margin-bottom: var(--void-space-2);">stacked with GB (longer unit)</div>
        <void-gauge value="42" unit="GB" max="100" circular="triple" style="max-width: 240px;" aria-label="Storage"></void-gauge>
      </div>
    </div>
  `,
};

export const FullCircle: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Full 360° sweep — behaves like a progress ring. Useful for storage or quota indicators.',
      },
    },
  },
  render: () => html`
    <void-gauge
      value="42"
      unit="GB"
      min="0"
      max="100"

      circular="full"
      aria-label="Storage used: 42 GB of 100 GB"
      style="max-width: 320px;"
    ></void-gauge>
  `,
};

export const Semicircle: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Half-circle gauge — classic speedometer style. The viewBox clips the bottom half, so the component is more compact vertically.',
      },
    },
  },
  render: () => html`
    <void-gauge
      value="85"
      unit="%"
      min="0"
      max="100"

      circular="semi"
      aria-label="Load: 85%"
      style="max-width: 320px;"
    ></void-gauge>
  `,
};

export const WithZones: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Zone threshold coloring: the value-fill color is determined by which zone the current value falls into, while *all* zones — covered or not — are visible as 25%-opacity bands on the empty portion of the track. Compare gauges at different values to see what an uncovered zone looks like (it stays as a tinted band, visible through the empty track). Zones are mutually exclusive with segments.',
      },
    },
  },
  render: () => {
    const zones = [
      { from: 0,  to: 60,  color: 'var(--void-color-success)' },
      { from: 60, to: 85,  color: 'var(--void-color-warning)' },
      { from: 85, to: 100, color: 'var(--void-color-error)'   },
    ];
    const tile = (label: string, value: number) => html`
      <div>
        <div style="font-family: var(--void-font-mono); font-size: var(--void-text-2xs); text-transform: uppercase; letter-spacing: var(--void-tracking-widest); color: var(--void-color-text-muted); margin-bottom: var(--void-space-2);">${label}</div>
        <void-gauge
          .value=${value}
          unit="%"
          min="0"
          max="100"

          circular="triple"
          aria-label="Value ${value}%"
          style="max-width: 260px;"
          .zones=${zones}
        ></void-gauge>
      </div>
    `;
    return html`
      <div style="display: grid; grid-template-columns: repeat(2, max-content); gap: var(--void-space-8) var(--void-space-10); align-items: start;">
        ${tile('15% — comfortably in safe zone', 15)}
        ${tile('52% — still safe, two zones uncovered above', 52)}
        ${tile('72% — into warning, only error uncovered', 72)}
        ${tile('92% — critical, all zones covered', 92)}
      </div>
    `;
  },
};

export const WithSegments: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Segments subdivide the filled arc into individually colored bands. Hover a segment to see its name, value, and percentage via native SVG <title> tooltip.',
      },
    },
  },
  render: () => html`
    <void-gauge
      unit="$"
      min="0"
      max="50000"

      circular="triple"
      aria-label="Monthly sales target: $50k"
      style="max-width: 320px;"
      .data=${{
        value: 43000,
        segments: [
          { name: 'Hardware', value: 18000, color: 'var(--void-color-info)'    },
          { name: 'Software', value: 14000, color: 'var(--void-color-success)' },
          { name: 'Services', value: 11000, color: 'var(--void-color-warning)' },
        ],
      }}
    ></void-gauge>
  `,
};

export const Variants: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Three styling variants: `filled` (default, full-opacity stroke), `outline` (70% opacity for a tinted feel), `wireframe` (1.5px thin stroke).',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: var(--void-space-8); max-width: 320px;">
      <div>
        <div style="font-family: var(--void-font-mono); font-size: var(--void-text-2xs); text-transform: uppercase; letter-spacing: var(--void-tracking-widest); color: var(--void-color-text-muted); margin-bottom: var(--void-space-2);">filled</div>
        <void-gauge value="67" unit="%" variant="filled" aria-label="Filled variant"></void-gauge>
      </div>
      <div>
        <div style="font-family: var(--void-font-mono); font-size: var(--void-text-2xs); text-transform: uppercase; letter-spacing: var(--void-tracking-widest); color: var(--void-color-text-muted); margin-bottom: var(--void-space-2);">outline</div>
        <void-gauge value="67" unit="%" variant="outline" aria-label="Outline variant"></void-gauge>
      </div>
      <div>
        <div style="font-family: var(--void-font-mono); font-size: var(--void-text-2xs); text-transform: uppercase; letter-spacing: var(--void-tracking-widest); color: var(--void-color-text-muted); margin-bottom: var(--void-space-2);">wireframe</div>
        <void-gauge value="67" unit="%" variant="wireframe" aria-label="Wireframe variant"></void-gauge>
      </div>
    </div>
  `,
};

export const Gaps: Story = {
  parameters: {
    docs: {
      description: {
        story: 'The `gaps` prop controls whitespace between segment bands within the filled portion of the arc. `false` = seamless, `true` = 1% sensible default, number = explicit % of the filled arc. Higher % = clearer segmentation but more arc sacrificed — the precision-vs-clarity tradeoff. Sharp/curvy does NOT apply to gauges since they\'re inherently arc shapes.',
      },
    },
  },
  render: () => {
    const data = {
      value: 75,
      segments: [
        { name: 'Alpha', value: 35, color: 'var(--void-color-info)'    },
        { name: 'Beta',  value: 25, color: 'var(--void-color-success)' },
        { name: 'Gamma', value: 15, color: 'var(--void-color-warning)' },
      ],
    };
    const tile = (label: string, gaps: string | boolean | number) => html`
      <div>
        <div style="font-family: var(--void-font-mono); font-size: var(--void-text-2xs); text-transform: uppercase; letter-spacing: var(--void-tracking-widest); color: var(--void-color-text-muted); margin-bottom: var(--void-space-2);">${label}</div>
        <void-gauge
          unit="%"
          min="0"
          max="100"

          circular="triple"
          thickness="18"
          gaps=${gaps as never}
          style="max-width: 240px;"
          aria-label="Gauge with gaps=${label}"
          .data=${data}
        ></void-gauge>
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
        story: 'Slowing the animation scale to 2× reveals the full sweep + value tick-up sequence. Segments each interpolate independently from zero.',
      },
    },
  },
  render: () => html`
    <void-gauge
      unit="$"
      min="0"
      max="50000"

      circular="triple"
      aria-label="Dramatic slow-motion gauge"
      style="max-width: 320px; --void-anim-scale: 2;"
      .data=${{
        value: 43000,
        segments: [
          { name: 'Hardware', value: 18000, color: 'var(--void-color-info)'    },
          { name: 'Software', value: 14000, color: 'var(--void-color-success)' },
          { name: 'Services', value: 11000, color: 'var(--void-color-warning)' },
        ],
      }}
    ></void-gauge>
  `,
};

export const Speedometer: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Speedometer-style gauge: `tick-major` and `tick-minor` add tick marks inside the band. The end ticks are always drawn as major markers (add `hide-tick-min` or `hide-tick-max` to leave one out) — useful when the major interval doesn\'t evenly divide the range. Each tile uses an explicit `zones` setup so the value-fill color is visible in all three variant stories below.',
      },
    },
  },
  render: () => speedoGrid('filled'),
};

type SpeedoConfig = {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  tickMajor?: number;
  tickMinor?: number;
  circular: 'full' | 'semi' | 'triple';
  unitInline?: boolean;
  zones: Array<{ from: number; to: number; color: string }>;
};

const speedoData: SpeedoConfig[] = [
  {
    label: 'major=25, minor=5 (info)',
    value: 62, unit: '%', min: 0, max: 100,
    tickMajor: 25, tickMinor: 5, unitInline: true, circular: 'triple',
    zones: [{ from: 0, to: 100, color: 'var(--void-color-info)' }],
  },
  {
    label: 'major=20, minor=4 (success)',
    value: 85, unit: 'mph', min: 0, max: 160,
    tickMajor: 20, tickMinor: 4, circular: 'semi',
    zones: [{ from: 0, to: 160, color: 'var(--void-color-success)' }],
  },
  {
    label: 'major only (warning)',
    value: 45, unit: '%', min: 0, max: 100,
    tickMajor: 10, unitInline: true, circular: 'triple',
    zones: [{ from: 0, to: 100, color: 'var(--void-color-warning)' }],
  },
  {
    label: 'thresholds (success/warning/error)',
    value: 78, unit: '%', min: 0, max: 100,
    tickMajor: 25, tickMinor: 5, unitInline: true, circular: 'triple',
    zones: [
      { from: 0,  to: 60,  color: 'var(--void-color-success)' },
      { from: 60, to: 85,  color: 'var(--void-color-warning)' },
      { from: 85, to: 100, color: 'var(--void-color-error)'   },
    ],
  },
];

function speedoGrid(variant: 'filled' | 'outline' | 'wireframe') {
  return html`
    <div style="display: grid; grid-template-columns: repeat(2, max-content); gap: var(--void-space-6) var(--void-space-8);">
      ${speedoData.map(cfg => html`
        <div>
          <div style="font-family: var(--void-font-mono); font-size: var(--void-text-2xs); text-transform: uppercase; letter-spacing: var(--void-tracking-widest); color: var(--void-color-text-muted); margin-bottom: var(--void-space-2);">${cfg.label}</div>
          <void-gauge
            variant=${variant}

            style="max-width: 280px;"
            value=${String(cfg.value)}
            unit=${cfg.unit}
            min=${String(cfg.min)}
            max=${String(cfg.max)}
            tick-major=${cfg.tickMajor ?? 0}
            tick-minor=${cfg.tickMinor ?? 0}
            ?unit-inline=${!!cfg.unitInline}
            circular=${cfg.circular}
            aria-label="${cfg.label}"
            .zones=${cfg.zones}
          ></void-gauge>
        </div>
      `)}
    </div>
  `;
}

export const SpeedometerOutline: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Same four speedometer configurations as the `Speedometer` story, rendered with the `outline` variant — 14% tinted fill + hairline border on the value-fill arc. Ticks render at full opacity on top of the empty track so they remain readable.',
      },
    },
  },
  render: () => speedoGrid('outline'),
};

export const SpeedometerWireframe: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Same four speedometer configurations rendered with the `wireframe` variant — thin (1.5px) stroke on the value arc with no fill. The lightest possible weight, useful for densely-populated dashboards.',
      },
    },
  },
  render: () => speedoGrid('wireframe'),
};

export const FromMarkup: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Segments and colour bands are JSON attributes, `data` and `zones`, so server-rendered HTML draws the gauge with no script and no property. They are not rewritten when the properties are set, and an attribute a server morph leaves unchanged does not animate the gauge again.',
      },
    },
  },
  render: () => html`
    <void-gauge
      value="72"
      unit="%"
      circular="semi"
      aria-label="Disk usage"
      zones='[{"from":0,"to":60,"color":"var(--void-color-success)"},{"from":60,"to":85,"color":"var(--void-color-warning)"},{"from":85,"to":100,"color":"var(--void-color-error)"}]'
    ></void-gauge>
  `,
};

export const WithTable: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Every gauge carries a visually hidden data table, captioned with `aria-label`, for screen readers (the drawing is `aria-hidden`). `show-table` shows it too: the reading with its range, or one row per segment.',
      },
    },
  },
  render: () => html`
    <div style="display: flex; gap: var(--void-space-8); flex-wrap: wrap;">
      <void-gauge show-table value="72" unit="%" aria-label="Disk usage"></void-gauge>
      <void-gauge show-table aria-label="Memory" data='{"segments":[{"name":"Used","value":30},{"name":"Cache","value":20}]}'></void-gauge>
    </div>
  `,
};
