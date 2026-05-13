import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Rails/App Shell/Top Bar',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Application shell with a sticky top navigation bar. Suited for simple apps, marketing sites, and content-focused layouts.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

const sunIcon = html`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;

const navbar = html`
  <nav style="
    position: sticky;
    top: 0;
    z-index: 100;
    background: color-mix(in srgb, var(--void-color-bg) 88%, transparent);
    backdrop-filter: saturate(140%) blur(6px);
    -webkit-backdrop-filter: saturate(140%) blur(6px);
    border-bottom: 1px solid var(--void-color-border);
  ">
    <div style="
      max-width: 72rem;
      margin: 0 auto;
      padding: 0 var(--void-space-6);
      display: flex;
      align-items: center;
      gap: var(--void-space-6);
      height: var(--void-space-14);
    ">
      <a style="
        font-family: var(--void-font-mono);
        font-weight: var(--void-weight-bold);
        font-size: var(--void-text-base);
        letter-spacing: var(--void-tracking-tightest);
        color: var(--void-color-text);
        text-decoration: none;
      ">Acme App</a>
      <div style="margin-left: auto; display: flex; align-items: center; gap: var(--void-space-3);">
        <span style="font-size: var(--void-text-sm); color: var(--void-color-text-secondary);">user@example.com</span>
        <void-button variant="ghost" size="sm" aria-label="Toggle theme">${sunIcon}</void-button>
        <void-button variant="ghost" size="sm">Sign out</void-button>
      </div>
    </div>
  </nav>
`;

const mainContent = html`
  <main style="
    max-width: 72rem;
    width: 100%;
    margin: 0 auto;
    padding: var(--void-space-8) var(--void-space-6);
  ">
    <h1 style="margin: 0 0 var(--void-space-4) 0; font-family: var(--void-font-sans); color: var(--void-color-text);">Products</h1>
    <p style="margin: 0; font-family: var(--void-font-sans); font-size: var(--void-text-base); color: var(--void-color-text-secondary); line-height: var(--void-leading-relaxed);">
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
    </p>
  </main>
`;

const richContent = html`
  <main style="
    max-width: 72rem;
    width: 100%;
    margin: 0 auto;
    padding: var(--void-space-8) var(--void-space-6);
  ">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--void-space-5);">
      <div>
        <h1 style="margin: 0; font-family: var(--void-font-sans); color: var(--void-color-text);">Products</h1>
        <p style="margin: var(--void-space-1) 0 0 0; font-family: var(--void-font-sans); font-size: var(--void-text-sm); color: var(--void-color-text-secondary);">
          Manage your product catalog
        </p>
      </div>
      <void-button color="success" size="sm">New product</void-button>
    </div>
    <void-card>
      <p style="margin: 0; font-family: var(--void-font-sans); font-size: var(--void-text-sm); color: var(--void-color-text); line-height: var(--void-leading-relaxed);">
        Your product catalog is where you manage all items available for sale. Add new products, update pricing, track inventory levels, and control visibility. Use filters and search to quickly find what you need across your entire catalog.
      </p>
    </void-card>
  </main>
`;

export const Default: Story = {
  render: () => html`
    <div>
      ${navbar}
      ${mainContent}
    </div>
  `,
};

export const WithContent: Story = {
  render: () => html`
    <div>
      ${navbar}
      ${richContent}
    </div>
  `,
};
