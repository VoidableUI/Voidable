import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';
import { argTypesFor } from '../.storybook/manifest';

const meta: Meta = {
  title: 'Form/Multiselect',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `Multi-value picker for tag selection, permission assignment, and filter fields that allow several simultaneous choices. Selected values appear as removable chips.

**Keyboard**

Pattern: select-only combobox with a multiselectable listbox. The trigger is the combobox.

| Key | Action |
|-----|--------|
| Enter / Space / Down Arrow / Up Arrow | Open the list |
| Home / End | Open on the first / last option; when open, highlight it |
| Down Arrow / Up Arrow (open) | Highlight the next / previous option; stops at the ends |
| Page Down / Page Up (open) | Move the highlight ten options |
| Enter / Space (open) | Toggle the highlighted option; the list stays open |
| Characters (open) | Jump to the next option starting with them |
| Alt + Up Arrow / Escape / Tab | Close the list |`,
      },
    },
  },
  argTypes: argTypesFor('void-multiselect'),
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
      <void-multiselect-content>
        <void-option value="react">React</void-option>
        <void-option value="vue">Vue</void-option>
        <void-option value="svelte">Svelte</void-option>
        <void-option value="angular">Angular</void-option>
        <void-option value="solid">Solid</void-option>
        <void-option value="lit">Lit</void-option>
      </void-multiselect-content>
    </void-multiselect>
  `,
};

export const Preselected: Story = {
  render: () => html`
    <void-multiselect placeholder="Select frameworks...">
      <void-multiselect-content>
        <void-option value="react" selected>React</void-option>
        <void-option value="vue" selected>Vue</void-option>
        <void-option value="svelte" selected>Svelte</void-option>
        <void-option value="angular">Angular</void-option>
        <void-option value="solid">Solid</void-option>
        <void-option value="lit">Lit</void-option>
      </void-multiselect-content>
    </void-multiselect>
  `,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px; max-width: 400px;">
      <void-multiselect size="sm" placeholder="Small">
        <void-multiselect-content>
          <void-option value="a">Option A</void-option>
          <void-option value="b">Option B</void-option>
        </void-multiselect-content>
      </void-multiselect>
      <void-multiselect size="md" placeholder="Medium">
        <void-multiselect-content>
          <void-option value="a">Option A</void-option>
          <void-option value="b">Option B</void-option>
        </void-multiselect-content>
      </void-multiselect>
      <void-multiselect size="lg" placeholder="Large">
        <void-multiselect-content>
          <void-option value="a">Option A</void-option>
          <void-option value="b">Option B</void-option>
        </void-multiselect-content>
      </void-multiselect>
    </div>
  `,
};

export const WithError: Story = {
  render: () => html`
    <void-multiselect error="Please select at least one option" placeholder="Select frameworks...">
      <void-multiselect-content>
        <void-option value="react">React</void-option>
        <void-option value="vue">Vue</void-option>
        <void-option value="svelte">Svelte</void-option>
      </void-multiselect-content>
    </void-multiselect>
  `,
};

export const Disabled: Story = {
  render: () => html`
    <void-multiselect disabled placeholder="Select frameworks...">
      <void-multiselect-content>
        <void-option value="react">React</void-option>
        <void-option value="vue">Vue</void-option>
        <void-option value="svelte">Svelte</void-option>
      </void-multiselect-content>
    </void-multiselect>
  `,
};

export const DisabledOption: Story = {
  render: () => html`
    <void-multiselect placeholder="Select skills...">
      <void-multiselect-content>
        <void-option value="css">CSS</void-option>
        <void-option value="js">JavaScript</void-option>
        <void-option value="go" disabled>Go (unavailable)</void-option>
        <void-option value="rust">Rust</void-option>
      </void-multiselect-content>
    </void-multiselect>
  `,
};
