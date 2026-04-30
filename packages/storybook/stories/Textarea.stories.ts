import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';

import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Form/Textarea',
  tags: ['autodocs'],
  argTypes: {
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
    readonly: { control: 'boolean' },
    rows: { control: 'number' },
    resize: { control: 'select', options: ['none', 'vertical', 'both'] },
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl', 'xxl'] },
    error: { control: 'text' },
  },
  render: (args) => html`
    <void-textarea
      placeholder=${args.placeholder || 'Enter text…'}
      ?disabled=${args.disabled}
      ?readonly=${args.readonly}
      rows=${args.rows || 3}
      resize=${args.resize || 'vertical'}
      size=${args.size || 'md'}
      error=${args.error || ''}
    ></void-textarea>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};

export const WithError: Story = {
  args: { error: 'This field is required.' },
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <void-textarea size="sm" placeholder="Small"></void-textarea>
      <void-textarea size="md" placeholder="Medium"></void-textarea>
      <void-textarea size="lg" placeholder="Large"></void-textarea>
      <void-textarea size="xl" placeholder="XL"></void-textarea>
      <void-textarea size="xxl" placeholder="XXL"></void-textarea>
    </div>
  `,
};

export const Disabled: Story = {
  args: { disabled: true, placeholder: 'Disabled textarea' },
};
