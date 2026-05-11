import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';

import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Form/CheckboxGroup',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Multi-option selection for preference forms, filter panels, and permission editors. Groups related checkboxes with an accessible label and shared orientation.',
      },
    },
  },
  argTypes: {
    label: { control: 'text' },
    orientation: { control: 'select', options: ['vertical', 'horizontal'] },
  },
  render: (args) => html`
    <void-checkbox-group
      label=${args.label || 'Options'}
      orientation=${args.orientation || 'vertical'}
    >
      <void-checkbox value="a">Option A</void-checkbox>
      <void-checkbox value="b">Option B</void-checkbox>
      <void-checkbox value="c">Option C</void-checkbox>
    </void-checkbox-group>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};

export const Horizontal: Story = {
  args: { orientation: 'horizontal', label: 'Flavors' },
  render: (args) => html`
    <void-checkbox-group
      label=${args.label || 'Flavors'}
      orientation="horizontal"
    >
      <void-checkbox value="vanilla">Vanilla</void-checkbox>
      <void-checkbox value="chocolate">Chocolate</void-checkbox>
      <void-checkbox value="strawberry">Strawberry</void-checkbox>
    </void-checkbox-group>
  `,
};

export const PreSelected: Story = {
  render: () => html`
    <void-checkbox-group label="Permissions">
      <void-checkbox value="read" checked>Read</void-checkbox>
      <void-checkbox value="write">Write</void-checkbox>
      <void-checkbox value="delete" checked>Delete</void-checkbox>
    </void-checkbox-group>
  `,
};

export const NoLabel: Story = {
  render: () => html`
    <void-checkbox-group>
      <void-checkbox value="one">One</void-checkbox>
      <void-checkbox value="two">Two</void-checkbox>
      <void-checkbox value="three">Three</void-checkbox>
    </void-checkbox-group>
  `,
};

export const WithDisabled: Story = {
  render: () => html`
    <void-checkbox-group label="Status">
      <void-checkbox value="active" checked>Active</void-checkbox>
      <void-checkbox value="pending" disabled>Pending</void-checkbox>
      <void-checkbox value="archived">Archived</void-checkbox>
    </void-checkbox-group>
  `,
};
