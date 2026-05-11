import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';

import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Components/DropdownMenu',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Trigger-anchored action menus for row actions in tables, toolbar overflow menus, and context menus. Supports keyboard navigation and a destructive item variant.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => html`
    <void-dropdown-menu>
      <void-button>Options</void-button>
      <void-dropdown-menu-item>Edit</void-dropdown-menu-item>
      <void-dropdown-menu-item>Duplicate</void-dropdown-menu-item>
      <void-dropdown-menu-item>Archive</void-dropdown-menu-item>
    </void-dropdown-menu>
  `,
};

export const WithDestructiveItem: Story = {
  render: () => html`
    <void-dropdown-menu>
      <void-button>Actions</void-button>
      <void-dropdown-menu-item>Edit</void-dropdown-menu-item>
      <void-dropdown-menu-item>Duplicate</void-dropdown-menu-item>
      <void-dropdown-menu-item destructive>Delete</void-dropdown-menu-item>
    </void-dropdown-menu>
  `,
};

export const WithDisabledItems: Story = {
  render: () => html`
    <void-dropdown-menu>
      <void-button>Actions</void-button>
      <void-dropdown-menu-item>Edit</void-dropdown-menu-item>
      <void-dropdown-menu-item disabled>Publish (unavailable)</void-dropdown-menu-item>
      <void-dropdown-menu-item destructive>Delete</void-dropdown-menu-item>
    </void-dropdown-menu>
  `,
};

export const Positions: Story = {
  render: () => html`
    <div style="display: flex; gap: 16px; padding: 80px; flex-wrap: wrap; align-items: center;">
      <void-dropdown-menu position="bottom-start">
        <void-button>Bottom Start</void-button>
        <void-dropdown-menu-item>Item One</void-dropdown-menu-item>
        <void-dropdown-menu-item>Item Two</void-dropdown-menu-item>
      </void-dropdown-menu>
      <void-dropdown-menu position="bottom-end">
        <void-button>Bottom End</void-button>
        <void-dropdown-menu-item>Item One</void-dropdown-menu-item>
        <void-dropdown-menu-item>Item Two</void-dropdown-menu-item>
      </void-dropdown-menu>
      <void-dropdown-menu position="top-start">
        <void-button>Top Start</void-button>
        <void-dropdown-menu-item>Item One</void-dropdown-menu-item>
        <void-dropdown-menu-item>Item Two</void-dropdown-menu-item>
      </void-dropdown-menu>
      <void-dropdown-menu position="top-end">
        <void-button>Top End</void-button>
        <void-dropdown-menu-item>Item One</void-dropdown-menu-item>
        <void-dropdown-menu-item>Item Two</void-dropdown-menu-item>
      </void-dropdown-menu>
    </div>
  `,
};
