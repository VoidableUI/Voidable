import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Components/Table',
  component: 'void-table',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A native `<table>` that sits on the page: hairline dividers, uppercase labels, regular-weight values. `stack` turns each row into a block of label and value pairs while the table\'s container is narrow (the header text is the label), `scrollable` makes a table that stays tabular a labelled, focusable scroll region with faded edges, `inset` fits it inside a card or panel. Nothing is clipped unless you ask, so a menu opened from the last row is always visible.',
      },
    },
  },
  argTypes: {
    striped: { control: { type: 'boolean' } },
    hoverable: { control: { type: 'boolean' } },
    compact: { control: { type: 'boolean' } },
    bordered: { control: { type: 'boolean' } },
    inset: { control: { type: 'boolean' } },
    stack: {
      control: { type: 'text' },
      description: 'Empty (present) for the theme breakpoint, a CSS length such as `48rem`, or `always`. Absent: always a table.',
    },
    scrollable: { control: { type: 'boolean' } },
    stickyHeader: { control: { type: 'boolean' }, name: 'sticky-header' },
    stickyColumn: { control: { type: 'boolean' }, name: 'sticky-column' },
    maxHeight: { control: { type: 'text' }, name: 'max-height' },
    label: { control: { type: 'text' } },
  },
};

export default meta;
type Story = StoryObj;

const people = [
  ['Alice Morgan', 'Engineer', 'Active', 'Jan 2023'],
  ['Ben Okafor', 'Designer', 'Active', 'Mar 2023'],
  ['Clara Shen', 'Product', 'On leave', 'Jul 2022'],
  ['David Park', 'Engineer', 'Active', 'Nov 2023'],
  ['Eva Lindström', 'QA', 'Inactive', 'Feb 2021'],
];

const sampleTable = html`
  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Role</th>
        <th>Status</th>
        <th>Joined</th>
      </tr>
    </thead>
    <tbody>
      ${people.map(([name, role, status, joined]) => html`
        <tr><td>${name}</td><td>${role}</td><td>${status}</td><td>${joined}</td></tr>
      `)}
    </tbody>
  </table>
`;

// A table with every column role: a row checkbox, a title, labelled values, a numeric
// column, a column that drops out of the stacked block, and ghost row actions.
const stationsTable = html`
  <table>
    <thead>
      <tr>
        <th data-stack="select"><void-checkbox aria-label="Select all stations"></void-checkbox></th>
        <th data-stack="title">Station</th>
        <th>State</th>
        <th>Region</th>
        <th data-align="end">Passes</th>
        <th data-align="end" data-stack="hide">Uptime</th>
        <th data-stack="actions">Actions</th>
      </tr>
    </thead>
    <tbody>
      ${[
        ['Svalbard 1', 'online', 'Arctic', '212', '99.98%'],
        ['Tromsø 2', 'degraded', 'Arctic', '141', '97.40%'],
        ['Punta Arenas', 'online', 'Southern', '176', '99.91%'],
        ['Troll', 'offline', 'Southern', '0', '91.03%'],
      ].map(([name, state, region, passes, uptime]) => html`
        <tr>
          <td><void-checkbox aria-label="Select ${name}"></void-checkbox></td>
          <td>${name}</td>
          <td>${state}</td>
          <td>${region}</td>
          <td>${passes}</td>
          <td>${uptime}</td>
          <td>
            <void-button variant="ghost" size="sm">Open</void-button>
            <void-button variant="ghost" size="sm">Pause</void-button>
          </td>
        </tr>
      `)}
    </tbody>
  </table>
`;

// Wide enough to overflow any phone: twelve columns and a row menu at the end.
const wideColumns = ['Name', 'Role', 'Team', 'Location', 'Started', 'Level', 'Manager', 'Salary', 'Reviews', 'Projects', 'Tenure'];
const wideTable = html`
  <table>
    <thead>
      <tr>
        ${wideColumns.map((c) => html`<th>${c}</th>`)}
        <th data-stack="actions">Actions</th>
      </tr>
    </thead>
    <tbody>
      ${Array.from({ length: 8 }, (_, i) => html`
        <tr>
          ${wideColumns.map((c, j) => html`<td>${j === 0 ? `Person ${i + 1}` : `${c} ${i + 1}`}</td>`)}
          <td>
            <void-dropdown-menu position="bottom-end">
              <void-button slot="trigger" variant="ghost" size="sm" aria-label="Actions for person ${i + 1}">More</void-button>
              <void-dropdown-menu-item>Edit</void-dropdown-menu-item>
              <void-dropdown-menu-item>Duplicate</void-dropdown-menu-item>
              <void-dropdown-menu-item destructive>Delete</void-dropdown-menu-item>
            </void-dropdown-menu>
          </td>
        </tr>
      `)}
    </tbody>
  </table>
`;

export const Default: Story = {
  args: {
    striped: false,
    hoverable: false,
    compact: false,
    bordered: false,
    inset: false,
    scrollable: false,
  },
  render: (args) => html`
    <void-table
      ?striped=${args.striped}
      ?hoverable=${args.hoverable}
      ?compact=${args.compact}
      ?bordered=${args.bordered}
      ?inset=${args.inset}
      ?scrollable=${args.scrollable}
      label=${args.label || ''}
    >
      ${sampleTable}
    </void-table>
  `,
};

export const Striped: Story = {
  render: () => html`<void-table striped>${sampleTable}</void-table>`,
};

export const Hoverable: Story = {
  render: () => html`<void-table hoverable>${sampleTable}</void-table>`,
};

export const Compact: Story = {
  render: () => html`<void-table compact>${sampleTable}</void-table>`,
};

export const Bordered: Story = {
  render: () => html`<void-table bordered>${sampleTable}</void-table>`,
};

export const StripedAndHoverable: Story = {
  render: () => html`<void-table striped hoverable>${sampleTable}</void-table>`,
};

export const CompactBordered: Story = {
  render: () => html`<void-table compact bordered>${sampleTable}</void-table>`,
};

// ── Stacked presentation ────────────────────────────────────────────────────

const narrow = (width: string, content: unknown) => html`
  <div style="width: ${width}; max-width: 100%; border: 1px dashed var(--void-color-border); padding: 0 var(--void-space-2);">${content}</div>
`;

export const Stack: Story = {
  name: 'Stack (container width)',
  parameters: {
    docs: {
      description: {
        story:
          '`stack` turns every row into a block of label and value pairs while the table\'s own container is narrower than the breakpoint (40rem unless the theme sets `--void-table-stack-at`). The viewport is irrelevant: the same table is tabular in the wide box and stacked in the narrow one. The label is the text of the column\'s header cell, copied to the cells, so nothing is repeated on each row.',
      },
    },
  },
  render: () => html`
    <div style="display: grid; gap: var(--void-gap-section);">
      <div>
        <p data-void-type="label">Container 720px: a table</p>
        ${narrow('720px', html`<void-table stack hoverable>${sampleTable}</void-table>`)}
      </div>
      <div>
        <p data-void-type="label">Container 360px: stacked</p>
        ${narrow('360px', html`<void-table stack hoverable>${sampleTable}</void-table>`)}
      </div>
    </div>
  `,
};

export const StackColumnRoles: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '`data-stack` on a header cell sets what its column becomes in the stacked block: `title` is the block\'s heading (no label), `select` is a row checkbox beside it, `actions` groups buttons at the end, `hide` leaves the column out. `data-align="end"` right-aligns a numeric column in the table. Header cells that hold a control (select all, a sort button) stay visible above the blocks; the others stay in the page for assistive technology.',
      },
    },
  },
  render: () => narrow('380px', html`<void-table stack hoverable>${stationsTable}</void-table>`),
};

export const StackBreakpoint: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'A CSS length as the value sets the breakpoint for this table (`stack="30rem"`); a theme sets it for every table with `--void-table-stack-at`. The breakpoint is a container width, so a table in a sidebar stacks before the same table in the main column does.',
      },
    },
  },
  render: () => html`
    <div style="display: grid; gap: var(--void-gap-section);">
      <div>
        <p data-void-type="label">stack="30rem" (480px) in a 560px container: a table</p>
        ${narrow('560px', html`<void-table stack="30rem">${sampleTable}</void-table>`)}
      </div>
      <div>
        <p data-void-type="label">stack="30rem" in a 440px container: stacked</p>
        ${narrow('440px', html`<void-table stack="30rem">${sampleTable}</void-table>`)}
      </div>
    </div>
  `,
};

export const StackAlways: Story = {
  parameters: {
    docs: {
      description: { story: '`stack="always"` stacks at every width: a list of records that reads better as blocks even on a wide screen. Without the attribute a table is always a table.' },
    },
  },
  render: () => html`<void-table stack="always">${stationsTable}</void-table>`,
};

export const StackCellLabels: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The label is the header text unless you say otherwise: `data-label` on a header cell replaces it for the column (an empty one removes it), and `data-label` on a single cell wins over both. Server templates can write `data-label` on cells instead of relying on the component.',
      },
    },
  },
  render: () => narrow('360px', html`
    <void-table stack>
      <table>
        <thead>
          <tr><th data-stack="title">Name</th><th data-label="Job">Role</th><th>Status</th></tr>
        </thead>
        <tbody>
          <tr><td>Alice Morgan</td><td>Engineer</td><td>Active</td></tr>
          <tr><td>Ben Okafor</td><td>Designer</td><td data-label="Currently">On leave</td></tr>
        </tbody>
      </table>
    </void-table>
  `),
};

// ── Overflow ────────────────────────────────────────────────────────────────

export const Scrollable: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '`scrollable` makes the table a horizontal scroll region. It is focusable and named (by `label`, else the caption, else `aria-label`) only while it really overflows, so arrow keys scroll it, and its edges fade where there is more to see. Open the menu on the last row: while it is open the region makes room for it, so it is neither clipped nor scrolled away.',
      },
    },
  },
  render: () => html`
    <div style="width: 560px; max-width: 100%;">
      <void-table scrollable label="People">${wideTable}</void-table>
    </div>
    <p data-void-type="caption" style="margin-block-start: var(--void-space-4);">This paragraph follows the table, in the space the open menu borrows.</p>
  `,
};

export const StickyHeader: Story = {
  parameters: {
    docs: {
      description: {
        story: '`sticky-header` keeps the header row in view. With `max-height` the table scrolls vertically inside its region (and horizontally), which is what the header sticks to. Without it the header sticks to the page, below `--void-table-sticky-top`.',
      },
    },
  },
  render: () => html`
    <div style="width: 560px; max-width: 100%;">
      <void-table scrollable sticky-header max-height="14rem" label="People">${wideTable}</void-table>
    </div>
  `,
};

export const StickyColumn: Story = {
  parameters: {
    docs: { description: { story: '`sticky-column` keeps the first column in view while the table scrolls sideways; a hairline marks its edge once content slides under it.' } },
  },
  render: () => html`
    <div style="width: 560px; max-width: 100%;">
      <void-table scrollable sticky-column hoverable label="People">${wideTable}</void-table>
    </div>
  `,
};

export const StickyHeaderAndColumn: Story = {
  render: () => html`
    <div style="width: 560px; max-width: 100%;">
      <void-table scrollable sticky-header sticky-column max-height="14rem" striped label="People">${wideTable}</void-table>
    </div>
  `,
};

export const ScrollableOrStacked: Story = {
  name: 'Stacked when narrow, scrolling when not',
  parameters: {
    docs: {
      description: {
        story: '`stack` and `scrollable` combine: below the breakpoint the rows stack; above it a table too wide for its container scrolls instead of overflowing the page.',
      },
    },
  },
  render: () => html`
    <div style="display: grid; gap: var(--void-gap-section);">
      ${narrow('420px', html`<void-table stack scrollable label="People">${wideTable}</void-table>`)}
      ${narrow('720px', html`<void-table stack="30rem" scrollable label="People">${wideTable}</void-table>`)}
    </div>
  `,
};

// ── Inset and density ───────────────────────────────────────────────────────

export const Inset: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '`inset` is for a table inside a card or panel. It bleeds out of the container\'s padding so dividers and hover fills run to the container\'s edge, and pads its first and last columns back in so text stays on the container\'s content edge: no padding doubling.',
      },
    },
  },
  render: () => html`
    <div style="display: grid; gap: var(--void-gap-section); max-width: 720px;">
      <void-card heading="Inset table">
        <void-table inset hoverable stack>${stationsTable}</void-table>
      </void-card>
      <void-panel>
        <void-table inset hoverable>${sampleTable}</void-table>
      </void-panel>
    </div>
  `,
};

export const Density: Story = {
  parameters: {
    docs: {
      description: { story: 'Cell padding, the stacked block spacing and the actions follow the theme\'s `--void-density` knob: the same markup at 0.75, 1 and 1.25.' },
    },
  },
  render: () => html`
    <div style="display: grid; gap: var(--void-gap-section);">
      ${[0.75, 1, 1.25].map((d) => html`
        <div data-void-theme="void" style="--void-density: ${d}; background: transparent;">
          <p data-void-type="label">density ${d}</p>
          <void-table hoverable>${sampleTable}</void-table>
        </div>
      `)}
    </div>
  `,
};

export const SelectionInBothPresentations: Story = {
  name: 'Selection works in both presentations',
  parameters: {
    docs: {
      description: { story: 'Checkboxes in cells are ordinary controls: they keep their state and their keyboard access when the table stacks, and the select-all checkbox in the header stays visible above the blocks.' },
    },
  },
  render: () => html`
    <div style="display: grid; gap: var(--void-gap-section);">
      ${narrow('720px', html`<void-table stack hoverable>${stationsTable}</void-table>`)}
      ${narrow('380px', html`<void-table stack hoverable>${stationsTable}</void-table>`)}
    </div>
  `,
};
