import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Rails/Scaffold/Form',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'The form partial prototype for Rails scaffold _form.html.erb. Demonstrates every column type mapped to Voidable form components.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

// Full-form stories: wrapped in a card
const formWrapper = (content: unknown) => html`
  <div style="max-width: 36rem; margin: 0 auto; padding: 2rem;">
    <void-card>
      <div style="padding: var(--void-space-5);">
        ${content}
      </div>
    </void-card>
  </div>
`;

// Individual field demos: plain wrapper, no card
const fieldWrapper = (content: unknown) => html`
  <div style="max-width: 36rem; margin: 0 auto; padding: 2rem;">
    ${content}
  </div>
`;

export const AllFieldTypes: Story = {
  render: () => formWrapper(html`
    <form style="display: flex; flex-direction: column; gap: var(--void-space-4);">
      <void-field label="Name">
        <void-input placeholder="Enter name..."></void-input>
      </void-field>

      <void-field label="Description">
        <void-textarea placeholder="Enter description..."></void-textarea>
      </void-field>

      <void-field label="Price">
        <void-number-input value="0" step="0.01"></void-number-input>
      </void-field>

      <void-field label="Quantity">
        <void-number-input value="0"></void-number-input>
      </void-field>

      <void-field label="Weight">
        <void-number-input value="0" step="any"></void-number-input>
      </void-field>

      <void-field label="Active">
        <void-switch></void-switch>
      </void-field>

      <void-field label="Release date">
        <void-date-picker></void-date-picker>
      </void-field>

      <void-field label="Published at">
        <void-input type="datetime-local"></void-input>
      </void-field>

      <void-field label="Available from">
        <void-input type="time"></void-input>
      </void-field>

      <void-field label="Category">
        <void-select>
          <option value="">Select...</option>
          <option value="1">Electronics</option>
          <option value="2">Accessories</option>
          <option value="3">Premium</option>
          <option value="4">Misc</option>
        </void-select>
      </void-field>

      <void-field label="Password">
        <void-input type="password" placeholder="Enter password..."></void-input>
      </void-field>

      <void-field label="Password confirmation">
        <void-input type="password" placeholder="Confirm password..."></void-input>
      </void-field>

      <void-field label="Email">
        <void-input type="email" placeholder="user@example.com"></void-input>
      </void-field>

      <div style="display: flex; gap: var(--void-space-2); align-items: center; padding-top: var(--void-space-2);">
        <void-button type="submit" color="success">Create product</void-button>
        <void-button variant="ghost">Back</void-button>
      </div>
    </form>
  `),
};

export const StringField: Story = {
  render: () => fieldWrapper(html`
    <form style="display: flex; flex-direction: column; gap: var(--void-space-4);">
      <void-field label="Name">
        <void-input placeholder="Enter name..."></void-input>
      </void-field>
    </form>
  `),
};

export const TextField: Story = {
  render: () => fieldWrapper(html`
    <form style="display: flex; flex-direction: column; gap: var(--void-space-4);">
      <void-field label="Description">
        <void-textarea placeholder="Enter description..."></void-textarea>
      </void-field>
    </form>
  `),
};

export const IntegerField: Story = {
  render: () => fieldWrapper(html`
    <form style="display: flex; flex-direction: column; gap: var(--void-space-4);">
      <void-field label="Quantity">
        <void-number-input value="0"></void-number-input>
      </void-field>
    </form>
  `),
};

export const DecimalField: Story = {
  render: () => fieldWrapper(html`
    <form style="display: flex; flex-direction: column; gap: var(--void-space-4);">
      <void-field label="Price">
        <void-number-input value="0" step="0.01"></void-number-input>
      </void-field>
    </form>
  `),
};

export const FloatField: Story = {
  render: () => fieldWrapper(html`
    <form style="display: flex; flex-direction: column; gap: var(--void-space-4);">
      <void-field label="Weight">
        <void-number-input value="0" step="any"></void-number-input>
      </void-field>
    </form>
  `),
};

export const BooleanField: Story = {
  render: () => fieldWrapper(html`
    <form style="display: flex; flex-direction: column; gap: var(--void-space-4);">
      <void-field label="Active">
        <void-switch></void-switch>
      </void-field>
    </form>
  `),
};

export const DateField: Story = {
  render: () => fieldWrapper(html`
    <form style="display: flex; flex-direction: column; gap: var(--void-space-4);">
      <void-field label="Release date">
        <void-date-picker></void-date-picker>
      </void-field>
    </form>
  `),
};

export const DateTimeField: Story = {
  render: () => fieldWrapper(html`
    <form style="display: flex; flex-direction: column; gap: var(--void-space-4);">
      <void-field label="Published at">
        <void-input type="datetime-local"></void-input>
      </void-field>
    </form>
  `),
};

export const TimeField: Story = {
  render: () => fieldWrapper(html`
    <form style="display: flex; flex-direction: column; gap: var(--void-space-4);">
      <void-field label="Available from">
        <void-input type="time"></void-input>
      </void-field>
    </form>
  `),
};

export const ReferencesField: Story = {
  render: () => fieldWrapper(html`
    <form style="display: flex; flex-direction: column; gap: var(--void-space-4);">
      <void-field label="Category">
        <void-select>
          <option value="">Select...</option>
          <option value="1">Electronics</option>
          <option value="2">Accessories</option>
          <option value="3">Premium</option>
          <option value="4">Misc</option>
        </void-select>
      </void-field>
    </form>
  `),
};

export const PasswordField: Story = {
  render: () => fieldWrapper(html`
    <form style="display: flex; flex-direction: column; gap: var(--void-space-4);">
      <void-field label="Password">
        <void-input type="password" placeholder="Enter password..."></void-input>
      </void-field>

      <void-field label="Password confirmation">
        <void-input type="password" placeholder="Confirm password..."></void-input>
      </void-field>
    </form>
  `),
};

export const EmailField: Story = {
  render: () => fieldWrapper(html`
    <form style="display: flex; flex-direction: column; gap: var(--void-space-4);">
      <void-field label="Email">
        <void-input type="email" placeholder="user@example.com"></void-input>
      </void-field>
    </form>
  `),
};

export const WithErrors: Story = {
  render: () => formWrapper(html`
    <form style="display: flex; flex-direction: column; gap: var(--void-space-4);">
      <void-alert color="error">
        2 errors prohibited this product from being saved:
        <ul style="margin: var(--void-space-2) 0 0 var(--void-space-4); padding: 0;">
          <li>Name can't be blank</li>
          <li>Price must be greater than 0</li>
        </ul>
      </void-alert>

      <void-field label="Name" error="can't be blank">
        <void-input placeholder="Enter name..."></void-input>
      </void-field>

      <void-field label="Description">
        <void-textarea placeholder="Enter description..."></void-textarea>
      </void-field>

      <void-field label="Price" error="must be greater than 0">
        <void-number-input value="0" step="0.01"></void-number-input>
      </void-field>

      <void-field label="Quantity">
        <void-number-input value="0"></void-number-input>
      </void-field>

      <void-field label="Weight">
        <void-number-input value="0" step="any"></void-number-input>
      </void-field>

      <void-field label="Active">
        <void-switch></void-switch>
      </void-field>

      <void-field label="Release date">
        <void-date-picker></void-date-picker>
      </void-field>

      <void-field label="Published at">
        <void-input type="datetime-local"></void-input>
      </void-field>

      <void-field label="Available from">
        <void-input type="time"></void-input>
      </void-field>

      <void-field label="Category">
        <void-select>
          <option value="">Select...</option>
          <option value="1">Electronics</option>
          <option value="2">Accessories</option>
          <option value="3">Premium</option>
          <option value="4">Misc</option>
        </void-select>
      </void-field>

      <div style="display: flex; gap: var(--void-space-2); align-items: center; padding-top: var(--void-space-2);">
        <void-button type="submit" color="success">Create product</void-button>
        <void-button variant="ghost">Back</void-button>
      </div>
    </form>
  `),
};

export const Filled: Story = {
  render: () => formWrapper(html`
    <form style="display: flex; flex-direction: column; gap: var(--void-space-4);">
      <void-field label="Name">
        <void-input value="Widget Pro" placeholder="Enter name..."></void-input>
      </void-field>

      <void-field label="Description">
        <void-textarea placeholder="Enter description...">A premium widget for discerning users.</void-textarea>
      </void-field>

      <void-field label="Price">
        <void-number-input value="29.99" step="0.01"></void-number-input>
      </void-field>

      <void-field label="Quantity">
        <void-number-input value="150"></void-number-input>
      </void-field>

      <void-field label="Weight">
        <void-number-input value="0.5" step="any"></void-number-input>
      </void-field>

      <void-field label="Active">
        <void-switch checked></void-switch>
      </void-field>

      <void-field label="Release date">
        <void-date-picker value="2024-03-15"></void-date-picker>
      </void-field>

      <void-field label="Published at">
        <void-input type="datetime-local" value="2024-03-15T09:00"></void-input>
      </void-field>

      <void-field label="Available from">
        <void-input type="time" value="08:00"></void-input>
      </void-field>

      <void-field label="Category">
        <void-select>
          <option value="">Select...</option>
          <option value="1" selected>Electronics</option>
          <option value="2">Accessories</option>
          <option value="3">Premium</option>
          <option value="4">Misc</option>
        </void-select>
      </void-field>

      <div style="display: flex; gap: var(--void-space-2); align-items: center; padding-top: var(--void-space-2);">
        <void-button type="submit" color="success">Update product</void-button>
        <void-button variant="ghost">Back</void-button>
      </div>
    </form>
  `),
};
