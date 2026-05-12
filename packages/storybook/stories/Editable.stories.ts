import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Components/Editable',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Inline editable text for renaming items, editing headings, and click-to-edit table cells.',
      },
    },
  },
  argTypes: {
    value: { control: 'text' },
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
    submitMode: { control: 'select', options: ['blur', 'enter', 'both'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
  render: (args) => html`
    <void-editable
      value=${args.value || ''}
      placeholder=${args.placeholder || 'Click to edit'}
      submit-mode=${args.submitMode || 'both'}
      size=${args.size || 'md'}
      ?disabled=${args.disabled}
    ></void-editable>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};

export const WithValue: Story = {
  args: { value: 'Project Name' },
};

export const Placeholder: Story = {
  args: { value: '', placeholder: 'Enter a title...' },
};

export const Disabled: Story = {
  args: { value: 'Cannot edit this', disabled: true },
};

export const Inline: Story = {
  render: () => html`
    <p style="max-width: 36rem; line-height: 1.6;">
      The project <void-editable value="Voidable"></void-editable> is maintained by
      <void-editable value="Jane Doe"></void-editable> and was last updated on
      <void-editable value="May 12, 2026"></void-editable>. Click any highlighted
      value to edit it in place.
    </p>
  `,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <void-editable size="sm" value="Small editable"></void-editable>
      <void-editable size="md" value="Medium editable"></void-editable>
      <void-editable size="lg" value="Large editable"></void-editable>
    </div>
  `,
};
