import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';

import '@voidable/ui';
import '@voidable/theme';
import { argTypesFor } from '../.storybook/manifest';

const meta: Meta = {
  title: 'Components/Menu',
  argTypes: argTypesFor('void-menu'),
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `Standalone visible menu panel for command palettes, side panels, and searchable action lists. Renders always-open rather than as a triggered dropdown.

**Keyboard**

Pattern: menu. The items are one tab stop; keys are handled on the menu, never on the document.

| Key | Action |
|-----|--------|
| Down Arrow / Up Arrow | Focus the next / previous item (wraps); from the search field, the first / last |
| Home / End | Focus the first / last item |
| Characters | Jump to the next item starting with them (not when searchable) |
| Enter / Space | Activate the item |
| Escape | Close the menu |`,
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => html`
    <void-menu open>
      <void-menu-content>
        <void-menu-item value="edit">Edit</void-menu-item>
        <void-menu-item value="duplicate">Duplicate</void-menu-item>
        <void-menu-item value="archive">Archive</void-menu-item>
        <void-menu-item value="delete">Delete</void-menu-item>
      </void-menu-content>
    </void-menu>
  `,
};

export const Searchable: Story = {
  render: () => html`
    <void-menu open>
      <void-menu-search><input type="search" placeholder="Type a command..." aria-label="Type a command..."></void-menu-search>
      <void-menu-content>
        <void-menu-item value="new-file">New File</void-menu-item>
        <void-menu-item value="open-file">Open File</void-menu-item>
        <void-menu-item value="save">Save</void-menu-item>
        <void-menu-item value="save-as">Save As</void-menu-item>
        <void-menu-item value="close">Close</void-menu-item>
        <void-menu-item value="settings">Settings</void-menu-item>
      </void-menu-content>
    </void-menu>
  `,
};

export const WithGroups: Story = {
  render: () => html`
    <void-menu open>
      <void-menu-search><input type="search" placeholder="Search commands..." aria-label="Search commands..."></void-menu-search>
      <void-menu-content>
        <void-menu-group>
          <void-menu-group-label>File</void-menu-group-label>
          <void-menu-item value="new-file">New File<void-menu-item-shortcut>⌘N</void-menu-item-shortcut></void-menu-item>
          <void-menu-item value="open-file">Open File<void-menu-item-shortcut>⌘O</void-menu-item-shortcut></void-menu-item>
          <void-menu-item value="save">Save<void-menu-item-shortcut>⌘S</void-menu-item-shortcut></void-menu-item>
        </void-menu-group>
        <void-menu-group>
          <void-menu-group-label>Edit</void-menu-group-label>
          <void-menu-item value="undo">Undo<void-menu-item-shortcut>⌘Z</void-menu-item-shortcut></void-menu-item>
          <void-menu-item value="redo">Redo<void-menu-item-shortcut>⌘⇧Z</void-menu-item-shortcut></void-menu-item>
          <void-menu-item value="cut">Cut<void-menu-item-shortcut>⌘X</void-menu-item-shortcut></void-menu-item>
          <void-menu-item value="copy">Copy<void-menu-item-shortcut>⌘C</void-menu-item-shortcut></void-menu-item>
          <void-menu-item value="paste">Paste<void-menu-item-shortcut>⌘V</void-menu-item-shortcut></void-menu-item>
        </void-menu-group>
        <void-menu-group>
          <void-menu-group-label>View</void-menu-group-label>
          <void-menu-item value="zoom-in">Zoom In<void-menu-item-shortcut>⌘+</void-menu-item-shortcut></void-menu-item>
          <void-menu-item value="zoom-out">Zoom Out<void-menu-item-shortcut>⌘-</void-menu-item-shortcut></void-menu-item>
          <void-menu-item value="fullscreen">Fullscreen<void-menu-item-shortcut>F11</void-menu-item-shortcut></void-menu-item>
        </void-menu-group>
      </void-menu-content>
    </void-menu>
  `,
};

export const WithShortcuts: Story = {
  render: () => html`
    <void-menu open>
      <void-menu-content>
        <void-menu-item value="new">New File<void-menu-item-shortcut>⌘N</void-menu-item-shortcut></void-menu-item>
        <void-menu-item value="open">Open File<void-menu-item-shortcut>⌘O</void-menu-item-shortcut></void-menu-item>
        <void-menu-item value="save">Save<void-menu-item-shortcut>⌘S</void-menu-item-shortcut></void-menu-item>
        <void-menu-item value="save-as">Save As<void-menu-item-shortcut>⌘⇧S</void-menu-item-shortcut></void-menu-item>
        <void-menu-item value="close">Close<void-menu-item-shortcut>⌘W</void-menu-item-shortcut></void-menu-item>
      </void-menu-content>
    </void-menu>
  `,
};

export const WithDisabledItems: Story = {
  render: () => html`
    <void-menu open>
      <void-menu-content>
        <void-menu-item value="cut">Cut<void-menu-item-shortcut>⌘X</void-menu-item-shortcut></void-menu-item>
        <void-menu-item value="copy">Copy<void-menu-item-shortcut>⌘C</void-menu-item-shortcut></void-menu-item>
        <void-menu-item value="paste" disabled>Paste<void-menu-item-shortcut>⌘V</void-menu-item-shortcut></void-menu-item>
        <void-menu-item value="delete" disabled>Delete</void-menu-item>
      </void-menu-content>
    </void-menu>
  `,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; gap: 24px; align-items: flex-start;">
      <void-menu open size="sm">
        <void-menu-content>
          <void-menu-item value="a">Small Item A</void-menu-item>
          <void-menu-item value="b">Small Item B</void-menu-item>
          <void-menu-item value="c">Small Item C</void-menu-item>
        </void-menu-content>
      </void-menu>
      <void-menu open size="md">
        <void-menu-content>
          <void-menu-item value="a">Medium Item A</void-menu-item>
          <void-menu-item value="b">Medium Item B</void-menu-item>
          <void-menu-item value="c">Medium Item C</void-menu-item>
        </void-menu-content>
      </void-menu>
      <void-menu open size="lg">
        <void-menu-content>
          <void-menu-item value="a">Large Item A</void-menu-item>
          <void-menu-item value="b">Large Item B</void-menu-item>
          <void-menu-item value="c">Large Item C</void-menu-item>
        </void-menu-content>
      </void-menu>
    </div>
  `,
};

export const WithIcons: Story = {
  render: () => html`
    <void-menu open>
      <void-menu-content>
        <void-menu-item value="new"><void-menu-item-icon>📄</void-menu-item-icon>New File<void-menu-item-shortcut>⌘N</void-menu-item-shortcut></void-menu-item>
        <void-menu-item value="open"><void-menu-item-icon>📂</void-menu-item-icon>Open<void-menu-item-shortcut>⌘O</void-menu-item-shortcut></void-menu-item>
        <void-menu-item value="save"><void-menu-item-icon>💾</void-menu-item-icon>Save<void-menu-item-shortcut>⌘S</void-menu-item-shortcut></void-menu-item>
        <void-menu-item value="settings"><void-menu-item-icon>⚙️</void-menu-item-icon>Settings</void-menu-item>
      </void-menu-content>
    </void-menu>
  `,
};
