import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Form/Combobox',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Filterable dropdown for long option lists like country selectors, user assignment fields, and tag pickers. Users can type to narrow results before selecting.',
      },
    },
  },
  argTypes: {
    disabled: { control: 'boolean' },
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl', 'xxl'] },
    error: { control: 'text' },
    placeholder: { control: 'text' },
    value: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (args) => html`
    <void-combobox
      size=${args.size || 'md'}
      ?disabled=${args.disabled}
      error=${args.error || ''}
      placeholder=${args.placeholder || 'Select a framework...'}
      value=${args.value || ''}
    >
      <void-option value="react">React</void-option>
      <void-option value="vue">Vue</void-option>
      <void-option value="svelte">Svelte</void-option>
      <void-option value="angular">Angular</void-option>
      <void-option value="solid">Solid</void-option>
      <void-option value="lit">Lit</void-option>
    </void-combobox>
  `,
};

export const WithValue: Story = {
  render: () => html`
    <void-combobox value="vue" placeholder="Select a framework...">
      <void-option value="react">React</void-option>
      <void-option value="vue">Vue</void-option>
      <void-option value="svelte">Svelte</void-option>
      <void-option value="angular">Angular</void-option>
      <void-option value="solid">Solid</void-option>
      <void-option value="lit">Lit</void-option>
    </void-combobox>
  `,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px; max-width: 400px;">
      <void-combobox size="sm" placeholder="Small">
        <void-option value="a">Option A</void-option>
        <void-option value="b">Option B</void-option>
        <void-option value="c">Option C</void-option>
      </void-combobox>
      <void-combobox size="md" placeholder="Medium">
        <void-option value="a">Option A</void-option>
        <void-option value="b">Option B</void-option>
        <void-option value="c">Option C</void-option>
      </void-combobox>
      <void-combobox size="lg" placeholder="Large">
        <void-option value="a">Option A</void-option>
        <void-option value="b">Option B</void-option>
        <void-option value="c">Option C</void-option>
      </void-combobox>
      <void-combobox size="xl" placeholder="XL">
        <void-option value="a">Option A</void-option>
        <void-option value="b">Option B</void-option>
        <void-option value="c">Option C</void-option>
      </void-combobox>
      <void-combobox size="xxl" placeholder="XXL">
        <void-option value="a">Option A</void-option>
        <void-option value="b">Option B</void-option>
        <void-option value="c">Option C</void-option>
      </void-combobox>
    </div>
  `,
};

export const WithError: Story = {
  render: () => html`
    <void-combobox error="Please select an option" placeholder="Select a framework...">
      <void-option value="react">React</void-option>
      <void-option value="vue">Vue</void-option>
      <void-option value="svelte">Svelte</void-option>
      <void-option value="angular">Angular</void-option>
      <void-option value="solid">Solid</void-option>
      <void-option value="lit">Lit</void-option>
    </void-combobox>
  `,
};

export const Disabled: Story = {
  render: () => html`
    <void-combobox disabled placeholder="Select a framework...">
      <void-option value="react">React</void-option>
      <void-option value="vue">Vue</void-option>
      <void-option value="svelte">Svelte</void-option>
      <void-option value="angular">Angular</void-option>
      <void-option value="solid">Solid</void-option>
      <void-option value="lit">Lit</void-option>
    </void-combobox>
  `,
};
