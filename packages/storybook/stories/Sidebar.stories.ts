import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';
import { argTypesFor } from '../.storybook/manifest';

const meta: Meta = {
  title: 'Components/Sidebar',
  component: 'void-sidebar',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Collapsible navigation panel for app shells, admin dashboards, and documentation sites with a persistent navigation rail at the start or end of the page. Transitions smoothly between expanded and icon-only collapsed states.',
      },
    },
  },
  argTypes: argTypesFor('void-sidebar'),
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {
    collapsed: false,
    width: '240px',
    collapsedWidth: '60px',
    side: 'start',
  },
  render: (args) => html`
    <void-sidebar
      ?collapsed=${args.collapsed}
      width=${args.width}
      collapsed-width=${args.collapsedWidth}
      side=${args.side}
      style="height:300px"
    >
      <div style="padding:14px 12px;font-family:var(--void-font-sans);font-size:var(--void-text-sm);color:var(--void-color-text-secondary)">Sidebar content</div>
    </void-sidebar>
  `,
};

export const Collapsed: Story = {
  render: () => html`
    <void-sidebar collapsed style="height:300px">
      <div style="display:flex;flex-direction:column;gap:var(--void-space-2);padding:var(--void-space-3);align-items:center">
        <div style="width:24px;height:24px;border-radius:var(--void-radius-sm);background:var(--void-color-bg-secondary);border:1px solid var(--void-color-border)"></div>
        <div style="width:24px;height:24px;border-radius:var(--void-radius-sm);background:var(--void-color-bg-secondary);border:1px solid var(--void-color-border)"></div>
        <div style="width:24px;height:24px;border-radius:var(--void-radius-sm);background:var(--void-color-bg-secondary);border:1px solid var(--void-color-border)"></div>
      </div>
    </void-sidebar>
  `,
};

export const WithNavItems: Story = {
  render: () => html`
    <void-sidebar style="height:400px">
      <div style="display:flex;flex-direction:column;gap:var(--void-space-1);padding:var(--void-space-3) var(--void-space-3);flex:1">
        <div style="padding:7px 10px;border-radius:8px;background:var(--void-color-bg-secondary);font-family:var(--void-font-sans);font-size:var(--void-text-sm);color:var(--void-color-text);cursor:pointer;border:1px solid var(--void-color-border)">Overview</div>
        <div style="padding:7px 10px;border-radius:8px;font-family:var(--void-font-sans);font-size:var(--void-text-sm);color:var(--void-color-text-secondary);cursor:pointer">Modules</div>
        <div style="padding:7px 10px;border-radius:8px;font-family:var(--void-font-sans);font-size:var(--void-text-sm);color:var(--void-color-text-secondary);cursor:pointer">Settings</div>
      </div>
      <div style="padding:var(--void-space-3);font-family:var(--void-font-mono);font-size:var(--void-text-xs);color:var(--void-color-text-secondary)">v1.0.0</div>
    </void-sidebar>
  `,
};

export const EndSide: Story = {
  render: () => html`
    <div style="display:flex;justify-content:flex-end;height:300px">
      <void-sidebar side="end" style="height:300px">
        <div style="padding:14px 12px;font-family:var(--void-font-sans);font-size:var(--void-text-sm);color:var(--void-color-text-secondary)">End sidebar</div>
      </void-sidebar>
    </div>
  `,
};

export const SwitcherAndCounts: Story = {
  parameters: {
    docs: {
      description: {
        story: 'A project switcher (a dropdown menu with a ghost button as its trigger) above the links lines up with the link icons and labels. A link takes an icon, a label and, after a `void-spacer`, a trailing count. The rail is `--void-sidebar-width` wide; a `width` attribute overrides the token.',
      },
    },
  },
  render: () => html`
    <void-shell nav="side" style="min-height: 320px">
      <void-sidebar>
        <void-dropdown-menu>
          <void-dropdown-menu-trigger>
            <void-button variant="ghost">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true"><rect x="2.5" y="2.5" width="11" height="11" rx="2"/></svg>
              <span>Northwind</span>
            </void-button>
          </void-dropdown-menu-trigger>
          <void-dropdown-menu-content>
            <void-dropdown-menu-item>Northwind</void-dropdown-menu-item>
            <void-dropdown-menu-item>Contoso</void-dropdown-menu-item>
          </void-dropdown-menu-content>
        </void-dropdown-menu>
        <void-nav-links>
          <a href="#overview" aria-current="page">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true"><path d="M2 7l6-5 6 5v7H2z"/></svg>
            <span>Overview</span>
          </a>
          <a href="#inbox">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true"><path d="M2 3h12v10H2zM2 9h4l1 2h2l1-2h4"/></svg>
            <span>Inbox</span>
            <void-spacer></void-spacer>
            <span>12</span>
          </a>
        </void-nav-links>
      </void-sidebar>
      <main></main>
    </void-shell>
  `,
};
