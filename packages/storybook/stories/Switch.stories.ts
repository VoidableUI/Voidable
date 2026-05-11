import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';

import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Components/Switch',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Binary toggle for enabling or disabling features, notification preferences, and settings where the effect is immediate and reversible. More discoverable than a checkbox for standalone boolean options.',
      },
    },
  },
  argTypes: {
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
    color: { control: 'select', options: ['default', 'error', 'warning', 'success', 'info', 'notice'] },
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl', 'xxl'] },
  },
  render: (args) => html`
    <void-switch
      color=${args.color || 'default'}
      size=${args.size || 'md'}
      ?checked=${args.checked}
      ?disabled=${args.disabled}
    ></void-switch>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};

export const Checked: Story = {
  args: { checked: true },
};

export const Colors: Story = {
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 16px; align-items: center;">
      <void-switch checked color="default"></void-switch>
      <void-switch checked color="error"></void-switch>
      <void-switch checked color="warning"></void-switch>
      <void-switch checked color="success"></void-switch>
      <void-switch checked color="info"></void-switch>
      <void-switch checked color="notice"></void-switch>
    </div>
  `,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 16px;">
      <void-switch size="sm"></void-switch>
      <void-switch size="md"></void-switch>
      <void-switch size="lg"></void-switch>
      <void-switch size="xl"></void-switch>
      <void-switch size="xxl"></void-switch>
    </div>
  `,
};

export const Disabled: Story = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 16px;">
      <void-switch disabled></void-switch>
      <void-switch disabled checked></void-switch>
    </div>
  `,
};
