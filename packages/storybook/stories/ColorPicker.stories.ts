import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';

import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Components/ColorPicker',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Color selection control with spectrum area, hue slider, hex input, and preset swatches for theme customization and design tools.',
      },
    },
  },
  argTypes: {
    value: { control: 'color' },
    disabled: { control: 'boolean' },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    showInput: { control: 'boolean' },
  },
  render: (args) => html`
    <void-color-picker
      value=${args.value ?? '#000000'}
      size=${args.size || 'md'}
      ?disabled=${args.disabled}
      ?showInput=${args.showInput ?? true}
      .swatches=${args.swatches ?? []}
    ></void-color-picker>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};

export const WithValue: Story = {
  args: { value: '#3b82f6' },
};

export const WithSwatches: Story = {
  args: {
    swatches: ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#000000', '#ffffff'],
  },
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; gap: 32px; align-items: flex-start;">
      <void-color-picker size="sm" value="#ef4444"></void-color-picker>
      <void-color-picker size="md" value="#3b82f6"></void-color-picker>
      <void-color-picker size="lg" value="#22c55e"></void-color-picker>
    </div>
  `,
};

export const Disabled: Story = {
  args: { disabled: true, value: '#8b5cf6' },
};

export const NoInput: Story = {
  args: { showInput: false, value: '#f59e0b' },
};

export const Compact: Story = {
  render: () => html`
    <div style="display: flex; gap: var(--void-space-4); align-items: flex-start;">
      <void-color-picker variant="compact" value="#3b82f6"></void-color-picker>
      <void-color-picker variant="compact" value="#22c55e" size="sm"></void-color-picker>
      <void-color-picker variant="compact" value="#ef4444" disabled></void-color-picker>
    </div>
  `,
};

export const CompactWithSwatches: Story = {
  render: () => html`
    <void-color-picker
      variant="compact"
      value="#8b5cf6"
      .swatches=${['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899']}
    ></void-color-picker>
  `,
};
