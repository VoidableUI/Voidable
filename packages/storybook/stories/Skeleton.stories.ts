import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Components/Skeleton',
  component: 'void-skeleton',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Animated placeholder for content that is loading — use in card grids, feed lists, and profile pages to reduce perceived wait time. Comes in text, circular, and rectangular shapes to match the content it replaces.',
      },
    },
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['text', 'circular', 'rectangular'],
    },
  },
};

export default meta;
type Story = StoryObj;

export const Text: Story = {
  name: 'Text (default)',
  render: () => html`<void-skeleton variant="text"></void-skeleton>`,
};

export const Circular: Story = {
  name: 'Circular',
  render: () => html`<void-skeleton variant="circular"></void-skeleton>`,
};

export const Rectangular: Story = {
  name: 'Rectangular',
  render: () => html`<void-skeleton variant="rectangular"></void-skeleton>`,
};

export const ContentPlaceholder: Story = {
  name: 'ContentPlaceholder',
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 0.75rem; max-width: 20rem; padding: 1rem; border: 1px solid #e0e0e0; border-radius: 0.5rem;">
      <void-skeleton variant="rectangular"></void-skeleton>
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <void-skeleton variant="circular"></void-skeleton>
        <div style="flex: 1; display: flex; flex-direction: column; gap: 0.5rem;">
          <void-skeleton variant="text"></void-skeleton>
          <void-skeleton variant="text" style="width: 60%;"></void-skeleton>
        </div>
      </div>
      <void-skeleton variant="text"></void-skeleton>
      <void-skeleton variant="text"></void-skeleton>
      <void-skeleton variant="text" style="width: 80%;"></void-skeleton>
    </div>
  `,
};
