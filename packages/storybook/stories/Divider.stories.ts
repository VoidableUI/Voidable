import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Components/Divider',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Visual separation between sections in forms, sidebars, and content layouts. Supports optional labels for section headings and both horizontal and vertical orientations.',
      },
    },
  },
  argTypes: {
    label: { control: 'text' },
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
  },
  render: (args) => html`
    <void-divider
      orientation=${args.orientation || 'horizontal'}
      label=${args.label || ''}
    ></void-divider>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => html`
    <div style="padding: 24px;">
      <p style="margin: 0 0 16px;">Content above the divider.</p>
      <void-divider></void-divider>
      <p style="margin: 16px 0 0;">Content below the divider.</p>
    </div>
  `,
};

export const WithLabel: Story = {
  render: () => html`
    <div style="padding: 24px;">
      <p style="margin: 0 0 16px;">Content above the divider.</p>
      <void-divider label="or continue with"></void-divider>
      <p style="margin: 16px 0 0;">Content below the divider.</p>
    </div>
  `,
};

export const Vertical: Story = {
  render: () => html`
    <div style="display: flex; align-items: stretch; height: 80px; padding: 24px; gap: 16px;">
      <span>Left content</span>
      <void-divider orientation="vertical"></void-divider>
      <span>Right content</span>
    </div>
  `,
};
