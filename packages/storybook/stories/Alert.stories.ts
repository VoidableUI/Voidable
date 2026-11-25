import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';
import { argTypesFor } from '../.storybook/manifest';

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
  argTypes: argTypesFor('void-alert'),
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
      <void-alert-description>This is an informational alert message.</void-alert-description>
    </void-alert>
  `,
};

export const Colors: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <void-alert color="default"><void-alert-description>Default — general-purpose status message.</void-alert-description></void-alert>
      <void-alert color="error"><void-alert-description>Error — something went wrong and needs attention.</void-alert-description></void-alert>
      <void-alert color="warning"><void-alert-description>Warning — proceed with caution.</void-alert-description></void-alert>
      <void-alert color="success"><void-alert-description>Success — the operation completed successfully.</void-alert-description></void-alert>
      <void-alert color="info"><void-alert-description>Info — here is some useful information.</void-alert-description></void-alert>
      <void-alert color="notice"><void-alert-description>Notice — a routine notification for your awareness.</void-alert-description></void-alert>
    </div>
  `,
};

export const Filled: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <void-alert color="default" variant="filled"><void-alert-description>Default filled alert.</void-alert-description></void-alert>
      <void-alert color="error" variant="filled"><void-alert-description>Error filled alert.</void-alert-description></void-alert>
      <void-alert color="warning" variant="filled"><void-alert-description>Warning filled alert.</void-alert-description></void-alert>
      <void-alert color="success" variant="filled"><void-alert-description>Success filled alert.</void-alert-description></void-alert>
      <void-alert color="info" variant="filled"><void-alert-description>Info filled alert.</void-alert-description></void-alert>
      <void-alert color="notice" variant="filled"><void-alert-description>Notice filled alert.</void-alert-description></void-alert>
    </div>
  `,
};

export const Dismissible: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <void-alert color="info" dismissible>
        <void-alert-description>This alert can be dismissed. Click the × button to close it.</void-alert-description>
      </void-alert>
      <void-alert color="success" dismissible>
        <void-alert-description>Your changes have been saved successfully.</void-alert-description>
      </void-alert>
      <void-alert color="error" dismissible>
        <void-alert-description>Failed to submit the form. Please try again.</void-alert-description>
      </void-alert>
    </div>
  `,
};
