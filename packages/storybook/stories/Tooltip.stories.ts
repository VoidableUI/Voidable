import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

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
  argTypes: {
    text: {
      control: { type: 'text' },
    },
    position: {
      control: { type: 'select' },
      options: ['top', 'bottom', 'left', 'right'],
    },
    delay: {
      control: { type: 'number' },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {
    text: 'Hello, tooltip!',
    position: 'top',
    delay: 200,
  },
  render: (args) => html`
    <void-tooltip text=${args.text} position=${args.position} .delay=${args.delay}>
      <button style="padding: 0.5rem 1rem; cursor: pointer;">Hover me</button>
    </void-tooltip>
  `,
};

export const Positions: Story = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 4rem; padding: 3rem;">
      <void-tooltip text="Top tooltip" position="top">
        <button style="padding: 0.5rem 1rem; cursor: pointer;">Top</button>
      </void-tooltip>
      <void-tooltip text="Bottom tooltip" position="bottom">
        <button style="padding: 0.5rem 1rem; cursor: pointer;">Bottom</button>
      </void-tooltip>
      <void-tooltip text="Left tooltip" position="left">
        <button style="padding: 0.5rem 1rem; cursor: pointer;">Left</button>
      </void-tooltip>
      <void-tooltip text="Right tooltip" position="right">
        <button style="padding: 0.5rem 1rem; cursor: pointer;">Right</button>
      </void-tooltip>
    </div>
  `,
};

export const OnText: Story = {
  render: () => html`
    <p style="font-size: 1rem;">
      Hover over
      <void-tooltip text="This is an explanation">
        <span style="text-decoration: underline dotted; cursor: help;">this term</span>
      </void-tooltip>
      for details.
    </p>
  `,
};

export const WithDelay: Story = {
  render: () => html`
    <div style="display: flex; gap: 2rem; padding: 2rem;">
      <void-tooltip text="No delay" .delay=${0}>
        <button style="padding: 0.5rem 1rem; cursor: pointer;">Instant</button>
      </void-tooltip>
      <void-tooltip text="800ms delay" .delay=${800}>
        <button style="padding: 0.5rem 1rem; cursor: pointer;">Slow</button>
      </void-tooltip>
    </div>
  `,
};
