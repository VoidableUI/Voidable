import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Components/Panel',
  component: 'void-panel',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Structural content container for settings sections, detail views, and grouped information in dashboards. Supports labelled, bordered, and elevated variants for visual hierarchy.',
      },
    },
  },
  argTypes: {
    label: {
      control: { type: 'text' },
    },
    variant: {
      control: { type: 'select' },
      options: ['default', 'bordered', 'elevated'],
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {
    label: '',
    variant: 'default',
  },
  render: (args) => html`
    <void-panel label=${args.label} variant=${args.variant}>
      <p>This is a default panel. Use it to group related content or provide a visual container for sections of your UI.</p>
    </void-panel>
  `,
};

export const WithLabel: Story = {
  render: () => html`
    <void-panel label="Settings">
      <p>Adjust your preferences here. Changes are saved automatically when you leave the field.</p>
    </void-panel>
  `,
};

export const Bordered: Story = {
  render: () => html`
    <void-panel variant="bordered" label="Billing">
      <p>Your current plan is <strong>Pro</strong>. Next billing date is May 1, 2026.</p>
    </void-panel>
  `,
};

export const Elevated: Story = {
  render: () => html`
    <void-panel variant="elevated" label="Recent Activity">
      <p>You signed in from a new device on April 28, 2026 at 09:14 AM.</p>
    </void-panel>
  `,
};

export const Nested: Story = {
  render: () => html`
    <void-panel label="Account">
      <p>Manage your account details and connected services below.</p>
      <void-panel variant="bordered" label="Profile" style="margin-top: 1rem;">
        <p>Update your display name, avatar, and contact email.</p>
      </void-panel>
    </void-panel>
  `,
};
