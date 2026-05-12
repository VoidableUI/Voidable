import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';

import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Components/NavMenu',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Horizontal navigation bar with dropdown sub-menus for site headers, application nav bars, and mega-menu layouts.',
      },
    },
  },
  argTypes: {
    orientation: {
      control: { type: 'select' },
      options: ['horizontal', 'vertical'],
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {
    orientation: 'horizontal',
  },
  render: (args) => html`
    <void-nav-menu orientation=${args.orientation}>
      <void-nav-menu-item>
        Products
        <div style="display: flex; flex-direction: column; gap: var(--void-space-1);">
          <a href="#" style="padding: var(--void-space-2); border-radius: var(--void-radius-md); color: var(--void-color-text); text-decoration: none;">Analytics</a>
          <a href="#" style="padding: var(--void-space-2); border-radius: var(--void-radius-md); color: var(--void-color-text); text-decoration: none;">Automation</a>
          <a href="#" style="padding: var(--void-space-2); border-radius: var(--void-radius-md); color: var(--void-color-text); text-decoration: none;">Security</a>
        </div>
      </void-nav-menu-item>
      <void-nav-menu-item>
        Solutions
        <div style="display: flex; flex-direction: column; gap: var(--void-space-1);">
          <a href="#" style="padding: var(--void-space-2); border-radius: var(--void-radius-md); color: var(--void-color-text); text-decoration: none;">Enterprise</a>
          <a href="#" style="padding: var(--void-space-2); border-radius: var(--void-radius-md); color: var(--void-color-text); text-decoration: none;">Startups</a>
        </div>
      </void-nav-menu-item>
      <void-nav-menu-item>
        Resources
        <div style="display: flex; flex-direction: column; gap: var(--void-space-1);">
          <a href="#" style="padding: var(--void-space-2); border-radius: var(--void-radius-md); color: var(--void-color-text); text-decoration: none;">Documentation</a>
          <a href="#" style="padding: var(--void-space-2); border-radius: var(--void-radius-md); color: var(--void-color-text); text-decoration: none;">Blog</a>
          <a href="#" style="padding: var(--void-space-2); border-radius: var(--void-radius-md); color: var(--void-color-text); text-decoration: none;">Community</a>
        </div>
      </void-nav-menu-item>
      <void-nav-menu-item href="/pricing">Pricing</void-nav-menu-item>
    </void-nav-menu>
  `,
};

export const WithActiveItem: Story = {
  render: () => html`
    <void-nav-menu>
      <void-nav-menu-item>
        Products
        <div style="display: flex; flex-direction: column; gap: var(--void-space-1);">
          <a href="#" style="padding: var(--void-space-2); color: var(--void-color-text); text-decoration: none;">Analytics</a>
          <a href="#" style="padding: var(--void-space-2); color: var(--void-color-text); text-decoration: none;">Automation</a>
        </div>
      </void-nav-menu-item>
      <void-nav-menu-item active>
        Solutions
        <div style="display: flex; flex-direction: column; gap: var(--void-space-1);">
          <a href="#" style="padding: var(--void-space-2); color: var(--void-color-text); text-decoration: none;">Enterprise</a>
          <a href="#" style="padding: var(--void-space-2); color: var(--void-color-text); text-decoration: none;">Startups</a>
        </div>
      </void-nav-menu-item>
      <void-nav-menu-item href="/pricing">Pricing</void-nav-menu-item>
      <void-nav-menu-item href="/about" disabled>About</void-nav-menu-item>
    </void-nav-menu>
  `,
};

export const Vertical: Story = {
  render: () => html`
    <void-nav-menu orientation="vertical" width="8rem">
      <void-nav-menu-item active href="/dashboard">Dashboard</void-nav-menu-item>
      <void-nav-menu-item>
        Settings
        <div style="display: flex; flex-direction: column; gap: var(--void-space-1);">
          <a href="#" style="padding: var(--void-space-2); color: var(--void-color-text); text-decoration: none;">Profile</a>
          <a href="#" style="padding: var(--void-space-2); color: var(--void-color-text); text-decoration: none;">Security</a>
          <a href="#" style="padding: var(--void-space-2); color: var(--void-color-text); text-decoration: none;">Billing</a>
        </div>
      </void-nav-menu-item>
      <void-nav-menu-item href="/support">Support</void-nav-menu-item>
    </void-nav-menu>
  `,
};

export const MegaMenu: Story = {
  render: () => html`
    <void-nav-menu>
      <void-nav-menu-item>
        Products
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--void-space-4); min-width: 36rem; padding: var(--void-space-2);">
          <div>
            <div style="font-weight: var(--void-weight-semibold); font-size: var(--void-text-xs); color: var(--void-color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: var(--void-space-2);">Platform</div>
            <div style="display: flex; flex-direction: column; gap: var(--void-space-1);">
              <a href="#" style="padding: var(--void-space-1) 0; color: var(--void-color-text); text-decoration: none; font-size: var(--void-text-sm);">Analytics</a>
              <a href="#" style="padding: var(--void-space-1) 0; color: var(--void-color-text); text-decoration: none; font-size: var(--void-text-sm);">Automation</a>
              <a href="#" style="padding: var(--void-space-1) 0; color: var(--void-color-text); text-decoration: none; font-size: var(--void-text-sm);">Integrations</a>
            </div>
          </div>
          <div>
            <div style="font-weight: var(--void-weight-semibold); font-size: var(--void-text-xs); color: var(--void-color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: var(--void-space-2);">Security</div>
            <div style="display: flex; flex-direction: column; gap: var(--void-space-1);">
              <a href="#" style="padding: var(--void-space-1) 0; color: var(--void-color-text); text-decoration: none; font-size: var(--void-text-sm);">SSO</a>
              <a href="#" style="padding: var(--void-space-1) 0; color: var(--void-color-text); text-decoration: none; font-size: var(--void-text-sm);">Audit Logs</a>
              <a href="#" style="padding: var(--void-space-1) 0; color: var(--void-color-text); text-decoration: none; font-size: var(--void-text-sm);">Compliance</a>
            </div>
          </div>
          <div>
            <div style="font-weight: var(--void-weight-semibold); font-size: var(--void-text-xs); color: var(--void-color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: var(--void-space-2);">Resources</div>
            <div style="display: flex; flex-direction: column; gap: var(--void-space-1);">
              <a href="#" style="padding: var(--void-space-1) 0; color: var(--void-color-text); text-decoration: none; font-size: var(--void-text-sm);">Documentation</a>
              <a href="#" style="padding: var(--void-space-1) 0; color: var(--void-color-text); text-decoration: none; font-size: var(--void-text-sm);">API Reference</a>
              <a href="#" style="padding: var(--void-space-1) 0; color: var(--void-color-text); text-decoration: none; font-size: var(--void-text-sm);">Changelog</a>
            </div>
          </div>
        </div>
      </void-nav-menu-item>
      <void-nav-menu-item href="/pricing">Pricing</void-nav-menu-item>
      <void-nav-menu-item href="/docs">Docs</void-nav-menu-item>
      <void-nav-menu-item href="/blog">Blog</void-nav-menu-item>
    </void-nav-menu>
  `,
};
