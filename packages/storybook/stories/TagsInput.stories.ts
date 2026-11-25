import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';
import { argTypesFor } from '../.storybook/manifest';

const meta: Meta = {
  title: 'Components/TagsInput',
  component: 'void-tags-input',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Multi-tag input field for email recipients, category labels, keyword tagging, and comma-separated value entry.',
      },
    },
  },
  argTypes: argTypesFor('void-tags-input'),
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {
    size: 'md',
    color: 'default',
    placeholder: 'Add tag...',
  },
  render: (args) => html`
    <void-tags-input aria-label="Tags"
      size=${args.size}
      color=${args.color}
      placeholder=${args.placeholder}
      ?disabled=${args.disabled}
      ?readonly=${args.readonly}
    ></void-tags-input>
  `,
};

export const WithTags: Story = {
  render: () => {
    const el = document.createElement('void-tags-input');
    el.setAttribute('aria-label', 'Tags');
    el.value = ['Design', 'Engineering', 'Marketing'];
    return el;
  },
};

export const MaxTags: Story = {
  render: () => {
    const el = document.createElement('void-tags-input');
    el.setAttribute('aria-label', 'Tags');
    el.value = ['Alpha', 'Beta', 'Gamma'];
    el.max = 3;
    // With no entry field (max reached, read-only) the host is the group and has no control to carry an
    // aria-label, so the field names it.
    const field = document.createElement('void-field');
    field.setAttribute('label', 'Tags');
    field.appendChild(el);
    return field;
  },
};

export const Disabled: Story = {
  render: () => {
    const el = document.createElement('void-tags-input');
    el.setAttribute('aria-label', 'Tags');
    el.value = ['Locked', 'Tags'];
    el.disabled = true;
    return el;
  },
};

export const Readonly: Story = {
  render: () => {
    const el = document.createElement('void-tags-input');
    el.setAttribute('aria-label', 'Tags');
    el.value = ['Read', 'Only', 'Tags'];
    el.readonly = true;
    // With no entry field (max reached, read-only) the host is the group and has no control to carry an
    // aria-label, so the field names it.
    const field = document.createElement('void-field');
    field.setAttribute('label', 'Tags');
    field.appendChild(el);
    return field;
  },
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px; max-width: 500px;">
      ${(['sm', 'md', 'lg'] as const).map((size) => {
        const el = document.createElement('void-tags-input');
    el.setAttribute('aria-label', 'Tags');
        el.value = ['Tag A', 'Tag B'];
        el.size = size;
        el.placeholder = `Size: ${size}`;
        return el;
      })}
    </div>
  `,
};

export const Colors: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px; max-width: 500px;">
      ${(['default', 'error', 'warning', 'caution', 'success', 'info', 'notice', 'highlight'] as const).map((color) => {
        const el = document.createElement('void-tags-input');
    el.setAttribute('aria-label', 'Tags');
        el.value = [color];
        el.color = color;
        return el;
      })}
    </div>
  `,
};

export const ColoredTagsOutlined: Story = {
  name: 'Colored Tags - Outlined',
  render: () => {
    const el = document.createElement('void-tags-input');
    el.setAttribute('aria-label', 'Tags');
    el.variant = 'outline';
    el.value = [
      { text: 'Bug', color: 'error' },
      { text: 'Feature', color: 'info' },
      { text: 'Urgent', color: 'warning' },
      { text: 'Shipped', color: 'success' },
      'Untagged',
    ];
    return el;
  },
};

export const ColoredTagsFilled: Story = {
  name: 'Colored Tags - Filled',
  render: () => {
    const el = document.createElement('void-tags-input');
    el.setAttribute('aria-label', 'Tags');
    el.variant = 'filled';
    el.value = [
      { text: 'Bug', color: 'error' },
      { text: 'Feature', color: 'info' },
      { text: 'Urgent', color: 'warning' },
      { text: 'Shipped', color: 'success' },
      { text: 'Note', color: 'notice' },
      'Plain',
    ];
    return el;
  },
};
