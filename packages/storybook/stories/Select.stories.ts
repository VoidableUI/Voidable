import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';
import { argTypesFor } from '../.storybook/manifest';

const meta: Meta = {
  title: 'Form/Select',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Native dropdown for small option sets where a simple pick-one is sufficient. Use Combobox when options need search, or Multiselect when multiple values can be chosen.',
      },
    },
  },
  argTypes: argTypesFor('void-select'),
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (args) => html`
    <void-select aria-label="Choose an option" size=${args.size || 'md'} ?disabled=${args.disabled} error=${args.error || ''}>
      <option value="">Select an option...</option>
      <option value="1">Option 1</option>
      <option value="2">Option 2</option>
      <option value="3">Option 3</option>
    </void-select>
  `,
};

export const WithError: Story = {
  render: () => html`
    <void-select aria-label="Choose an option" error="Please select an option">
      <option value="">Select an option...</option>
      <option value="1">Option 1</option>
      <option value="2">Option 2</option>
    </void-select>
  `,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px; max-width: 400px;">
      <void-select aria-label="Choose an option" size="sm"><option>Small</option></void-select>
      <void-select aria-label="Choose an option" size="md"><option>Medium</option></void-select>
      <void-select aria-label="Choose an option" size="lg"><option>Large</option></void-select>
    </div>
  `,
};

export const Disabled: Story = {
  render: () => html`
    <void-select aria-label="Choose an option" disabled>
      <option>Disabled select</option>
    </void-select>
  `,
};

export const LabelledByAriaLabel: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Without a visible label, `aria-label` (or `aria-labelledby`) on the host names the native select inside, as on every component that renders its own control.',
      },
    },
  },
  render: () => html`
    <void-select aria-label="Sort by">
      <option value="new">Newest</option>
      <option value="old">Oldest</option>
    </void-select>
  `,
};
