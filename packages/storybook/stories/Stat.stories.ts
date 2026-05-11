import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Components/Stat',
  component: 'void-stat',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'KPI tile for analytics dashboards, admin summaries, and reporting pages that display a single metric with an optional delta and trend indicator. Supports semantic color coding to signal status at a glance.',
      },
    },
  },
  argTypes: {
    color: {
      control: { type: 'select' },
      options: ['default', 'error', 'warning', 'success', 'info', 'notice', 'highlight'],
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg', 'xl', 'xxl'],
    },
    trend: {
      control: { type: 'select' },
      options: [null, 'up', 'down', 'flat', 'error', 'warning', 'success', 'info', 'notice', 'highlight'],
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {
    label: 'Total Users',
    value: '24,819',
    color: 'default',
    size: 'md',
  },
  render: (args) => html`
    <void-stat
      style="width: 220px;"
      label=${args.label}
      value=${args.value}
      color=${args.color}
      size=${args.size}
    ></void-stat>
  `,
};

export const WithDelta: Story = {
  render: () => html`
    <void-stat
      style="width: 220px;"
      label="Monthly Revenue"
      value="$48,200"
      delta="+12.4% vs last month"
      trend="up"
    ></void-stat>
  `,
};

export const TrendDown: Story = {
  render: () => html`
    <void-stat
      style="width: 220px;"
      label="Error Rate"
      value="0.83%"
      delta="-0.21% vs yesterday"
      trend="down"
      color="error"
    ></void-stat>
  `,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
      <void-stat
        size="sm"
        label="Small"
        value="1,024"
        delta="+3.1%"
        trend="up"
      ></void-stat>
      <void-stat
        size="md"
        label="Medium"
        value="1,024"
        delta="+3.1%"
        trend="up"
      ></void-stat>
      <void-stat
        size="lg"
        label="Large"
        value="1,024"
        delta="+3.1%"
        trend="up"
      ></void-stat>
      <void-stat
        size="xl"
        label="XLarge"
        value="1,024"
        delta="+3.1%"
        trend="up"
      ></void-stat>
      <void-stat
        size="xxl"
        label="XXLarge"
        value="1,024"
        delta="+3.1%"
        trend="up"
      ></void-stat>
    </div>
  `,
};

export const DashboardRow: Story = {
  render: () => html`
    <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
      <void-stat
        style="flex: 1; min-width: 160px;"
        label="Uptime"
        value="99.97%"
        delta="+0.02% this week"
        trend="up"
        color="success"
      ></void-stat>
      <void-stat
        style="flex: 1; min-width: 160px;"
        label="Latency"
        value="42ms"
        delta="-8ms vs baseline"
        trend="up"
      ></void-stat>
      <void-stat
        style="flex: 1; min-width: 160px;"
        label="Requests"
        value="1.2M"
        delta="+18.3% this month"
        trend="up"
      ></void-stat>
      <void-stat
        style="flex: 1; min-width: 160px;"
        label="Errors"
        value="0.03%"
        delta="+0.01% today"
        trend="down"
        color="error"
      ></void-stat>
    </div>
  `,
};

export const TrendColors: Story = {
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 16px;">
      <void-stat label="Success" value="99.9%" delta="+0.5%" trend="success"></void-stat>
      <void-stat label="Error" value="12" delta="+3" trend="error"></void-stat>
      <void-stat label="Warning" value="847ms" delta="+120ms" trend="warning"></void-stat>
      <void-stat label="Info" value="1.2M" delta="+42K" trend="info"></void-stat>
      <void-stat label="Notice" value="v2.1" delta="new" trend="notice"></void-stat>
      <void-stat label="Highlight" value="$4.2K" delta="+$800" trend="highlight"></void-stat>
    </div>
  `,
};

export const Colors: Story = {
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 16px;">
      <void-stat label="Default" value="1,024" color="default"></void-stat>
      <void-stat label="Error" value="12" delta="+3" trend="down" color="error"></void-stat>
      <void-stat label="Warning" value="847ms" delta="+120ms" trend="warning" color="warning"></void-stat>
      <void-stat label="Success" value="99.9%" delta="+0.5%" trend="up" color="success"></void-stat>
      <void-stat label="Info" value="1.2M" delta="+42K" trend="info" color="info"></void-stat>
      <void-stat label="Notice" value="v2.1" delta="new" trend="notice" color="notice"></void-stat>
      <void-stat label="Highlight" value="$4.2K" delta="+$800" trend="highlight" color="highlight"></void-stat>
    </div>
  `,
};
