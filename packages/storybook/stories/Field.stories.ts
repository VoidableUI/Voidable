import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Form/Field',
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    helper: { control: 'text' },
    error: { control: 'text' },
    required: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (args) => html`
    <void-field label=${args.label || 'Email'} helper=${args.helper || 'We will never share your email.'} ?required=${args.required} error=${args.error || ''}>
      <void-input placeholder="Enter your email..." type="email"></void-input>
    </void-field>
  `,
};

export const WithError: Story = {
  render: () => html`
    <void-field label="Username" error="Username is already taken" required>
      <void-input placeholder="Choose a username..."></void-input>
    </void-field>
  `,
};

export const Required: Story = {
  render: () => html`
    <void-field label="Full Name" required helper="Enter your legal name">
      <void-input placeholder="John Doe"></void-input>
    </void-field>
  `,
};

export const WithSelect: Story = {
  render: () => html`
    <void-field label="Country" helper="Select your country of residence">
      <void-select>
        <option value="">Choose...</option>
        <option value="us">United States</option>
        <option value="uk">United Kingdom</option>
        <option value="ca">Canada</option>
      </void-select>
    </void-field>
  `,
};

export const WithTextarea: Story = {
  render: () => html`
    <void-field label="Bio" helper="Tell us about yourself">
      <void-textarea placeholder="Write something..."></void-textarea>
    </void-field>
  `,
};
