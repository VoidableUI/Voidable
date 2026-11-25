import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';

import '@voidable/ui';
import '@voidable/theme';
import { argTypesFor } from '../.storybook/manifest';

const meta: Meta = {
  title: 'Components/Collapsible',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Simple expand/collapse panel for FAQ sections, spoiler text, and progressive disclosure of secondary content. Unlike Accordion, Collapsible manages a single section independently.',
      },
    },
  },
  argTypes: argTypesFor('void-collapsible'),
  render: (args) => html`
    <void-collapsible ?open=${args.open} ?disabled=${args.disabled}>
      <void-collapsible-trigger>Click to expand</void-collapsible-trigger>
      <void-collapsible-content>
        <p style="margin: 0;">This is the collapsible content. It can contain any HTML, including paragraphs, lists, code, and other components.</p>
      </void-collapsible-content>
    </void-collapsible>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};

export const Open: Story = {
  args: {
    open: true,
  },
  render: (args) => html`
    <void-collapsible ?open=${args.open}>
      <void-collapsible-trigger>Already expanded</void-collapsible-trigger>
      <void-collapsible-content>
        <p style="margin: 0;">This collapsible starts in the open state. Click the trigger to collapse it.</p>
      </void-collapsible-content>
    </void-collapsible>
  `,
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
  render: (args) => html`
    <void-collapsible ?disabled=${args.disabled}>
      <void-collapsible-trigger>Cannot be toggled</void-collapsible-trigger>
      <void-collapsible-content>
        <p style="margin: 0;">This content is hidden and the trigger is disabled.</p>
      </void-collapsible-content>
    </void-collapsible>
  `,
};
