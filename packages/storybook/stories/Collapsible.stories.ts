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

export const InAForm: Story = {
  parameters: {
    docs: {
      description: {
        story: 'By default one line frames the trigger and, when open, the content with it. In a column of fields, `--void-collapsible-rule-frame: none` removes the frame and `--void-collapsible-padding-inline: 0` the inset of the trigger and the content, so the fields inside line up with the fields above and below.',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: var(--void-space-4); max-width: 24rem;">
      <void-input aria-label="Station" value="Kiruna 3"></void-input>
      <void-collapsible open style="--void-collapsible-rule-frame: none; --void-collapsible-padding-inline: 0;">
        <void-collapsible-trigger>Advanced</void-collapsible-trigger>
        <void-collapsible-content>
          <void-input aria-label="Minimum elevation" value="5"></void-input>
        </void-collapsible-content>
      </void-collapsible>
      <void-input aria-label="Operator" value="Night shift"></void-input>
    </div>
  `,
};
