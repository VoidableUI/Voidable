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
        component: 'Native dropdown for small option sets where a simple pick-one is sufficient. Write the native `<select>` (with `name`, `required`, `disabled` and the options) inside `<void-select>`: it is the form control and works before the script loads. Use Combobox when options need search, or Multiselect when multiple values can be chosen.',
      },
    },
  },
  argTypes: argTypesFor('void-select'),
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (args) => html`
    <void-select aria-label="Preferred option" size=${args.size || 'md'} error=${args.error || ''}>
      <select name="choice">
        <option value="" disabled selected hidden>Select an option...</option>
        <option value="1">Option 1</option>
        <option value="2">Option 2</option>
        <option value="3">Option 3</option>
      </select>
    </void-select>
  `,
};

export const WithError: Story = {
  render: () => html`
    <void-select aria-label="Preferred option" error="Please select an option">
      <select>
        <option value="">Select an option...</option>
        <option value="1">Option 1</option>
        <option value="2">Option 2</option>
      </select>
    </void-select>
  `,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px; max-width: 400px;">
      <void-select aria-label="Preferred option" size="sm"><select><option>Small</option></select></void-select>
      <void-select aria-label="Preferred option" size="md"><select><option>Medium</option></select></void-select>
      <void-select aria-label="Preferred option" size="lg"><select><option>Large</option></select></void-select>
    </div>
  `,
};

export const Disabled: Story = {
  render: () => html`
    <void-select aria-label="Preferred option">
      <select disabled>
        <option>Disabled select</option>
      </select>
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
      <select>
        <option value="new">Newest</option>
        <option value="old">Oldest</option>
      </select>
    </void-select>
  `,
};
