import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Components/ScrollArea',
  component: 'void-scroll-area',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Height-constrained scrollable region for long lists, code blocks, and log viewers that need consistent, cross-browser scrollbar styling. Supports vertical, horizontal, and bidirectional scroll.',
      },
    },
  },
  argTypes: {
    maxHeight: {
      control: { type: 'text' },
    },
    direction: {
      control: { type: 'select' },
      options: ['vertical', 'horizontal', 'both'],
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {
    maxHeight: '200px',
    direction: 'vertical',
  },
  render: (args) => html`
    <void-scroll-area maxHeight=${args.maxHeight} direction=${args.direction}>
      <p>Line 1 — The scroll area constrains content height and provides a styled scrollbar.</p>
      <p>Line 2 — Scroll down to see more content within this container.</p>
      <p>Line 3 — All content is preserved as Light DOM children.</p>
      <p>Line 4 — The scrollbar appearance is consistent across browsers.</p>
      <p>Line 5 — No JavaScript scroll logic is needed for basic usage.</p>
      <p>Line 6 — Adjust maxHeight to control how much is visible at once.</p>
      <p>Line 7 — End of content.</p>
    </void-scroll-area>
  `,
};

export const Vertical: Story = {
  render: () => html`
    <void-scroll-area maxHeight="150px" direction="vertical">
      <p>Alpha</p>
      <p>Beta</p>
      <p>Gamma</p>
      <p>Delta</p>
      <p>Epsilon</p>
      <p>Zeta</p>
      <p>Eta</p>
    </void-scroll-area>
  `,
};

export const Horizontal: Story = {
  render: () => html`
    <void-scroll-area direction="horizontal" style="max-width: 300px;">
      <div style="display: flex; gap: 1rem; width: max-content;">
        <div style="min-width: 120px; padding: 0.5rem; border: 1px solid var(--void-color-border); border-radius: 4px;">Panel A</div>
        <div style="min-width: 120px; padding: 0.5rem; border: 1px solid var(--void-color-border); border-radius: 4px;">Panel B</div>
        <div style="min-width: 120px; padding: 0.5rem; border: 1px solid var(--void-color-border); border-radius: 4px;">Panel C</div>
        <div style="min-width: 120px; padding: 0.5rem; border: 1px solid var(--void-color-border); border-radius: 4px;">Panel D</div>
        <div style="min-width: 120px; padding: 0.5rem; border: 1px solid var(--void-color-border); border-radius: 4px;">Panel E</div>
      </div>
    </void-scroll-area>
  `,
};

export const Both: Story = {
  render: () => html`
    <void-scroll-area maxHeight="150px" direction="both" style="max-width: 300px;">
      <div style="width: 600px;">
        <p>Row 1 — This content is wider than the container and taller than maxHeight.</p>
        <p>Row 2 — Scroll both vertically and horizontally to explore all content.</p>
        <p>Row 3 — Useful for wide tables or code blocks with many lines.</p>
        <p>Row 4 — The scrollbars appear on both axes as needed.</p>
        <p>Row 5 — End of content.</p>
      </div>
    </void-scroll-area>
  `,
};

export const NoMaxHeight: Story = {
  render: () => html`
    <void-scroll-area direction="vertical">
      <p>When no maxHeight is set, the scroll area grows with its content.</p>
      <p>No scrollbar will appear unless a height constraint is imposed by a parent element.</p>
    </void-scroll-area>
  `,
};
