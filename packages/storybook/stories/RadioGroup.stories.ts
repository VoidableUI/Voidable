import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';

import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Form/RadioGroup',
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    value: { control: 'text' },
    name: { control: 'text' },
    orientation: { control: 'select', options: ['vertical', 'horizontal'] },
  },
  render: (args) => html`
    <void-radio-group
      label=${args.label || 'Choose an option'}
      value=${args.value || ''}
      name=${args.name || 'story'}
      orientation=${args.orientation || 'vertical'}
    >
      <void-radio value="a">Option A</void-radio>
      <void-radio value="b">Option B</void-radio>
      <void-radio value="c">Option C</void-radio>
    </void-radio-group>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {
    label: 'Choose an option',
    value: 'a',
    name: 'default',
    orientation: 'vertical',
  },
};

export const Horizontal: Story = {
  render: () => html`
    <void-radio-group label="Alignment" value="left" name="align" orientation="horizontal">
      <void-radio value="left">Left</void-radio>
      <void-radio value="center">Center</void-radio>
      <void-radio value="right">Right</void-radio>
    </void-radio-group>
  `,
};

export const NoLabel: Story = {
  render: () => html`
    <void-radio-group value="yes" name="confirm">
      <void-radio value="yes">Yes</void-radio>
      <void-radio value="no">No</void-radio>
    </void-radio-group>
  `,
};

export const WithDisabledOption: Story = {
  render: () => html`
    <void-radio-group label="Plan" value="basic" name="plan">
      <void-radio value="basic">Basic</void-radio>
      <void-radio value="pro">Pro</void-radio>
      <void-radio value="enterprise" disabled>Enterprise (contact sales)</void-radio>
    </void-radio-group>
  `,
};
