import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';

import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Form/Radio',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Individual radio button for use within a RadioGroup or custom form layouts where mutually exclusive selection is needed. Supports semantic color states and multiple sizes.',
      },
    },
  },
  argTypes: {
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
    color: { control: 'select', options: ['default', 'error', 'warning', 'success', 'info', 'notice'] },
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl', 'xxl'] },
  },
  render: (args) => html`
    <void-radio
      color=${args.color || 'default'}
      size=${args.size || 'md'}
      ?checked=${args.checked}
      ?disabled=${args.disabled}
      name="story"
      value="a"
    >Option A</void-radio>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};

export const Group: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <void-radio name="group" value="a" checked>Option A</void-radio>
      <void-radio name="group" value="b">Option B</void-radio>
      <void-radio name="group" value="c">Option C</void-radio>
    </div>
  `,
};

export const Colors: Story = {
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 16px; align-items: center;">
      <void-radio checked color="default" name="colors" value="default">Default</void-radio>
      <void-radio checked color="error" name="colors" value="error">Error</void-radio>
      <void-radio checked color="warning" name="colors" value="warning">Warning</void-radio>
      <void-radio checked color="success" name="colors" value="success">Success</void-radio>
      <void-radio checked color="info" name="colors" value="info">Info</void-radio>
      <void-radio checked color="notice" name="colors" value="notice">Notice</void-radio>
    </div>
  `,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 16px;">
      <void-radio size="sm" name="sizes" value="sm">Small</void-radio>
      <void-radio size="md" name="sizes" value="md">Medium</void-radio>
      <void-radio size="lg" name="sizes" value="lg">Large</void-radio>
      <void-radio size="xl" name="sizes" value="xl">XL</void-radio>
      <void-radio size="xxl" name="sizes" value="xxl">XXL</void-radio>
    </div>
  `,
};

export const Disabled: Story = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 16px;">
      <void-radio disabled name="disabled" value="a">Disabled</void-radio>
      <void-radio disabled checked name="disabled" value="b">Disabled Checked</void-radio>
    </div>
  `,
};
