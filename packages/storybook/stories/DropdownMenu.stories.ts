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
        component: `Trigger-anchored action menus for row actions in tables, toolbar overflow menus, and context menus. Supports keyboard navigation and a destructive item variant.

**Keyboard**

Pattern: menu button. The trigger gets \`aria-haspopup\`, \`aria-expanded\` and \`aria-controls\`.

| Key | Action |
|-----|--------|
| Enter / Space / Down Arrow (trigger) | Open and focus the first item |
| Up Arrow (trigger) | Open and focus the last item |
| Down Arrow / Up Arrow / Home / End | Move between items (wraps) |
| Characters | Jump to the next item starting with them |
| Enter / Space (item) | Activate the item, close and return focus to the trigger (unless the item has \`keep-open\`) |
| Escape | Close and return focus to the trigger |
| Tab | Close and move on |

The panel opens in the top layer on the \`position\` side (\`top\`, \`bottom\`, \`left\`, \`right\`) with the \`align\` alignment (\`start\`, \`center\`, \`end\`) and flips at the viewport edges.`,
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => html`
    <void-dropdown-menu>
      <void-button slot="trigger">Options</void-button>
      <void-dropdown-menu-item>Edit</void-dropdown-menu-item>
      <void-dropdown-menu-item>Duplicate</void-dropdown-menu-item>
      <void-dropdown-menu-item>Archive</void-dropdown-menu-item>
    </void-dropdown-menu>
  `,
};

export const WithDestructiveItem: Story = {
  render: () => html`
    <void-dropdown-menu>
      <void-button slot="trigger">Actions</void-button>
      <void-dropdown-menu-item>Edit</void-dropdown-menu-item>
      <void-dropdown-menu-item>Duplicate</void-dropdown-menu-item>
      <void-dropdown-menu-item destructive>Delete</void-dropdown-menu-item>
    </void-dropdown-menu>
  `,
};

export const WithDisabledItems: Story = {
  render: () => html`
    <void-dropdown-menu>
      <void-button slot="trigger">Actions</void-button>
      <void-dropdown-menu-item>Edit</void-dropdown-menu-item>
      <void-dropdown-menu-item disabled>Publish (unavailable)</void-dropdown-menu-item>
      <void-dropdown-menu-item destructive>Delete</void-dropdown-menu-item>
    </void-dropdown-menu>
  `,
};

export const Positions: Story = {
  render: () => html`
    <div style="display: flex; gap: 16px; padding: 80px; flex-wrap: wrap; align-items: center;">
      <void-dropdown-menu position="bottom" align="start">
        <void-button slot="trigger">Bottom Start</void-button>
        <void-dropdown-menu-item>Item One</void-dropdown-menu-item>
        <void-dropdown-menu-item>Item Two</void-dropdown-menu-item>
      </void-dropdown-menu>
      <void-dropdown-menu position="bottom" align="end">
        <void-button slot="trigger">Bottom End</void-button>
        <void-dropdown-menu-item>Item One</void-dropdown-menu-item>
        <void-dropdown-menu-item>Item Two</void-dropdown-menu-item>
      </void-dropdown-menu>
      <void-dropdown-menu position="top" align="start">
        <void-button slot="trigger">Top Start</void-button>
        <void-dropdown-menu-item>Item One</void-dropdown-menu-item>
        <void-dropdown-menu-item>Item Two</void-dropdown-menu-item>
      </void-dropdown-menu>
      <void-dropdown-menu position="top" align="end">
        <void-button slot="trigger">Top End</void-button>
        <void-dropdown-menu-item>Item One</void-dropdown-menu-item>
        <void-dropdown-menu-item>Item Two</void-dropdown-menu-item>
      </void-dropdown-menu>
    </div>
  `,
};

export const KeepOpenItems: Story = {
  render: () => html`
    <div style="padding: 40px;">
      <void-dropdown-menu>
        <void-button slot="trigger">View</void-button>
        <void-dropdown-menu-item keep-open>Show grid</void-dropdown-menu-item>
        <void-dropdown-menu-item keep-open>Show rulers</void-dropdown-menu-item>
        <hr />
        <void-dropdown-menu-item>Reset view</void-dropdown-menu-item>
      </void-dropdown-menu>
    </div>
  `,
};
