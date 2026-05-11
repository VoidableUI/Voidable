import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Form/NumberInput',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Precise numeric entry for quantity selectors, price fields, and settings that need increment/decrement controls. Supports min/max, step, and precision constraints.',
      },
    },
  },
  argTypes: {
    value: { control: 'number' },
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
    precision: { control: 'number' },
    disabled: { control: 'boolean' },
    readonly: { control: 'boolean' },
    placeholder: { control: 'text' },
    label: { control: 'text' },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    color: { control: 'select', options: ['default', 'error', 'warning', 'success', 'info', 'notice'] },
    controls: { control: 'select', options: ['sides', 'right', 'none'] },
  },
  render: (args) => html`
    <void-number-input
      .value=${args.value ?? 0}
      min=${args.min ?? ''}
      max=${args.max ?? ''}
      step=${args.step ?? 1}
      precision=${args.precision ?? -1}
      size=${args.size || 'md'}
      color=${args.color || 'default'}
      controls=${args.controls || 'sides'}
      placeholder=${args.placeholder || ''}
      label=${args.label || 'Number'}
      ?disabled=${args.disabled}
      ?readonly=${args.readonly}
      style="width: 200px;"
    ></void-number-input>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};

export const WithMinMax: Story = {
  args: { min: 0, max: 100, value: 50 },
};

export const WithStep: Story = {
  args: { min: 0, max: 10, step: 0.5, precision: 1, value: 5 },
};

export const ControlsRight: Story = {
  args: { controls: 'right', value: 42 },
};

export const ControlsNone: Story = {
  args: { controls: 'none', value: 0, placeholder: 'Enter number...' },
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px; width: 200px;">
      <void-number-input size="sm" .value=${0} label="Small"></void-number-input>
      <void-number-input size="md" .value=${0} label="Medium"></void-number-input>
      <void-number-input size="lg" .value=${0} label="Large"></void-number-input>
    </div>
  `,
};

export const Colors: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px; width: 200px;">
      <void-number-input color="default" .value=${0} label="Default"></void-number-input>
      <void-number-input color="error" .value=${0} label="Error"></void-number-input>
      <void-number-input color="warning" .value=${0} label="Warning"></void-number-input>
      <void-number-input color="success" .value=${0} label="Success"></void-number-input>
      <void-number-input color="info" .value=${0} label="Info"></void-number-input>
      <void-number-input color="notice" .value=${0} label="Notice"></void-number-input>
    </div>
  `,
};

export const Disabled: Story = {
  args: { disabled: true, value: 42 },
};

export const Readonly: Story = {
  args: { readonly: true, value: 42 },
};
