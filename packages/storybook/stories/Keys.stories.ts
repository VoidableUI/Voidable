import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

// Keyboard keys: plain kbd elements, styled by the theme's base from tokens
// (the code role's family and weight, the text's own colour). No story here
// has any CSS of its own.
const meta: Meta = {
  title: 'Foundations/Keyboard keys',
  parameters: {
    docs: {
      description: {
        component:
          'A kbd is a small raised key in the mono family, a little smaller than the text around it, in that text\'s own colour. A combination is one kbd per key inside another. It works in a sentence, a button, a menu item and a tooltip, in light and dark and under every skin.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const InText: Story = {
  render: () => html`
    <p>Press <kbd>Esc</kbd> to close, or <kbd><kbd>Ctrl</kbd>+<kbd>K</kbd></kbd> to search.</p>
  `,
};

export const InButtons: Story = {
  render: () => html`
    <div style="display: flex; gap: var(--void-space-3); align-items: center">
      <void-button variant="filled">Save <kbd>S</kbd></void-button>
      <void-button>Search <kbd>/</kbd></void-button>
      <void-button variant="ghost">Find <kbd>F</kbd></void-button>
    </div>
  `,
};

export const InMenuAndTooltip: Story = {
  render: () => html`
    <div style="display: flex; gap: var(--void-space-6); align-items: center">
      <void-dropdown-menu>
        <void-dropdown-menu-trigger><void-button>Edit</void-button></void-dropdown-menu-trigger>
        <void-dropdown-menu-content>
          <void-dropdown-menu-item>Copy <kbd>C</kbd></void-dropdown-menu-item>
          <void-dropdown-menu-item>Paste <kbd>V</kbd></void-dropdown-menu-item>
        </void-dropdown-menu-content>
      </void-dropdown-menu>
      <void-tooltip>
        <void-tooltip-trigger><void-button>Open</void-button></void-tooltip-trigger>
        <void-tooltip-content>Open the file <kbd>O</kbd></void-tooltip-content>
      </void-tooltip>
    </div>
  `,
};
