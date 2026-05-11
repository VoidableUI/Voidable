import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';

import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Components/Menu',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Standalone visible menu panel for command palettes, side panels, and searchable action lists. Renders always-open rather than as a triggered dropdown.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => html`
    <void-menu open>
      <void-menu-item value="edit">Edit</void-menu-item>
      <void-menu-item value="duplicate">Duplicate</void-menu-item>
      <void-menu-item value="archive">Archive</void-menu-item>
      <void-menu-item value="delete">Delete</void-menu-item>
    </void-menu>
  `,
};

export const Searchable: Story = {
  render: () => html`
    <void-menu open searchable placeholder="Type a command...">
      <void-menu-item value="new-file">New File</void-menu-item>
      <void-menu-item value="open-file">Open File</void-menu-item>
      <void-menu-item value="save">Save</void-menu-item>
      <void-menu-item value="save-as">Save As</void-menu-item>
      <void-menu-item value="close">Close</void-menu-item>
      <void-menu-item value="settings">Settings</void-menu-item>
    </void-menu>
  `,
};

export const WithGroups: Story = {
  render: () => html`
    <void-menu open searchable placeholder="Search commands...">
      <void-menu-group label="File">
        <void-menu-item value="new-file" shortcut="⌘N">New File</void-menu-item>
        <void-menu-item value="open-file" shortcut="⌘O">Open File</void-menu-item>
        <void-menu-item value="save" shortcut="⌘S">Save</void-menu-item>
      </void-menu-group>
      <void-menu-group label="Edit">
        <void-menu-item value="undo" shortcut="⌘Z">Undo</void-menu-item>
        <void-menu-item value="redo" shortcut="⌘⇧Z">Redo</void-menu-item>
        <void-menu-item value="cut" shortcut="⌘X">Cut</void-menu-item>
        <void-menu-item value="copy" shortcut="⌘C">Copy</void-menu-item>
        <void-menu-item value="paste" shortcut="⌘V">Paste</void-menu-item>
      </void-menu-group>
      <void-menu-group label="View">
        <void-menu-item value="zoom-in" shortcut="⌘+">Zoom In</void-menu-item>
        <void-menu-item value="zoom-out" shortcut="⌘-">Zoom Out</void-menu-item>
        <void-menu-item value="fullscreen" shortcut="F11">Fullscreen</void-menu-item>
      </void-menu-group>
    </void-menu>
  `,
};

export const WithShortcuts: Story = {
  render: () => html`
    <void-menu open>
      <void-menu-item value="new" shortcut="⌘N">New File</void-menu-item>
      <void-menu-item value="open" shortcut="⌘O">Open File</void-menu-item>
      <void-menu-item value="save" shortcut="⌘S">Save</void-menu-item>
      <void-menu-item value="save-as" shortcut="⌘⇧S">Save As</void-menu-item>
      <void-menu-item value="close" shortcut="⌘W">Close</void-menu-item>
    </void-menu>
  `,
};

export const WithDisabledItems: Story = {
  render: () => html`
    <void-menu open>
      <void-menu-item value="cut" shortcut="⌘X">Cut</void-menu-item>
      <void-menu-item value="copy" shortcut="⌘C">Copy</void-menu-item>
      <void-menu-item value="paste" shortcut="⌘V" disabled>Paste</void-menu-item>
      <void-menu-item value="delete" disabled>Delete</void-menu-item>
    </void-menu>
  `,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; gap: 24px; align-items: flex-start;">
      <void-menu open size="sm">
        <void-menu-item value="a">Small Item A</void-menu-item>
        <void-menu-item value="b">Small Item B</void-menu-item>
        <void-menu-item value="c">Small Item C</void-menu-item>
      </void-menu>
      <void-menu open size="md">
        <void-menu-item value="a">Medium Item A</void-menu-item>
        <void-menu-item value="b">Medium Item B</void-menu-item>
        <void-menu-item value="c">Medium Item C</void-menu-item>
      </void-menu>
      <void-menu open size="lg">
        <void-menu-item value="a">Large Item A</void-menu-item>
        <void-menu-item value="b">Large Item B</void-menu-item>
        <void-menu-item value="c">Large Item C</void-menu-item>
      </void-menu>
    </div>
  `,
};

export const WithIcons: Story = {
  render: () => html`
    <void-menu open>
      <void-menu-item value="new" icon="📄" shortcut="⌘N">New File</void-menu-item>
      <void-menu-item value="open" icon="📂" shortcut="⌘O">Open</void-menu-item>
      <void-menu-item value="save" icon="💾" shortcut="⌘S">Save</void-menu-item>
      <void-menu-item value="settings" icon="⚙️">Settings</void-menu-item>
    </void-menu>
  `,
};
