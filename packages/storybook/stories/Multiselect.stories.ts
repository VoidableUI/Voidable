import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Form/Multiselect',
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl', 'xxl'] },
    error: { control: 'text' },
    placeholder: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (args) => html`
    <void-multiselect
      size=${args.size || 'md'}
      ?disabled=${args.disabled}
      error=${args.error || ''}
      placeholder=${args.placeholder || 'Select frameworks...'}
    >
      <void-option value="react">React</void-option>
      <void-option value="vue">Vue</void-option>
      <void-option value="svelte">Svelte</void-option>
      <void-option value="angular">Angular</void-option>
      <void-option value="solid">Solid</void-option>
      <void-option value="lit">Lit</void-option>
    </void-multiselect>
  `,
};

export const Preselected: Story = {
  render: () => html`
    <void-multiselect placeholder="Select frameworks...">
      <void-option value="react" selected>React</void-option>
      <void-option value="vue" selected>Vue</void-option>
      <void-option value="svelte" selected>Svelte</void-option>
      <void-option value="angular">Angular</void-option>
      <void-option value="solid">Solid</void-option>
      <void-option value="lit">Lit</void-option>
    </void-multiselect>
  `,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px; max-width: 400px;">
      <void-multiselect size="sm" placeholder="Small">
        <void-option value="a">Option A</void-option>
        <void-option value="b">Option B</void-option>
      </void-multiselect>
      <void-multiselect size="md" placeholder="Medium">
        <void-option value="a">Option A</void-option>
        <void-option value="b">Option B</void-option>
      </void-multiselect>
      <void-multiselect size="lg" placeholder="Large">
        <void-option value="a">Option A</void-option>
        <void-option value="b">Option B</void-option>
      </void-multiselect>
      <void-multiselect size="xl" placeholder="XL">
        <void-option value="a">Option A</void-option>
        <void-option value="b">Option B</void-option>
      </void-multiselect>
      <void-multiselect size="xxl" placeholder="XXL">
        <void-option value="a">Option A</void-option>
        <void-option value="b">Option B</void-option>
      </void-multiselect>
    </div>
  `,
};

export const WithError: Story = {
  render: () => html`
    <void-multiselect error="Please select at least one option" placeholder="Select frameworks...">
      <void-option value="react">React</void-option>
      <void-option value="vue">Vue</void-option>
      <void-option value="svelte">Svelte</void-option>
    </void-multiselect>
  `,
};

export const Disabled: Story = {
  render: () => html`
    <void-multiselect disabled placeholder="Select frameworks...">
      <void-option value="react">React</void-option>
      <void-option value="vue">Vue</void-option>
      <void-option value="svelte">Svelte</void-option>
    </void-multiselect>
  `,
};
