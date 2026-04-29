import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Components/Progress',
  component: 'void-progress',
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
    },
    color: {
      control: { type: 'select' },
      options: ['default', 'error', 'warning', 'success', 'info', 'notice'],
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg', 'xl', 'xxl'],
    },
    indeterminate: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {
    value: 60,
    color: 'default',
    size: 'md',
    indeterminate: false,
  },
  render: (args) => html`
    <void-progress
      value=${args.value}
      color=${args.color}
      size=${args.size}
      ?indeterminate=${args.indeterminate}
    ></void-progress>
  `,
};

export const Colors: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 0.75rem; width: 300px;">
      <void-progress value="75" color="default"></void-progress>
      <void-progress value="60" color="error"></void-progress>
      <void-progress value="45" color="warning"></void-progress>
      <void-progress value="90" color="success"></void-progress>
      <void-progress value="55" color="info"></void-progress>
      <void-progress value="30" color="notice"></void-progress>
    </div>
  `,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 0.75rem; width: 300px;">
      <void-progress value="60" size="sm"></void-progress>
      <void-progress value="60" size="md"></void-progress>
      <void-progress value="60" size="lg"></void-progress>
      <void-progress value="60" size="xl"></void-progress>
      <void-progress value="60" size="xxl"></void-progress>
    </div>
  `,
};

export const Indeterminate: Story = {
  render: () => html`
    <div style="width: 300px;">
      <void-progress indeterminate></void-progress>
    </div>
  `,
};
