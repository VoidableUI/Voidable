import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';
import { argTypesFor } from '../.storybook/manifest';

const meta: Meta = {
  title: 'Navigation/Breadcrumbs',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Navigation trail for deep page hierarchies in dashboards, e-commerce category trees, and file browsers. Helps users understand their location and navigate back.',
      },
    },
  },
  argTypes: argTypesFor('void-breadcrumbs'),
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (args) => html`
    <void-breadcrumbs separator=${args.separator || '/'}>
      <void-breadcrumbs-list>
        <void-breadcrumbs-item><a href="/">Home</a></void-breadcrumbs-item>
        <void-breadcrumbs-item><a href="/products">Products</a></void-breadcrumbs-item>
        <void-breadcrumbs-item aria-current="page">Details</void-breadcrumbs-item>
      </void-breadcrumbs-list>
    </void-breadcrumbs>
  `,
};

export const CustomSeparator: Story = {
  render: () => html`
    <void-breadcrumbs separator="›">
      <void-breadcrumbs-list>
        <void-breadcrumbs-item><a href="/">Home</a></void-breadcrumbs-item>
        <void-breadcrumbs-item><a href="/docs">Docs</a></void-breadcrumbs-item>
        <void-breadcrumbs-item aria-current="page">Getting Started</void-breadcrumbs-item>
      </void-breadcrumbs-list>
    </void-breadcrumbs>
  `,
};

export const TwoItems: Story = {
  render: () => html`
    <void-breadcrumbs>
      <void-breadcrumbs-list>
        <void-breadcrumbs-item><a href="/">Home</a></void-breadcrumbs-item>
        <void-breadcrumbs-item aria-current="page">Current Page</void-breadcrumbs-item>
      </void-breadcrumbs-list>
    </void-breadcrumbs>
  `,
};

export const SingleItem: Story = {
  render: () => html`
    <void-breadcrumbs>
      <void-breadcrumbs-list>
        <void-breadcrumbs-item aria-current="page">Home</void-breadcrumbs-item>
      </void-breadcrumbs-list>
    </void-breadcrumbs>
  `,
};

export const DeepNesting: Story = {
  render: () => html`
    <void-breadcrumbs separator="/">
      <void-breadcrumbs-list>
        <void-breadcrumbs-item><a href="/">Home</a></void-breadcrumbs-item>
        <void-breadcrumbs-item><a href="/settings">Settings</a></void-breadcrumbs-item>
        <void-breadcrumbs-item><a href="/settings/account">Account</a></void-breadcrumbs-item>
        <void-breadcrumbs-item><a href="/settings/account/security">Security</a></void-breadcrumbs-item>
        <void-breadcrumbs-item aria-current="page">Two-Factor Auth</void-breadcrumbs-item>
      </void-breadcrumbs-list>
    </void-breadcrumbs>
  `,
};
