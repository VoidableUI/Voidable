import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';

import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Form/Checkbox',
  tags: ['autodocs'],
  argTypes: {
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
    indeterminate: { control: 'boolean' },
    color: { control: 'select', options: ['default', 'error', 'warning', 'success', 'info', 'notice'] },
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl', 'xxl'] },
  },
  render: (args) => html`
    <void-checkbox
      color=${args.color || 'default'}
      size=${args.size || 'md'}
      ?checked=${args.checked}
      ?disabled=${args.disabled}
      ?indeterminate=${args.indeterminate}
    >Accept terms</void-checkbox>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};

export const Checked: Story = {
  args: { checked: true },
};

export const Indeterminate: Story = {
  args: { indeterminate: true },
};

export const Colors: Story = {
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 16px; align-items: center;">
      <void-checkbox checked color="default">Default</void-checkbox>
      <void-checkbox checked color="error">Error</void-checkbox>
      <void-checkbox checked color="warning">Warning</void-checkbox>
      <void-checkbox checked color="success">Success</void-checkbox>
      <void-checkbox checked color="info">Info</void-checkbox>
      <void-checkbox checked color="notice">Notice</void-checkbox>
    </div>
  `,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 16px;">
      <void-checkbox size="sm">Small</void-checkbox>
      <void-checkbox size="md">Medium</void-checkbox>
      <void-checkbox size="lg">Large</void-checkbox>
      <void-checkbox size="xl">Extra Large</void-checkbox>
      <void-checkbox size="xxl">2X Large</void-checkbox>
    </div>
  `,
};

export const Disabled: Story = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 16px;">
      <void-checkbox disabled>Disabled</void-checkbox>
      <void-checkbox disabled checked>Disabled Checked</void-checkbox>
    </div>
  `,
};
