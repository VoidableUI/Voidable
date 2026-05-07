import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Components/Sidebar',
  component: 'void-sidebar',
  tags: ['autodocs'],
  argTypes: {
    collapsed: {
      control: { type: 'boolean' },
    },
    width: {
      control: { type: 'text' },
    },
    collapsedWidth: {
      control: { type: 'text' },
    },
    position: {
      control: { type: 'select' },
      options: ['left', 'right'],
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {
    collapsed: false,
    width: '240px',
    collapsedWidth: '60px',
    position: 'left',
  },
  render: (args) => html`
    <void-sidebar
      ?collapsed=${args.collapsed}
      width=${args.width}
      collapsedWidth=${args.collapsedWidth}
      position=${args.position}
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

export const RightPosition: Story = {
  render: () => html`
    <div style="display:flex;justify-content:flex-end;height:300px">
      <void-sidebar position="right" style="height:300px">
        <div style="padding:14px 12px;font-family:var(--void-font-sans);font-size:var(--void-text-sm);color:var(--void-color-text-secondary)">Right sidebar</div>
      </void-sidebar>
    </div>
  `,
};
