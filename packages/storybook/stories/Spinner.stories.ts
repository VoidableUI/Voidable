import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';

import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Components/Spinner',
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl', 'xxl'] },
    label: { control: 'text' },
  },
  render: (args) => html`
    <void-spinner
      size=${args.size || 'md'}
      label=${args.label || 'Loading'}
    ></void-spinner>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 16px;">
      <void-spinner size="sm" label="Loading small"></void-spinner>
      <void-spinner size="md" label="Loading medium"></void-spinner>
      <void-spinner size="lg" label="Loading large"></void-spinner>
      <void-spinner size="xl" label="Loading xl"></void-spinner>
      <void-spinner size="xxl" label="Loading xxl"></void-spinner>
    </div>
  `,
};

export const CustomLabel: Story = {
  args: { label: 'Please wait' },
};
