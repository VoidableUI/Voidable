import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';

import '@voidable/ui';
import '@voidable/theme';
import { argTypesFor } from '../.storybook/manifest';

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
  argTypes: argTypesFor('void-color-picker'),
  render: (args) => {
    const picker = html`
      <void-color-picker aria-label="Colour"
        value=${args.value ?? '#000000'}
        size=${args.size || 'md'}
        ?disabled=${args.disabled}
        ?hide-input=${args.hideInput}
        .swatches=${args.swatches ?? []}
      ></void-color-picker>
    `;
    // Without its text input the picker has no control to carry an aria-label: the field names it.
    return args.hideInput ? html`<void-field label="Colour">${picker}</void-field>` : picker;
  },
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
      <void-color-picker aria-label="Colour" size="sm" value="#ef4444"></void-color-picker>
      <void-color-picker aria-label="Colour" size="md" value="#3b82f6"></void-color-picker>
      <void-color-picker aria-label="Colour" size="lg" value="#22c55e"></void-color-picker>
    </div>
  `,
};

export const Disabled: Story = {
  args: { disabled: true, value: '#8b5cf6' },
};

export const NoInput: Story = {
  args: { hideInput: true, value: '#f59e0b' },
};

export const Compact: Story = {
  render: () => html`
    <div style="display: flex; gap: var(--void-space-4); align-items: flex-start;">
      <void-color-picker aria-label="Colour" compact value="#3b82f6"></void-color-picker>
      <void-color-picker aria-label="Colour" compact value="#22c55e" size="sm"></void-color-picker>
      <void-color-picker aria-label="Colour" compact value="#ef4444" disabled></void-color-picker>
    </div>
  `,
};

export const CompactWithSwatches: Story = {
  render: () => html`
    <void-color-picker aria-label="Colour"
      compact
      value="#8b5cf6"
      .swatches=${['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899']}
    ></void-color-picker>
  `,
};
