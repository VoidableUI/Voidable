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
    variant: { control: 'select', options: ['outline', 'filled', 'ghost'] },
    color: { control: 'select', options: ['default', 'error', 'warning', 'success', 'info', 'notice'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
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

/** Nothing drawn at rest; a faint fill on hover. For row actions, toolbars and the quiet button beside a primary one. */
export const Ghost: Story = {
  args: { variant: 'ghost' },
};

/** The three variants share a height and padding at every size, so they line up in a row. */
export const Variants: Story = {
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
      <void-button variant="filled">Save</void-button>
      <void-button>Schedule</void-button>
      <void-button variant="ghost">Cancel</void-button>
      <void-button variant="ghost" color="error">Delete</void-button>
      <void-button variant="ghost" disabled>Disabled</void-button>
      <void-button variant="ghost"><a href="#">Link</a></void-button>
      <void-button variant="ghost" aria-label="Refresh">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v2.6h-2.6"/></svg>
      </void-button>
    </div>
  `,
};

export const ColorsGhost: Story = {
  name: 'Colors (Ghost)',
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
      <void-button variant="ghost" color="default">Default</void-button>
      <void-button variant="ghost" color="error">Error</void-button>
      <void-button variant="ghost" color="warning">Warning</void-button>
      <void-button variant="ghost" color="success">Success</void-button>
      <void-button variant="ghost" color="info">Info</void-button>
      <void-button variant="ghost" color="notice">Notice</void-button>
    </div>
  `,
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
