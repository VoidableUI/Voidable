import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Components/Alert',
  component: 'void-alert',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Inline contextual messages for form validation feedback, permission warnings, and system status notices. Supports dismissible mode for transient messages.',
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
    dismissible: {
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
    dismissible: false,
  },
  render: (args) => html`
    <void-alert color=${args.color} variant=${args.variant} ?dismissible=${args.dismissible}>
      This is an informational alert message.
    </void-alert>
  `,
};

export const Colors: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <void-alert color="default">Default — general-purpose status message.</void-alert>
      <void-alert color="error">Error — something went wrong and needs attention.</void-alert>
      <void-alert color="warning">Warning — proceed with caution.</void-alert>
      <void-alert color="success">Success — the operation completed successfully.</void-alert>
      <void-alert color="info">Info — here is some useful information.</void-alert>
      <void-alert color="notice">Notice — a routine notification for your awareness.</void-alert>
    </div>
  `,
};

export const Filled: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <void-alert color="default" variant="filled">Default filled alert.</void-alert>
      <void-alert color="error" variant="filled">Error filled alert.</void-alert>
      <void-alert color="warning" variant="filled">Warning filled alert.</void-alert>
      <void-alert color="success" variant="filled">Success filled alert.</void-alert>
      <void-alert color="info" variant="filled">Info filled alert.</void-alert>
      <void-alert color="notice" variant="filled">Notice filled alert.</void-alert>
    </div>
  `,
};

export const Dismissible: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <void-alert color="info" dismissible>
        This alert can be dismissed. Click the × button to close it.
      </void-alert>
      <void-alert color="success" dismissible>
        Your changes have been saved successfully.
      </void-alert>
      <void-alert color="error" dismissible>
        Failed to submit the form. Please try again.
      </void-alert>
    </div>
  `,
};
