import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Components/Indicator',
  component: 'void-indicator',
  tags: ['autodocs'],
  argTypes: {
    color: {
      control: { type: 'select' },
      options: ['default', 'error', 'warning', 'success', 'info', 'notice'],
    },
    position: {
      control: { type: 'select' },
      options: ['top-right', 'top-left', 'bottom-right', 'bottom-left'],
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg', 'xl', 'xxl'],
    },
    count: { control: { type: 'number' } },
    ping: { control: { type: 'boolean' } },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => html`<void-indicator></void-indicator>`,
};

export const WithCount: Story = {
  render: () => html`<void-indicator count="5"></void-indicator>`,
};

export const Colors: Story = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap;">
      <void-indicator color="default"></void-indicator>
      <void-indicator color="error"></void-indicator>
      <void-indicator color="warning"></void-indicator>
      <void-indicator color="success"></void-indicator>
      <void-indicator color="info"></void-indicator>
      <void-indicator color="notice"></void-indicator>
    </div>
  `,
};

export const Ping: Story = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 1.5rem;">
      <void-indicator color="success" ping></void-indicator>
      <void-indicator color="error" ping></void-indicator>
      <void-indicator color="info" ping count="3"></void-indicator>
    </div>
  `,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 1.5rem;">
      <void-indicator size="sm" color="error"></void-indicator>
      <void-indicator size="md" color="error"></void-indicator>
      <void-indicator size="lg" color="error"></void-indicator>
      <void-indicator size="xl" color="error"></void-indicator>
      <void-indicator size="xxl" color="error"></void-indicator>
    </div>
  `,
};

export const OnButton: Story = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 2rem; flex-wrap: wrap;">
      <void-indicator color="error" count="3">
        <void-button variant="outline">Notifications</void-button>
      </void-indicator>
      <void-indicator color="success" ping>
        <void-button variant="outline">Messages</void-button>
      </void-indicator>
      <void-indicator color="warning" count="12">
        <void-button>Inbox</void-button>
      </void-indicator>
    </div>
  `,
};

export const Positions: Story = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 3rem; flex-wrap: wrap; padding: 1rem;">
      <void-indicator color="error" position="top-right">
        <void-button variant="outline">Top Right</void-button>
      </void-indicator>
      <void-indicator color="error" position="top-left">
        <void-button variant="outline">Top Left</void-button>
      </void-indicator>
      <void-indicator color="error" position="bottom-right">
        <void-button variant="outline">Bottom Right</void-button>
      </void-indicator>
      <void-indicator color="error" position="bottom-left">
        <void-button variant="outline">Bottom Left</void-button>
      </void-indicator>
    </div>
  `,
};
