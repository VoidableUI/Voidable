import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Navigation/Breadcrumbs',
  tags: ['autodocs'],
  argTypes: {
    separator: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (args) => html`
    <void-breadcrumbs separator=${args.separator || '/'}>
      <a href="/">Home</a>
      <a href="/products">Products</a>
      <span>Details</span>
    </void-breadcrumbs>
  `,
};

export const CustomSeparator: Story = {
  render: () => html`
    <void-breadcrumbs separator="›">
      <a href="/">Home</a>
      <a href="/docs">Docs</a>
      <span>Getting Started</span>
    </void-breadcrumbs>
  `,
};

export const TwoItems: Story = {
  render: () => html`
    <void-breadcrumbs>
      <a href="/">Home</a>
      <span>Current Page</span>
    </void-breadcrumbs>
  `,
};

export const SingleItem: Story = {
  render: () => html`
    <void-breadcrumbs>
      <span>Home</span>
    </void-breadcrumbs>
  `,
};

export const DeepNesting: Story = {
  render: () => html`
    <void-breadcrumbs separator="/">
      <a href="/">Home</a>
      <a href="/settings">Settings</a>
      <a href="/settings/account">Account</a>
      <a href="/settings/account/security">Security</a>
      <span>Two-Factor Auth</span>
    </void-breadcrumbs>
  `,
};
