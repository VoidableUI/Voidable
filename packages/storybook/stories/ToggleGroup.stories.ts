import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Components/ToggleGroup',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Coordinated set of toggle buttons for text-formatting toolbars, alignment pickers, and multi-select option groups. Manages single or multiple active states across its child toggles.',
      },
    },
  },
  argTypes: {
    value: { control: 'text' },
    multiple: { control: 'boolean' },
    disabled: { control: 'boolean' },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    color: { control: 'select', options: ['default', 'error', 'warning', 'success', 'info', 'notice'] },
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
  },
  render: (args) => html`
    <void-toggle-group
      value=${args.value || 'bold'}
      size=${args.size || 'md'}
      color=${args.color || 'default'}
      orientation=${args.orientation || 'horizontal'}
      ?multiple=${args.multiple}
      ?disabled=${args.disabled}
    >
      <void-toggle value="bold">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
          <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
        </svg>
      </void-toggle>
      <void-toggle value="italic">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="4" x2="10" y2="4"/>
          <line x1="14" y1="20" x2="5" y2="20"/>
          <line x1="15" y1="4" x2="9" y2="20"/>
        </svg>
      </void-toggle>
      <void-toggle value="underline">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 4v6a6 6 0 0 0 12 0V4"/>
          <line x1="4" y1="20" x2="20" y2="20"/>
        </svg>
      </void-toggle>
    </void-toggle-group>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { value: 'bold' },
};

export const Multiple: Story = {
  args: { multiple: true, value: 'bold,underline' },
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; align-items: flex-start;">
      <void-toggle-group value="a" size="sm">
        <void-toggle value="a">A</void-toggle>
        <void-toggle value="b">B</void-toggle>
        <void-toggle value="c">C</void-toggle>
      </void-toggle-group>
      <void-toggle-group value="a" size="md">
        <void-toggle value="a">A</void-toggle>
        <void-toggle value="b">B</void-toggle>
        <void-toggle value="c">C</void-toggle>
      </void-toggle-group>
      <void-toggle-group value="a" size="lg">
        <void-toggle value="a">A</void-toggle>
        <void-toggle value="b">B</void-toggle>
        <void-toggle value="c">C</void-toggle>
      </void-toggle-group>
    </div>
  `,
};

export const Colors: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; align-items: flex-start;">
      <void-toggle-group value="a" color="default">
        <void-toggle value="a">A</void-toggle>
        <void-toggle value="b">B</void-toggle>
        <void-toggle value="c">C</void-toggle>
      </void-toggle-group>
      <void-toggle-group value="a" color="error">
        <void-toggle value="a">A</void-toggle>
        <void-toggle value="b">B</void-toggle>
        <void-toggle value="c">C</void-toggle>
      </void-toggle-group>
      <void-toggle-group value="a" color="success">
        <void-toggle value="a">A</void-toggle>
        <void-toggle value="b">B</void-toggle>
        <void-toggle value="c">C</void-toggle>
      </void-toggle-group>
      <void-toggle-group value="a" color="warning">
        <void-toggle value="a">A</void-toggle>
        <void-toggle value="b">B</void-toggle>
        <void-toggle value="c">C</void-toggle>
      </void-toggle-group>
      <void-toggle-group value="a" color="info">
        <void-toggle value="a">A</void-toggle>
        <void-toggle value="b">B</void-toggle>
        <void-toggle value="c">C</void-toggle>
      </void-toggle-group>
      <void-toggle-group value="a" color="notice">
        <void-toggle value="a">A</void-toggle>
        <void-toggle value="b">B</void-toggle>
        <void-toggle value="c">C</void-toggle>
      </void-toggle-group>
      <void-toggle-group value="good">
        <void-toggle value="good" color="success">Good</void-toggle>
        <void-toggle value="meh" color="warning">Meh</void-toggle>
        <void-toggle value="bad" color="error">Bad</void-toggle>
      </void-toggle-group>
    </div>
  `,
};

export const Vertical: Story = {
  render: () => html`
    <void-toggle-group value="left" orientation="vertical">
      <void-toggle value="left">Left</void-toggle>
      <void-toggle value="center">Center</void-toggle>
      <void-toggle value="right">Right</void-toggle>
    </void-toggle-group>
  `,
};

export const Disabled: Story = {
  render: () => html`
    <void-toggle-group value="a" disabled>
      <void-toggle value="a">A</void-toggle>
      <void-toggle value="b">B</void-toggle>
      <void-toggle value="c">C</void-toggle>
    </void-toggle-group>
  `,
};

export const TextFormatting: Story = {
  render: () => html`
    <void-toggle-group multiple value="bold,italic">
      <void-toggle value="bold">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
          <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
        </svg>
      </void-toggle>
      <void-toggle value="italic">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="4" x2="10" y2="4"/>
          <line x1="14" y1="20" x2="5" y2="20"/>
          <line x1="15" y1="4" x2="9" y2="20"/>
        </svg>
      </void-toggle>
      <void-toggle value="underline">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 4v6a6 6 0 0 0 12 0V4"/>
          <line x1="4" y1="20" x2="20" y2="20"/>
        </svg>
      </void-toggle>
      <void-toggle value="strikethrough">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 4H9a3 3 0 0 0-2.83 4"/>
          <path d="M14 12a4 4 0 0 1 0 8H6"/>
          <line x1="4" y1="12" x2="20" y2="12"/>
        </svg>
      </void-toggle>
    </void-toggle-group>
  `,
};
