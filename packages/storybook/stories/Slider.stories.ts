import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';

import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Form/Slider',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Drag-to-set range input for volume controls, price filters, and settings with continuous numeric values. Supports min/max/step constraints and an optional value readout.',
      },
    },
  },
  argTypes: {
    value: { control: 'number' },
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
    disabled: { control: 'boolean' },
    showValue: { control: 'boolean' },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
  render: (args) => html`
    <void-slider
      .value=${args.value ?? 50}
      min=${args.min ?? 0}
      max=${args.max ?? 100}
      step=${args.step ?? 1}
      size=${args.size || 'md'}
      ?disabled=${args.disabled}
      ?showValue=${args.showValue}
      style="width: 300px;"
    ></void-slider>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};

export const WithValue: Story = {
  args: { showValue: true, value: 65 },
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 24px; width: 300px;">
      <void-slider size="sm" .value=${40} show-value></void-slider>
      <void-slider size="md" .value=${50} show-value></void-slider>
      <void-slider size="lg" .value=${60} show-value></void-slider>
    </div>
  `,
};

export const CustomRange: Story = {
  args: { min: -50, max: 50, value: 0, showValue: true },
};

export const SteppedSlider: Story = {
  args: { min: 0, max: 10, step: 1, value: 5, showValue: true },
};

export const Disabled: Story = {
  args: { disabled: true, value: 35, showValue: true },
};
