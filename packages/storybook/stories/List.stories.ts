import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';

import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Components/List',
  tags: ['autodocs'],
  argTypes: {
    dividers: { control: 'boolean' },
  },
  render: (args) => html`
    <void-list ?dividers=${args.dividers}>
      <void-list-item>Item one</void-list-item>
      <void-list-item>Item two</void-list-item>
      <void-list-item>Item three</void-list-item>
    </void-list>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};

export const Dividers: Story = {
  render: () => html`
    <void-list dividers>
      <void-list-item>Item one</void-list-item>
      <void-list-item>Item two</void-list-item>
      <void-list-item>Item three</void-list-item>
    </void-list>
  `,
};

export const Interactive: Story = {
  render: () => html`
    <void-list>
      <void-list-item interactive>Clickable item one</void-list-item>
      <void-list-item interactive>Clickable item two</void-list-item>
      <void-list-item interactive>Clickable item three</void-list-item>
    </void-list>
  `,
};

export const Selected: Story = {
  render: () => html`
    <void-list>
      <void-list-item interactive>Item one</void-list-item>
      <void-list-item interactive selected>Item two (selected)</void-list-item>
      <void-list-item interactive>Item three</void-list-item>
    </void-list>
  `,
};

export const Disabled: Story = {
  render: () => html`
    <void-list>
      <void-list-item interactive>Item one</void-list-item>
      <void-list-item interactive disabled>Item two (disabled)</void-list-item>
      <void-list-item interactive>Item three</void-list-item>
    </void-list>
  `,
};

export const WithDividersAndStates: Story = {
  render: () => html`
    <void-list dividers style="max-width: 320px;">
      <void-list-item interactive>Normal item</void-list-item>
      <void-list-item interactive selected>Selected item</void-list-item>
      <void-list-item interactive disabled>Disabled item</void-list-item>
      <void-list-item interactive>Another item</void-list-item>
    </void-list>
  `,
};
