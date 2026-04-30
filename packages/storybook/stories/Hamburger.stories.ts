import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';

import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Navigation/Hamburger',
  tags: ['autodocs'],
  argTypes: {
    active: { control: 'boolean' },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
  render: (args) => html`
    <void-hamburger
      size=${args.size || 'md'}
      ?active=${args.active}
    ></void-hamburger>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};

export const Active: Story = {
  args: { active: true },
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 16px;">
      <void-hamburger size="sm"></void-hamburger>
      <void-hamburger size="md"></void-hamburger>
      <void-hamburger size="lg"></void-hamburger>
    </div>
  `,
};

export const SizesActive: Story = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 16px;">
      <void-hamburger size="sm" active></void-hamburger>
      <void-hamburger size="md" active></void-hamburger>
      <void-hamburger size="lg" active></void-hamburger>
    </div>
  `,
};
