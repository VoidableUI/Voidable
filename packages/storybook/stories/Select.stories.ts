import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Form/Select',
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl', 'xxl'] },
    error: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (args) => html`
    <void-select size=${args.size || 'md'} ?disabled=${args.disabled} error=${args.error || ''}>
      <option value="">Select an option...</option>
      <option value="1">Option 1</option>
      <option value="2">Option 2</option>
      <option value="3">Option 3</option>
    </void-select>
  `,
};

export const WithError: Story = {
  render: () => html`
    <void-select error="Please select an option">
      <option value="">Select an option...</option>
      <option value="1">Option 1</option>
      <option value="2">Option 2</option>
    </void-select>
  `,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px; max-width: 400px;">
      <void-select size="sm"><option>Small</option></void-select>
      <void-select size="md"><option>Medium</option></void-select>
      <void-select size="lg"><option>Large</option></void-select>
      <void-select size="xl"><option>XL</option></void-select>
      <void-select size="xxl"><option>XXL</option></void-select>
    </div>
  `,
};

export const Disabled: Story = {
  render: () => html`
    <void-select disabled>
      <option>Disabled select</option>
    </void-select>
  `,
};
