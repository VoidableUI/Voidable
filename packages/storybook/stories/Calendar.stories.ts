import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

/* ============================================================
   void-calendar
   ============================================================ */

const calendarMeta: Meta = {
  title: 'Form/Calendar',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Date selection for booking flows, scheduling UIs, and form fields that need calendar input. Supports min/max ranges and locale-aware formatting.',
      },
    },
  },
  argTypes: {
    value: { control: 'text' },
    min: { control: 'text' },
    max: { control: 'text' },
    disabled: { control: 'boolean' },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    locale: { control: 'text' },
    firstDay: { control: 'number' },
  },
};

export default calendarMeta;
type Story = StoryObj;

export const Default: Story = {
  render: (args) => html`
    <void-calendar
      value=${args.value || ''}
      min=${args.min || ''}
      max=${args.max || ''}
      ?disabled=${args.disabled}
      size=${args.size || 'md'}
      locale=${args.locale || 'en-US'}
      first-day=${args.firstDay ?? 0}
    ></void-calendar>
  `,
};

export const WithValue: Story = {
  render: () => html`
    <void-calendar value="2024-06-15"></void-calendar>
  `,
};

export const WithMinMax: Story = {
  render: () => html`
    <void-calendar value="2024-06-15" min="2024-06-05" max="2024-06-25"></void-calendar>
  `,
};

export const MondayStart: Story = {
  render: () => html`
    <void-calendar value="2024-06-15" first-day="1"></void-calendar>
  `,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; gap: 24px; flex-wrap: wrap;">
      <void-calendar size="sm" value="2024-06-15"></void-calendar>
      <void-calendar size="md" value="2024-06-15"></void-calendar>
      <void-calendar size="lg" value="2024-06-15"></void-calendar>
    </div>
  `,
};

export const Disabled: Story = {
  render: () => html`
    <void-calendar disabled value="2024-06-15"></void-calendar>
  `,
};

/* ============================================================
   void-date-picker
   ============================================================ */

export const DatePickerDefault: Story = {
  name: 'Date Picker',
  render: (args) => html`
    <void-date-picker
      value=${args.value || ''}
      min=${args.min || ''}
      max=${args.max || ''}
      ?disabled=${args.disabled}
      size=${args.size || 'md'}
      placeholder=${args.placeholder || 'Select date'}
      format=${args.format || 'MM/DD/YYYY'}
      color=${args.color || 'default'}
    ></void-date-picker>
  `,
};

export const DatePickerWithValue: Story = {
  name: 'Date Picker — With Value',
  render: () => html`
    <void-date-picker value="2024-06-15"></void-date-picker>
  `,
};

export const DatePickerColors: Story = {
  name: 'Date Picker — Colors',
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px; max-width: 300px;">
      <void-date-picker color="default" placeholder="Default" value="2024-06-15"></void-date-picker>
      <void-date-picker color="error" placeholder="Error" value="2024-06-15"></void-date-picker>
      <void-date-picker color="warning" placeholder="Warning" value="2024-06-15"></void-date-picker>
      <void-date-picker color="success" placeholder="Success" value="2024-06-15"></void-date-picker>
      <void-date-picker color="info" placeholder="Info" value="2024-06-15"></void-date-picker>
      <void-date-picker color="notice" placeholder="Notice" value="2024-06-15"></void-date-picker>
    </div>
  `,
};

export const DatePickerSizes: Story = {
  name: 'Date Picker — Sizes',
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px; max-width: 300px;">
      <void-date-picker size="sm" placeholder="Small"></void-date-picker>
      <void-date-picker size="md" placeholder="Medium"></void-date-picker>
      <void-date-picker size="lg" placeholder="Large"></void-date-picker>
    </div>
  `,
};

export const DatePickerCustomFormat: Story = {
  name: 'Date Picker — DD/MM/YYYY',
  render: () => html`
    <void-date-picker value="2024-06-15" format="DD/MM/YYYY" placeholder="DD/MM/YYYY"></void-date-picker>
  `,
};

export const DatePickerDisabled: Story = {
  name: 'Date Picker — Disabled',
  render: () => html`
    <void-date-picker disabled value="2024-06-15"></void-date-picker>
  `,
};

export const DatePickerWithConstraints: Story = {
  name: 'Date Picker — Min/Max',
  render: () => html`
    <void-date-picker value="2024-06-15" min="2024-06-01" max="2024-06-30" placeholder="June only"></void-date-picker>
  `,
};
