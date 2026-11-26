import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';
import { argTypesFor } from '../.storybook/manifest';

const meta: Meta = {
  title: 'Form/Input',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Single-line text entry for login forms, search fields, and any structured data capture. Supports common input types, sizes, and inline validation errors.',
      },
    },
  },
  argTypes: argTypesFor('void-input'),
  render: (args) => html`
    <void-input aria-label="Display name"
      type=${args.type || 'text'}
      placeholder=${args.placeholder || 'Enter text...'}
      size=${args.size || 'md'}
      ?disabled=${args.disabled}
      ?readonly=${args.readonly}
      error=${args.error || ''}
    ></void-input>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};

export const WithError: Story = {
  args: { error: 'This field is required', placeholder: 'Enter email...' },
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px; max-width: 400px;">
      <void-input aria-label="Small" size="sm" placeholder="Small"></void-input>
      <void-input aria-label="Medium" size="md" placeholder="Medium"></void-input>
      <void-input aria-label="Large" size="lg" placeholder="Large"></void-input>
    </div>
  `,
};

export const Disabled: Story = {
  args: { disabled: true, placeholder: 'Disabled input' },
};

export const Password: Story = {
  args: { type: 'password', placeholder: 'Enter password...' },
};

export const DateAndTimeTypes: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px; max-width: 400px;">
      <void-input aria-label="Date" type="date"></void-input>
      <void-input aria-label="Time" type="time"></void-input>
      <void-input aria-label="Date and time" type="datetime-local"></void-input>
      <void-input aria-label="Month" type="month"></void-input>
      <void-input aria-label="Week" type="week"></void-input>
    </div>
  `,
};

export const NativeAttributes: Story = {
  parameters: {
    docs: {
      description: {
        story: 'The standard native attributes are forwarded to the native control: `autocomplete` (so password managers recognise the field), `minlength`, `maxlength`, `pattern`, `inputmode`, `enterkeyhint`, `autocapitalize` and `spellcheck`. `minlength` and `pattern` take part in the form\'s validity.',
      },
    },
  },
  render: () => html`
    <form style="display: flex; flex-direction: column; gap: 12px; max-width: 400px;" @submit=${(e: Event) => e.preventDefault()}>
      <void-input aria-label="Username" name="username" autocomplete="username" autocapitalize="off" spellcheck="false" placeholder="Username"></void-input>
      <void-input aria-label="Password (8 to 64 characters)" name="password" type="password" autocomplete="current-password" minlength="8" maxlength="64" placeholder="Password (8 to 64 characters)"></void-input>
      <void-input aria-label="6 digit code" name="code" autocomplete="one-time-code" inputmode="numeric" pattern="[0-9]{6}" enterkeyhint="done" placeholder="6 digit code"></void-input>
      <void-button type="submit">Sign in</void-button>
    </form>
  `,
};
