import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';
import { argTypesFor } from '../.storybook/manifest';

const meta: Meta = {
  title: 'Components/Panel',
  component: 'void-panel',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Structural content container for settings sections, detail views, and grouped information in dashboards. Takes an optional header with a title and description, and supports bordered and elevated variants for visual hierarchy.',
      },
    },
  },
  argTypes: argTypesFor('void-panel'),
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {
    variant: 'default',
  },
  render: (args) => html`
    <void-panel aria-label="Details" variant=${args.variant}>
      <void-panel-body>
        <p>This is a default panel. Use it to group related content or provide a visual container for sections of your UI.</p>
      </void-panel-body>
    </void-panel>
  `,
};

export const WithTitle: Story = {
  render: () => html`
    <void-panel>
      <void-panel-header><void-panel-title>Settings</void-panel-title></void-panel-header>
      <void-panel-body>
        <p>Adjust your preferences here. Changes are saved automatically when you leave the field.</p>
      </void-panel-body>
    </void-panel>
  `,
};

export const WithDescription: Story = {
  render: () => html`
    <void-panel variant="bordered">
      <void-panel-header>
        <void-panel-title>Notifications</void-panel-title>
        <void-panel-description>Choose what you hear about.</void-panel-description>
      </void-panel-header>
      <void-panel-body>
        <p>Email digests are sent on Mondays.</p>
      </void-panel-body>
    </void-panel>
  `,
};

export const Bordered: Story = {
  render: () => html`
    <void-panel variant="bordered">
      <void-panel-header><void-panel-title>Billing</void-panel-title></void-panel-header>
      <void-panel-body>
        <p>Your current plan is <strong>Pro</strong>. Next billing date is May 1, 2026.</p>
      </void-panel-body>
    </void-panel>
  `,
};

export const Elevated: Story = {
  render: () => html`
    <void-panel variant="elevated">
      <void-panel-header><void-panel-title>Recent Activity</void-panel-title></void-panel-header>
      <void-panel-body>
        <p>You signed in from a new device on April 28, 2026 at 09:14 AM.</p>
      </void-panel-body>
    </void-panel>
  `,
};

export const Nested: Story = {
  render: () => html`
    <void-panel>
      <void-panel-header><void-panel-title>Account</void-panel-title></void-panel-header>
      <void-panel-body>
        <p>Manage your account details and connected services below.</p>
        <void-panel variant="bordered" style="margin-top: 1rem;">
          <void-panel-header><void-panel-title>Profile</void-panel-title></void-panel-header>
          <void-panel-body>
            <p>Update your display name, avatar, and contact email.</p>
          </void-panel-body>
        </void-panel>
      </void-panel-body>
    </void-panel>
  `,
};
