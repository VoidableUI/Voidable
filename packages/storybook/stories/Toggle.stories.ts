import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Components/Toggle',
  tags: ['autodocs'],
  argTypes: {
    pressed: { control: 'boolean' },
    disabled: { control: 'boolean' },
    color: { control: 'select', options: ['default', 'error', 'warning', 'success', 'info', 'notice'] },
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl', 'xxl'] },
    variant: { control: 'select', options: ['outline', 'filled'] },
  },
  render: (args) => html`
    <void-toggle
      color=${args.color || 'default'}
      size=${args.size || 'md'}
      variant=${args.variant || 'outline'}
      ?pressed=${args.pressed}
      ?disabled=${args.disabled}
    >B</void-toggle>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};

export const Pressed: Story = {
  args: { pressed: true },
};

export const Variants: Story = {
  render: () => html`
    <div style="display: flex; gap: 8px; align-items: center;">
      <void-toggle variant="outline">B</void-toggle>
      <void-toggle variant="outline" pressed>B</void-toggle>
      <void-toggle variant="filled">B</void-toggle>
      <void-toggle variant="filled" pressed>B</void-toggle>
    </div>
  `,
};

export const Colors: Story = {
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
      <void-toggle pressed color="default">B</void-toggle>
      <void-toggle pressed color="error">B</void-toggle>
      <void-toggle pressed color="warning">B</void-toggle>
      <void-toggle pressed color="success">B</void-toggle>
      <void-toggle pressed color="info">B</void-toggle>
      <void-toggle pressed color="notice">B</void-toggle>
    </div>
  `,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 8px;">
      <void-toggle size="sm">B</void-toggle>
      <void-toggle size="md">B</void-toggle>
      <void-toggle size="lg">B</void-toggle>
      <void-toggle size="xl">B</void-toggle>
      <void-toggle size="xxl">B</void-toggle>
    </div>
  `,
};

export const Disabled: Story = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 8px;">
      <void-toggle disabled>B</void-toggle>
      <void-toggle disabled pressed>B</void-toggle>
    </div>
  `,
};

export const WithIcon: Story = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 8px;">
      <void-toggle pressed>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
          <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
        </svg>
      </void-toggle>
      <void-toggle>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="4" x2="10" y2="4"/>
          <line x1="14" y1="20" x2="5" y2="20"/>
          <line x1="15" y1="4" x2="9" y2="20"/>
        </svg>
      </void-toggle>
      <void-toggle>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 7V4h16v3"/>
          <path d="M9 20h6"/>
          <path d="M12 4v16"/>
        </svg>
      </void-toggle>
    </div>
  `,
};
