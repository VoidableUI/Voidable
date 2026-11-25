import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';
import { argTypesFor } from '../.storybook/manifest';

const meta: Meta = {
  title: 'Components/StatusDot',
  component: 'void-status-dot',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Small presence indicator for user avatars, team member lists, and real-time collaboration UIs that need to show online/away/offline state at a glance.',
      },
    },
  },
  argTypes: argTypesFor('void-status-dot'),
};

export default meta;
type Story = StoryObj;

export const Online: Story = {
  render: () => html`<void-status-dot status="online"></void-status-dot>`,
};

export const Away: Story = {
  render: () => html`<void-status-dot status="away"></void-status-dot>`,
};

export const Offline: Story = {
  render: () => html`<void-status-dot status="offline"></void-status-dot>`,
};

export const AllStates: Story = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 1rem;">
      <div style="display: flex; align-items: center; gap: 0.375rem;">
        <void-status-dot status="online"></void-status-dot>
        <span>Online</span>
      </div>
      <div style="display: flex; align-items: center; gap: 0.375rem;">
        <void-status-dot status="away"></void-status-dot>
        <span>Away</span>
      </div>
      <div style="display: flex; align-items: center; gap: 0.375rem;">
        <void-status-dot status="offline"></void-status-dot>
        <span>Offline</span>
      </div>
    </div>
  `,
};
