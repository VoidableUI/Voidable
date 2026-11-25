import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';
import { argTypesFor } from '../.storybook/manifest';

const meta: Meta = {
  title: 'Components/PinInput',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Single-character input cells for OTP verification codes, PIN entry, and multi-digit confirmation fields.',
      },
    },
  },
  argTypes: argTypesFor('void-pin-input'),
  render: (args) => html`
    <void-pin-input aria-label="Verification code"
      .length=${args.length ?? 6}
      .value=${args.value ?? ''}
      size=${args.size || 'md'}
      color=${args.color || 'default'}
      type=${args.type || 'numeric'}
      placeholder=${args.placeholder || ''}
      ?disabled=${args.disabled}
      ?mask=${args.mask}
    ></void-pin-input>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};

export const Filled: Story = {
  args: { value: '123456' },
};

export const Masked: Story = {
  args: { mask: true, value: '123456' },
};

export const Numeric: Story = {
  args: { type: 'numeric', placeholder: '0' },
};

export const Alphanumeric: Story = {
  args: { type: 'alphanumeric', placeholder: 'X' },
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <void-pin-input aria-label="Verification code" size="sm" .value=${'1234'}></void-pin-input>
      <void-pin-input aria-label="Verification code" size="md" .value=${'1234'}></void-pin-input>
      <void-pin-input aria-label="Verification code" size="lg" .value=${'1234'}></void-pin-input>
    </div>
  `,
};

export const Colors: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <void-pin-input aria-label="Verification code" color="default" .value=${'123456'}></void-pin-input>
      <void-pin-input aria-label="Verification code" color="error" .value=${'123456'}></void-pin-input>
      <void-pin-input aria-label="Verification code" color="warning" .value=${'123456'}></void-pin-input>
      <void-pin-input aria-label="Verification code" color="success" .value=${'123456'}></void-pin-input>
      <void-pin-input aria-label="Verification code" color="info" .value=${'123456'}></void-pin-input>
      <void-pin-input aria-label="Verification code" color="notice" .value=${'123456'}></void-pin-input>
    </div>
  `,
};

export const Groups: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <void-pin-input aria-label="Verification code" groups="3,3" .value=${'123456'}></void-pin-input>
      <void-pin-input aria-label="Verification code" groups="3,4" .value=${'1234567'}></void-pin-input>
      <void-pin-input aria-label="Verification code" groups="2,2,2" .value=${'123456'}></void-pin-input>
    </div>
  `,
};

export const Disabled: Story = {
  args: { disabled: true, value: '123456' },
};

export const WithError: Story = {
  args: { color: 'error', value: '999999' },
};
