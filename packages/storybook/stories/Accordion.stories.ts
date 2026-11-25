import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';

import '@voidable/ui';
import '@voidable/theme';
import { argTypesFor } from '../.storybook/manifest';

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
  argTypes: argTypesFor('void-accordion'),
  render: (args) => html`
    <void-accordion ?multiple=${args.multiple}>
      <void-accordion-item><void-accordion-trigger>Section 1</void-accordion-trigger><void-accordion-content>Content for section 1</void-accordion-content></void-accordion-item>
      <void-accordion-item><void-accordion-trigger>Section 2</void-accordion-trigger><void-accordion-content>Content for section 2</void-accordion-content></void-accordion-item>
      <void-accordion-item><void-accordion-trigger>Section 3</void-accordion-trigger><void-accordion-content>Content for section 3</void-accordion-content></void-accordion-item>
    </void-accordion>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};

export const OneOpen: Story = {
  render: () => html`
    <void-accordion>
      <void-accordion-item open><void-accordion-trigger>Section 1</void-accordion-trigger><void-accordion-content>Content for section 1</void-accordion-content></void-accordion-item>
      <void-accordion-item><void-accordion-trigger>Section 2</void-accordion-trigger><void-accordion-content>Content for section 2</void-accordion-content></void-accordion-item>
      <void-accordion-item><void-accordion-trigger>Section 3</void-accordion-trigger><void-accordion-content>Content for section 3</void-accordion-content></void-accordion-item>
    </void-accordion>
  `,
};

export const Multiple: Story = {
  render: () => html`
    <void-accordion multiple>
      <void-accordion-item open><void-accordion-trigger>Section 1</void-accordion-trigger><void-accordion-content>Content for section 1</void-accordion-content></void-accordion-item>
      <void-accordion-item open><void-accordion-trigger>Section 2</void-accordion-trigger><void-accordion-content>Content for section 2</void-accordion-content></void-accordion-item>
      <void-accordion-item><void-accordion-trigger>Section 3</void-accordion-trigger><void-accordion-content>Content for section 3</void-accordion-content></void-accordion-item>
    </void-accordion>
  `,
};

export const RichContent: Story = {
  render: () => html`
    <void-accordion style="max-width: 480px;">
      <void-accordion-item open>
        <void-accordion-trigger>What is Void UI?</void-accordion-trigger>
        <void-accordion-content>
          <p style="margin: 0;">Void UI is a design system built with Lit web components. It uses Light DOM for seamless CSS integration.</p>
        </void-accordion-content>
      </void-accordion-item>
      <void-accordion-item>
        <void-accordion-trigger>How do I install it?</void-accordion-trigger>
        <void-accordion-content>
          <p style="margin: 0 0 8px;">Install via npm:</p>
          <code>npm install @voidable/ui @voidable/theme</code>
        </void-accordion-content>
      </void-accordion-item>
      <void-accordion-item>
        <void-accordion-trigger>Is it accessible?</void-accordion-trigger>
        <void-accordion-content>
          <p style="margin: 0;">Yes. All components use proper ARIA attributes, keyboard navigation, and focus management.</p>
        </void-accordion-content>
      </void-accordion-item>
    </void-accordion>
  `,
};
