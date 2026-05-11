import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Form/Input',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Single-line text entry for login forms, search fields, and any structured data capture. Supports common input types, sizes, and inline validation errors.',
      },
    },
  },
  argTypes: {
    type: { control: 'select', options: ['text', 'email', 'password', 'number', 'tel', 'url', 'search'] },
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
    readonly: { control: 'boolean' },
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl', 'xxl'] },
    error: { control: 'text' },
  },
  render: (args) => html`
    <void-input
      type=${args.type || 'text'}
      placeholder=${args.placeholder || 'Enter text...'}
      size=${args.size || 'md'}
      ?disabled=${args.disabled}
      ?readonly=${args.readonly}
      error=${args.error || ''}
    ></void-input>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};

export const WithError: Story = {
  args: { error: 'This field is required', placeholder: 'Enter email...' },
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px; max-width: 400px;">
      <void-input size="sm" placeholder="Small"></void-input>
      <void-input size="md" placeholder="Medium"></void-input>
      <void-input size="lg" placeholder="Large"></void-input>
      <void-input size="xl" placeholder="XL"></void-input>
      <void-input size="xxl" placeholder="XXL"></void-input>
    </div>
  `,
};

export const Disabled: Story = {
  args: { disabled: true, placeholder: 'Disabled input' },
};

export const Password: Story = {
  args: { type: 'password', placeholder: 'Enter password...' },
};
