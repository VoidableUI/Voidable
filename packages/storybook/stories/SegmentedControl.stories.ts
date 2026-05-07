import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Components/SegmentedControl',
  tags: ['autodocs'],
  argTypes: {
    value: { control: 'text' },
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl', 'xxl'] },
    color: { control: 'select', options: ['default', 'error', 'warning', 'success', 'info', 'notice', 'highlight'] },
  },
  render: (args) => html`
    <void-segmented-control value=${args.value || 'day'} size=${args.size || 'md'} color=${args.color || 'default'}>
      <void-segmented-control-item value="day">Day</void-segmented-control-item>
      <void-segmented-control-item value="week">Week</void-segmented-control-item>
      <void-segmented-control-item value="month">Month</void-segmented-control-item>
    </void-segmented-control>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { value: 'day' },
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; align-items: flex-start;">
      <void-segmented-control value="week" size="sm">
        <void-segmented-control-item value="day">Day</void-segmented-control-item>
        <void-segmented-control-item value="week">Week</void-segmented-control-item>
        <void-segmented-control-item value="month">Month</void-segmented-control-item>
      </void-segmented-control>
      <void-segmented-control value="week" size="md">
        <void-segmented-control-item value="day">Day</void-segmented-control-item>
        <void-segmented-control-item value="week">Week</void-segmented-control-item>
        <void-segmented-control-item value="month">Month</void-segmented-control-item>
      </void-segmented-control>
      <void-segmented-control value="week" size="lg">
        <void-segmented-control-item value="day">Day</void-segmented-control-item>
        <void-segmented-control-item value="week">Week</void-segmented-control-item>
        <void-segmented-control-item value="month">Month</void-segmented-control-item>
      </void-segmented-control>
      <void-segmented-control value="week" size="xl">
        <void-segmented-control-item value="day">Day</void-segmented-control-item>
        <void-segmented-control-item value="week">Week</void-segmented-control-item>
        <void-segmented-control-item value="month">Month</void-segmented-control-item>
      </void-segmented-control>
      <void-segmented-control value="week" size="xxl">
        <void-segmented-control-item value="day">Day</void-segmented-control-item>
        <void-segmented-control-item value="week">Week</void-segmented-control-item>
        <void-segmented-control-item value="month">Month</void-segmented-control-item>
      </void-segmented-control>
    </div>
  `,
};

export const WithDisabledItem: Story = {
  render: () => html`
    <void-segmented-control value="day">
      <void-segmented-control-item value="day">Day</void-segmented-control-item>
      <void-segmented-control-item value="week" disabled>Week</void-segmented-control-item>
      <void-segmented-control-item value="month">Month</void-segmented-control-item>
    </void-segmented-control>
  `,
};

export const ManyOptions: Story = {
  render: () => html`
    <void-segmented-control value="1h">
      <void-segmented-control-item value="15m">15m</void-segmented-control-item>
      <void-segmented-control-item value="1h">1h</void-segmented-control-item>
      <void-segmented-control-item value="4h">4h</void-segmented-control-item>
      <void-segmented-control-item value="1d">1D</void-segmented-control-item>
      <void-segmented-control-item value="1w">1W</void-segmented-control-item>
      <void-segmented-control-item value="1mo">1M</void-segmented-control-item>
    </void-segmented-control>
  `,
};
