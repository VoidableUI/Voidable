import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Components/Banner',
  component: 'void-banner',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Full-width site-level announcements for maintenance windows, cookie consent, or promotional messaging. Supports dismissible mode for one-time notices.',
      },
    },
  },
  argTypes: {
    color: {
      control: { type: 'select' },
      options: ['default', 'error', 'warning', 'success', 'info', 'notice'],
    },
    variant: {
      control: { type: 'select' },
      options: ['subtle', 'filled'],
    },
    dismissable: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {
    color: 'default',
    variant: 'subtle',
    dismissable: false,
  },
  render: (args) => html`
    <void-banner color=${args.color} variant=${args.variant} ?dismissable=${args.dismissable}>
      This is a page-level notification banner.
    </void-banner>
  `,
};

export const Colors: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <void-banner color="default">Default — general-purpose page message.</void-banner>
      <void-banner color="error">Error — something went wrong and needs attention.</void-banner>
      <void-banner color="warning">Warning — proceed with caution.</void-banner>
      <void-banner color="success">Success — the operation completed successfully.</void-banner>
      <void-banner color="info">Info — here is some useful information.</void-banner>
      <void-banner color="notice">Notice — a routine notification for your awareness.</void-banner>
    </div>
  `,
};

export const Filled: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <void-banner color="default" variant="filled">Default filled banner.</void-banner>
      <void-banner color="error" variant="filled">Error filled banner.</void-banner>
      <void-banner color="warning" variant="filled">Warning filled banner.</void-banner>
      <void-banner color="success" variant="filled">Success filled banner.</void-banner>
      <void-banner color="info" variant="filled">Info filled banner.</void-banner>
      <void-banner color="notice" variant="filled">Notice filled banner.</void-banner>
    </div>
  `,
};

export const Dismissable: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <void-banner color="info" dismissable>
        This banner can be dismissed. Click the × button to close it.
      </void-banner>
      <void-banner color="success" dismissable>
        Your changes have been saved successfully.
      </void-banner>
      <void-banner color="error" dismissable>
        Failed to submit the form. Please try again.
      </void-banner>
    </div>
  `,
};
