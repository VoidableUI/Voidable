import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';

import '@voidable/ui';
import '@voidable/theme';
import { argTypesFor } from '../.storybook/manifest';

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
  argTypes: argTypesFor('void-switch'),
  render: (args) => html`
    <void-switch aria-label="Email notifications"
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
      <void-switch aria-label="Email notifications" checked color="default"></void-switch>
      <void-switch aria-label="Email notifications" checked color="error"></void-switch>
      <void-switch aria-label="Email notifications" checked color="warning"></void-switch>
      <void-switch aria-label="Email notifications" checked color="success"></void-switch>
      <void-switch aria-label="Email notifications" checked color="info"></void-switch>
      <void-switch aria-label="Email notifications" checked color="notice"></void-switch>
    </div>
  `,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 16px;">
      <void-switch aria-label="Email notifications" size="sm"></void-switch>
      <void-switch aria-label="Email notifications" size="md"></void-switch>
      <void-switch aria-label="Email notifications" size="lg"></void-switch>
    </div>
  `,
};

export const Disabled: Story = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 16px;">
      <void-switch aria-label="Email notifications" disabled></void-switch>
      <void-switch aria-label="Email notifications" disabled checked></void-switch>
    </div>
  `,
};
