import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';

import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Components/Button',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Triggers actions in forms, dialogs, and toolbars. Supports loading states for async operations and multiple color variants for semantic emphasis.',
      },
    },
  },
  argTypes: {
    variant: { control: 'select', options: ['outline', 'filled'] },
    color: { control: 'select', options: ['default', 'error', 'warning', 'success', 'info', 'notice'] },
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl', 'xxl'] },
    disabled: { control: 'boolean' },
  },
  render: (args) => html`
    <void-button
      variant=${args.variant || 'outline'}
      color=${args.color || 'default'}
      size=${args.size || 'md'}
      ?disabled=${args.disabled}
    >Button</void-button>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};

export const Filled: Story = {
  args: { variant: 'filled' },
};

export const Colors: Story = {
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
      <void-button color="default">Default</void-button>
      <void-button color="error">Error</void-button>
      <void-button color="warning">Warning</void-button>
      <void-button color="success">Success</void-button>
      <void-button color="info">Info</void-button>
      <void-button color="notice">Notice</void-button>
    </div>
  `,
};

export const ColorsFilled: Story = {
  name: 'Colors (Filled)',
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
      <void-button variant="filled" color="default">Default</void-button>
      <void-button variant="filled" color="error">Error</void-button>
      <void-button variant="filled" color="warning">Warning</void-button>
      <void-button variant="filled" color="success">Success</void-button>
      <void-button variant="filled" color="info">Info</void-button>
      <void-button variant="filled" color="notice">Notice</void-button>
    </div>
  `,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 12px;">
      <void-button size="sm">Small</void-button>
      <void-button size="md">Medium</void-button>
      <void-button size="lg">Large</void-button>
      <void-button size="xl">XL</void-button>
      <void-button size="xxl">XXL</void-button>
    </div>
  `,
};

export const Disabled: Story = {
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
      <void-button disabled>Disabled Outline</void-button>
      <void-button variant="filled" disabled>Disabled Filled</void-button>
      <void-button color="error" disabled>Disabled Error</void-button>
    </div>
  `,
};
