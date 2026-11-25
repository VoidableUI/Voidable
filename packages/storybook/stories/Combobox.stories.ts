import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';
import { argTypesFor } from '../.storybook/manifest';

const meta: Meta = {
  title: 'Form/Combobox',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `Filterable dropdown for long option lists like country selectors, user assignment fields, and tag pickers. Users can type to narrow results before selecting.

**Keyboard**

Pattern: combobox with listbox popup. The native input is the combobox; \`aria-activedescendant\` marks the highlighted option.

| Key | Action |
|-----|--------|
| Down Arrow / Up Arrow | Open the list, or highlight the next / previous option (wraps) |
| Alt + Down Arrow | Open without highlighting |
| Alt + Up Arrow | Close the list |
| Enter | Choose the highlighted option; with none highlighted the list closes and the key is left alone, so a surrounding form submits |
| Escape | Close the list |
| Left / Right / Home / End | Move the text cursor; the highlight leaves the list |
| Tab | Close the list and move on |`,
      },
    },
  },
  argTypes: argTypesFor('void-combobox'),
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (args) => html`
    <void-combobox aria-label="Search options"
      size=${args.size || 'md'}
      ?disabled=${args.disabled}
      error=${args.error || ''}
      placeholder=${args.placeholder || 'Select a framework...'}
      value=${args.value || ''}
    >
      <void-combobox-content>
        <void-option value="react">React</void-option>
        <void-option value="vue">Vue</void-option>
        <void-option value="svelte">Svelte</void-option>
        <void-option value="angular">Angular</void-option>
        <void-option value="solid">Solid</void-option>
        <void-option value="lit">Lit</void-option>
      </void-combobox-content>
    </void-combobox>
  `,
};

export const WithValue: Story = {
  render: () => html`
    <void-combobox aria-label="Select a framework" value="vue" placeholder="Select a framework...">
      <void-combobox-content>
        <void-option value="react">React</void-option>
        <void-option value="vue">Vue</void-option>
        <void-option value="svelte">Svelte</void-option>
        <void-option value="angular">Angular</void-option>
        <void-option value="solid">Solid</void-option>
        <void-option value="lit">Lit</void-option>
      </void-combobox-content>
    </void-combobox>
  `,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px; max-width: 400px;">
      <void-combobox aria-label="Small" size="sm" placeholder="Small">
        <void-combobox-content>
          <void-option value="a">Option A</void-option>
          <void-option value="b">Option B</void-option>
          <void-option value="c">Option C</void-option>
        </void-combobox-content>
      </void-combobox>
      <void-combobox aria-label="Medium" size="md" placeholder="Medium">
        <void-combobox-content>
          <void-option value="a">Option A</void-option>
          <void-option value="b">Option B</void-option>
          <void-option value="c">Option C</void-option>
        </void-combobox-content>
      </void-combobox>
      <void-combobox aria-label="Large" size="lg" placeholder="Large">
        <void-combobox-content>
          <void-option value="a">Option A</void-option>
          <void-option value="b">Option B</void-option>
          <void-option value="c">Option C</void-option>
        </void-combobox-content>
      </void-combobox>
    </div>
  `,
};

export const WithError: Story = {
  render: () => html`
    <void-combobox aria-label="Select a framework" error="Please select an option" placeholder="Select a framework...">
      <void-combobox-content>
        <void-option value="react">React</void-option>
        <void-option value="vue">Vue</void-option>
        <void-option value="svelte">Svelte</void-option>
        <void-option value="angular">Angular</void-option>
        <void-option value="solid">Solid</void-option>
        <void-option value="lit">Lit</void-option>
      </void-combobox-content>
    </void-combobox>
  `,
};

export const Disabled: Story = {
  render: () => html`
    <void-combobox aria-label="Select a framework" disabled placeholder="Select a framework...">
      <void-combobox-content>
        <void-option value="react">React</void-option>
        <void-option value="vue">Vue</void-option>
        <void-option value="svelte">Svelte</void-option>
        <void-option value="angular">Angular</void-option>
        <void-option value="solid">Solid</void-option>
        <void-option value="lit">Lit</void-option>
      </void-combobox-content>
    </void-combobox>
  `,
};

export const DisabledOption: Story = {
  render: () => html`
    <void-combobox aria-label="Select a framework" placeholder="Select a framework...">
      <void-combobox-content>
        <void-option value="react">React</void-option>
        <void-option value="vue">Vue</void-option>
        <void-option value="svelte" disabled>Svelte (unavailable)</void-option>
        <void-option value="lit">Lit</void-option>
      </void-combobox-content>
    </void-combobox>
  `,
};

export const RichOptions: Story = {
  parameters: {
    docs: {
      description: {
        story: 'An option may hold more than text. `label` is the plain text the field shows once it is chosen, and what typing filters on; `selected` marks the initial choice.',
      },
    },
  },
  render: () => html`
    <void-combobox aria-label="Assignee" placeholder="Assign to...">
      <void-combobox-content>
        <void-option value="ada" label="Ada Lovelace"><void-avatar initials="AL" size="sm"></void-avatar> Ada Lovelace</void-option>
        <void-option value="grace" label="Grace Hopper" selected><void-avatar initials="GH" size="sm"></void-avatar> Grace Hopper</void-option>
        <void-option value="alan" label="Alan Turing"><void-avatar initials="AT" size="sm"></void-avatar> Alan Turing</void-option>
      </void-combobox-content>
    </void-combobox>
  `,
};
