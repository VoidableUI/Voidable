import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';

import '@voidable/ui';
import '@voidable/theme';
import { argTypesFor } from '../.storybook/manifest';

const meta: Meta = {
  title: 'Navigation/Hamburger',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Animated open/close toggle for mobile navigation menus and collapsible sidebars. Communicates open state visually through a morphing icon.',
      },
    },
  },
  argTypes: argTypesFor('void-hamburger'),
  render: (args) => html`
    <void-hamburger
      size=${args.size || 'md'}
      ?open=${args.open}
    ></void-hamburger>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};

export const Open: Story = {
  args: { open: true },
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
      <void-hamburger size="sm" open></void-hamburger>
      <void-hamburger size="md" open></void-hamburger>
      <void-hamburger size="lg" open></void-hamburger>
    </div>
  `,
};
