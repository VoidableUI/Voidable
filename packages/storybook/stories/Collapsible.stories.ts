import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';

import '@voidable/ui';
import '@voidable/theme';

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
  argTypes: {
    open: { control: 'boolean' },
    disabled: { control: 'boolean' },
    heading: { control: 'text' },
  },
  render: (args) => html`
    <void-collapsible
      heading=${args.heading || 'Click to expand'}
      ?open=${args.open}
      ?disabled=${args.disabled}
    >
      <p style="margin: 0;">This is the collapsible content. It can contain any HTML, including paragraphs, lists, code, and other components.</p>
    </void-collapsible>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};

export const Open: Story = {
  args: {
    open: true,
    heading: 'Already expanded',
  },
  render: (args) => html`
    <void-collapsible heading=${args.heading} ?open=${args.open}>
      <p style="margin: 0;">This collapsible starts in the open state. Click the trigger to collapse it.</p>
    </void-collapsible>
  `,
};

export const Disabled: Story = {
  args: {
    disabled: true,
    heading: 'Cannot be toggled',
  },
  render: (args) => html`
    <void-collapsible heading=${args.heading} ?disabled=${args.disabled}>
      <p style="margin: 0;">This content is hidden and the trigger is disabled.</p>
    </void-collapsible>
  `,
};
