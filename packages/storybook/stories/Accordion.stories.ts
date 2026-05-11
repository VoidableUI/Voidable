import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';

import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Components/Accordion',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Collapsible content sections for FAQs, settings panels, and long-form content that users explore selectively. Supports multiple-open mode for independent sections.',
      },
    },
  },
  argTypes: {
    multiple: { control: 'boolean' },
  },
  render: (args) => html`
    <void-accordion ?multiple=${args.multiple}>
      <void-accordion-item heading="Section 1">Content for section 1</void-accordion-item>
      <void-accordion-item heading="Section 2">Content for section 2</void-accordion-item>
      <void-accordion-item heading="Section 3">Content for section 3</void-accordion-item>
    </void-accordion>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};

export const OneOpen: Story = {
  render: () => html`
    <void-accordion>
      <void-accordion-item heading="Section 1" open>Content for section 1</void-accordion-item>
      <void-accordion-item heading="Section 2">Content for section 2</void-accordion-item>
      <void-accordion-item heading="Section 3">Content for section 3</void-accordion-item>
    </void-accordion>
  `,
};

export const Multiple: Story = {
  render: () => html`
    <void-accordion multiple>
      <void-accordion-item heading="Section 1" open>Content for section 1</void-accordion-item>
      <void-accordion-item heading="Section 2" open>Content for section 2</void-accordion-item>
      <void-accordion-item heading="Section 3">Content for section 3</void-accordion-item>
    </void-accordion>
  `,
};

export const RichContent: Story = {
  render: () => html`
    <void-accordion style="max-width: 480px;">
      <void-accordion-item heading="What is Void UI?" open>
        <p style="margin: 0;">Void UI is a design system built with Lit web components. It uses Light DOM for seamless CSS integration.</p>
      </void-accordion-item>
      <void-accordion-item heading="How do I install it?">
        <p style="margin: 0 0 8px;">Install via npm:</p>
        <code>npm install @voidable/ui @voidable/theme</code>
      </void-accordion-item>
      <void-accordion-item heading="Is it accessible?">
        <p style="margin: 0;">Yes. All components use proper ARIA attributes, keyboard navigation, and focus management.</p>
      </void-accordion-item>
    </void-accordion>
  `,
};
