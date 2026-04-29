import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Components/Badge',
  component: 'void-badge',
  tags: ['autodocs'],
  argTypes: {
    color: {
      control: { type: 'select' },
      options: ['default', 'error', 'warning', 'success', 'info', 'notice', 'highlight'],
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {
    color: 'default',
    size: 'md',
  },
  render: (args) => html`
    <void-badge color=${args.color} size=${args.size}>42</void-badge>
  `,
};

export const Colors: Story = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
      <void-badge color="default">Default</void-badge>
      <void-badge color="error">Error</void-badge>
      <void-badge color="warning">Warning</void-badge>
      <void-badge color="success">Success</void-badge>
      <void-badge color="info">Info</void-badge>
      <void-badge color="notice">Notice</void-badge>
      <void-badge color="highlight">Highlight</void-badge>
    </div>
  `,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 0.75rem;">
      <void-badge size="sm">9</void-badge>
      <void-badge size="md">42</void-badge>
      <void-badge size="lg">New</void-badge>
    </div>
  `,
};
