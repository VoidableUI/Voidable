import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';

import '@voidable/ui';
import '@voidable/theme';
import { argTypesFor } from '../.storybook/manifest';

const meta: Meta = {
  title: 'Form/Textarea',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Multi-line text entry for comment fields, bio inputs, and description forms where users need room to write paragraphs. Supports resize control, row count, and validation error display.',
      },
    },
  },
  argTypes: argTypesFor('void-textarea'),
  render: (args) => html`
    <void-textarea aria-label="Message"
      placeholder=${args.placeholder || 'Enter text…'}
      ?disabled=${args.disabled}
      ?readonly=${args.readonly}
      rows=${args.rows || 3}
      resize=${args.resize || 'vertical'}
      size=${args.size || 'md'}
      error=${args.error || ''}
    ></void-textarea>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};

export const WithError: Story = {
  args: { error: 'This field is required.' },
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <void-textarea aria-label="Small" size="sm" placeholder="Small"></void-textarea>
      <void-textarea aria-label="Medium" size="md" placeholder="Medium"></void-textarea>
      <void-textarea aria-label="Large" size="lg" placeholder="Large"></void-textarea>
    </div>
  `,
};

export const Autosize: Story = {
  render: () => html`
    <void-field label="Notes" helper="Two lines when empty, growing to six, then it scrolls.">
      <void-textarea name="notes" autosize rows="2" max-rows="6" placeholder="Start typing…"></void-textarea>
    </void-field>
  `,
};

export const AutosizeWithValue: Story = {
  render: () => html`
    <void-textarea aria-label="Description" autosize rows="2" max-rows="10"
      value="A server-rendered value.&#10;Each line is shown without a scrollbar,&#10;up to ten lines.&#10;&#10;Edit it and the box follows."></void-textarea>
  `,
};

export const Disabled: Story = {
  args: { disabled: true, placeholder: 'Disabled textarea' },
};
