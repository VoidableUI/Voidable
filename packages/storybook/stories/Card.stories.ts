import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Components/Card',
  component: 'void-card',
  tags: ['autodocs'],
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
    <void-card heading=${args.heading} variant=${args.variant} padding=${args.padding}>
      <p>This is a default card. Use it to present self-contained pieces of content such as summaries, previews, or calls to action.</p>
    </void-card>
  `,
};

export const WithHeading: Story = {
  render: () => html`
    <void-card heading="Project Overview">
      <p>Track milestones, manage contributors, and review progress across all active workstreams.</p>
    </void-card>
  `,
};

export const Elevated: Story = {
  render: () => html`
    <void-card variant="elevated" heading="Weekly Summary">
      <p>You completed 12 tasks this week, a 20% increase from last week. Keep up the momentum.</p>
    </void-card>
  `,
};

export const Outlined: Story = {
  render: () => html`
    <void-card variant="outlined" heading="Integration Status">
      <p>All connected services are operating normally. Last sync completed at 08:45 AM today.</p>
    </void-card>
  `,
};

export const Padding: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <void-card padding="none" heading="No Padding">
        <p>Content sits flush against the card edges.</p>
      </void-card>
      <void-card padding="sm" heading="Small Padding">
        <p>Compact spacing for dense layouts.</p>
      </void-card>
      <void-card padding="md" heading="Medium Padding">
        <p>Balanced spacing suitable for most use cases.</p>
      </void-card>
      <void-card padding="lg" heading="Large Padding">
        <p>Generous spacing for featured or highlighted content.</p>
      </void-card>
    </div>
  `,
};

export const NoHeader: Story = {
  render: () => html`
    <void-card>
      <p>This card has no heading. It works well for simple content blocks that don't need a title, such as quotes, stats, or media previews.</p>
    </void-card>
  `,
};
