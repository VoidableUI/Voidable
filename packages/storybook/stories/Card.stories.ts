import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Components/Card',
  component: 'void-card',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Content grouping containers for dashboard widgets, product listings, and media previews. Supports heading, variants, and configurable padding.',
      },
    },
  },
  argTypes: {
    heading: {
      control: { type: 'text' },
    },
    variant: {
      control: { type: 'select' },
      options: ['default', 'elevated', 'outlined'],
    },
    padding: {
      control: { type: 'select' },
      options: ['none', 'sm', 'md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {
    heading: '',
    variant: 'default',
    padding: 'md',
  },
  render: (args) => html`
    <void-card variant=${args.variant} padding=${args.padding}>
      <void-card-header>
        <void-card-title>${args.heading}</void-card-title>
      </void-card-header>
      <void-card-body>
        <p>This is a default card. Use it to present self-contained pieces of content such as summaries, previews, or calls to action.</p>
      </void-card-body>
    </void-card>
  `,
};

export const WithHeading: Story = {
  render: () => html`
    <void-card>
      <void-card-header>
        <void-card-title>Project Overview</void-card-title>
      </void-card-header>
      <void-card-body>
        <p>Track milestones, manage contributors, and review progress across all active workstreams.</p>
      </void-card-body>
    </void-card>
  `,
};

export const Elevated: Story = {
  render: () => html`
    <void-card variant="elevated">
      <void-card-header>
        <void-card-title>Weekly Summary</void-card-title>
      </void-card-header>
      <void-card-body>
        <p>You completed 12 tasks this week, a 20% increase from last week. Keep up the momentum.</p>
      </void-card-body>
    </void-card>
  `,
};

export const Outlined: Story = {
  render: () => html`
    <void-card variant="outlined">
      <void-card-header>
        <void-card-title>Integration Status</void-card-title>
      </void-card-header>
      <void-card-body>
        <p>All connected services are operating normally. Last sync completed at 08:45 AM today.</p>
      </void-card-body>
    </void-card>
  `,
};

export const Padding: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <void-card padding="none">
        <void-card-header>
          <void-card-title>No Padding</void-card-title>
        </void-card-header>
        <void-card-body>
          <p>Content sits flush against the card edges.</p>
        </void-card-body>
      </void-card>
      <void-card padding="sm">
        <void-card-header>
          <void-card-title>Small Padding</void-card-title>
        </void-card-header>
        <void-card-body>
          <p>Compact spacing for dense layouts.</p>
        </void-card-body>
      </void-card>
      <void-card padding="md">
        <void-card-header>
          <void-card-title>Medium Padding</void-card-title>
        </void-card-header>
        <void-card-body>
          <p>Balanced spacing suitable for most use cases.</p>
        </void-card-body>
      </void-card>
      <void-card padding="lg">
        <void-card-header>
          <void-card-title>Large Padding</void-card-title>
        </void-card-header>
        <void-card-body>
          <p>Generous spacing for featured or highlighted content.</p>
        </void-card-body>
      </void-card>
    </div>
  `,
};

export const NoHeader: Story = {
  render: () => html`
    <void-card>
      <void-card-body>
        <p>This card has no heading. It works well for simple content blocks that don't need a title, such as quotes, stats, or media previews.</p>
      </void-card-body>
    </void-card>
  `,
};

export const InFlexColumn: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Cards never shrink or scroll inside a height-constrained flex column. Add `scrollable` to opt in to an internal scrollbar.',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; height: 12rem; overflow: auto;">
      <void-card><void-card-header><void-card-title>First</void-card-title></void-card-header><void-card-body><p>Keeps its natural height.</p><p>The parent scrolls instead.</p></void-card-body></void-card>
      <void-card><void-card-header><void-card-title>Second</void-card-title></void-card-header><void-card-body><p>Also keeps its natural height.</p><p>No inner scrollbar.</p></void-card-body></void-card>
    </div>
  `,
};

export const Scrollable: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; height: 10rem;">
      <void-card scrollable><void-card-header><void-card-title>Scrollable</void-card-title></void-card-header><void-card-body><p>Opt-in.</p><p>Content.</p><p>That</p><p>scrolls</p><p>inside</p><p>the card.</p></void-card-body></void-card>
    </div>
  `,
};
