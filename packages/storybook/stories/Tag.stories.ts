import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Components/Tag',
  component: 'void-tag',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Compact label for categories, status chips, and applied filter indicators. Use the removable variant in filter bars and multiselect chips where users need to dismiss individual tags.',
      },
    },
  },
  argTypes: {
    color: {
      control: { type: 'select' },
      options: ['default', 'error', 'warning', 'success', 'info', 'notice'],
    },
    removable: {
      control: { type: 'boolean' },
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg', 'xl', 'xxl'],
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {
    color: 'default',
    removable: false,
    size: 'md',
  },
  render: (args) => html`
    <void-tag color=${args.color} ?removable=${args.removable} size=${args.size}>Feature</void-tag>
  `,
};

export const Colors: Story = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
      <void-tag color="default">Default</void-tag>
      <void-tag color="error">Error</void-tag>
      <void-tag color="warning">Warning</void-tag>
      <void-tag color="success">Success</void-tag>
      <void-tag color="info">Info</void-tag>
      <void-tag color="notice">Notice</void-tag>
    </div>
  `,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 0.75rem;">
      <void-tag size="sm">Small</void-tag>
      <void-tag size="md">Medium</void-tag>
      <void-tag size="lg">Large</void-tag>
      <void-tag size="xl">XL</void-tag>
      <void-tag size="xxl">XXL</void-tag>
    </div>
  `,
};

export const Removable: Story = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
      <void-tag removable>Default</void-tag>
      <void-tag color="error" removable>Error</void-tag>
      <void-tag color="warning" removable>Warning</void-tag>
      <void-tag color="success" removable>Success</void-tag>
      <void-tag color="info" removable>Info</void-tag>
      <void-tag color="notice" removable>Notice</void-tag>
    </div>
  `,
};
