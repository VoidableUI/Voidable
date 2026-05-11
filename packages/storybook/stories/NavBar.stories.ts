import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Navigation/NavBar',
  component: 'void-nav-bar',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Top application navigation bar for branding, primary links, and user account controls. Supports sticky positioning and an elevated variant for visual separation.',
      },
    },
  },
  argTypes: {
    sticky: {
      control: { type: 'boolean' },
    },
    bordered: {
      control: { type: 'boolean' },
    },
    variant: {
      control: { type: 'select' },
      options: ['default', 'elevated'],
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {
    sticky: false,
    bordered: true,
    variant: 'default',
  },
  render: (args) => html`
    <void-nav-bar ?sticky=${args.sticky} ?bordered=${args.bordered} variant=${args.variant}>
      <a href="#">Home</a>
      <a href="#">Docs</a>
      <a href="#">Blog</a>
    </void-nav-bar>
  `,
};

export const WithLogo: Story = {
  render: () => html`
    <void-nav-bar>
      <strong style="font-size: var(--void-text-sm); font-weight: var(--void-weight-medium);">Voidable</strong>
      <a href="#">Products</a>
      <a href="#">Pricing</a>
      <a href="#">About</a>
    </void-nav-bar>
  `,
};

export const WithActions: Story = {
  render: () => html`
    <void-nav-bar>
      <strong style="font-size: var(--void-text-sm); font-weight: var(--void-weight-medium); margin-right: auto;">Voidable</strong>
      <a href="#">Features</a>
      <a href="#">Changelog</a>
      <void-button size="sm">Sign in</void-button>
      <void-button size="sm" variant="filled">Get started</void-button>
    </void-nav-bar>
  `,
};

export const Elevated: Story = {
  render: () => html`
    <void-nav-bar variant="elevated">
      <strong style="font-size: var(--void-text-sm); font-weight: var(--void-weight-medium); margin-right: auto;">Voidable</strong>
      <a href="#">Docs</a>
      <a href="#">Support</a>
    </void-nav-bar>
  `,
};

export const Unborderd: Story = {
  render: () => html`
    <void-nav-bar .bordered=${false}>
      <strong style="font-size: var(--void-text-sm); font-weight: var(--void-weight-medium);">Voidable</strong>
      <a href="#">Home</a>
      <a href="#">About</a>
    </void-nav-bar>
  `,
};
