import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';
import { argTypesFor } from '../.storybook/manifest';

const meta: Meta = {
  title: 'Components/Tooltip',
  component: 'void-tooltip',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Hover-triggered label for icon buttons, abbreviated text, and UI controls that need a brief text explanation without taking up permanent space. Positions automatically around the trigger element.',
      },
    },
  },
  argTypes: argTypesFor('void-tooltip', { text: { control: { type: 'text' }, description: 'Story control: the text of the <void-tooltip-content> part.' } }),
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {
    text: 'Hello, tooltip!',
    side: 'top',
    align: 'center',
    open: false,
    delay: 200,
  },
  render: (args) => html`
    <void-tooltip side=${args.side} align=${args.align} ?open=${args.open} .delay=${args.delay}>
      <void-tooltip-trigger><button style="padding: 0.5rem 1rem; cursor: pointer;">Hover me</button></void-tooltip-trigger>
      <void-tooltip-content>${args.text}</void-tooltip-content>
    </void-tooltip>
  `,
};

export const Positions: Story = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 4rem; padding: 3rem;">
      <void-tooltip side="top">
        <void-tooltip-trigger><button style="padding: 0.5rem 1rem; cursor: pointer;">Top</button></void-tooltip-trigger>
        <void-tooltip-content>Top tooltip</void-tooltip-content>
      </void-tooltip>
      <void-tooltip side="bottom">
        <void-tooltip-trigger><button style="padding: 0.5rem 1rem; cursor: pointer;">Bottom</button></void-tooltip-trigger>
        <void-tooltip-content>Bottom tooltip</void-tooltip-content>
      </void-tooltip>
      <void-tooltip side="left">
        <void-tooltip-trigger><button style="padding: 0.5rem 1rem; cursor: pointer;">Left</button></void-tooltip-trigger>
        <void-tooltip-content>Left tooltip</void-tooltip-content>
      </void-tooltip>
      <void-tooltip side="right">
        <void-tooltip-trigger><button style="padding: 0.5rem 1rem; cursor: pointer;">Right</button></void-tooltip-trigger>
        <void-tooltip-content>Right tooltip</void-tooltip-content>
      </void-tooltip>
    </div>
  `,
};

export const OnText: Story = {
  render: () => html`
    <p style="font-size: 1rem;">
      Hover over
      <void-tooltip>
        <void-tooltip-trigger><span style="text-decoration: underline dotted; cursor: help;">this term</span></void-tooltip-trigger>
        <void-tooltip-content>This is an explanation</void-tooltip-content>
      </void-tooltip>
      for details.
    </p>
  `,
};

export const WithDelay: Story = {
  render: () => html`
    <div style="display: flex; gap: 2rem; padding: 2rem;">
      <void-tooltip .delay=${0}>
        <void-tooltip-trigger><button style="padding: 0.5rem 1rem; cursor: pointer;">Instant</button></void-tooltip-trigger>
        <void-tooltip-content>No delay</void-tooltip-content>
      </void-tooltip>
      <void-tooltip .delay=${800}>
        <void-tooltip-trigger><button style="padding: 0.5rem 1rem; cursor: pointer;">Slow</button></void-tooltip-trigger>
        <void-tooltip-content>800ms delay</void-tooltip-content>
      </void-tooltip>
    </div>
  `,
};
