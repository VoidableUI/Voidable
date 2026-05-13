import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Rails/Scaffold/New',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Rails scaffold new view prototype. Presents an empty form for creating a new product record.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => html`
    <div style="max-width: 48rem; margin: 0 auto; padding: 2rem;">
      <div style="margin-bottom: var(--void-space-5);">
        <p style="
          font-family: var(--void-font-mono);
          font-size: var(--void-text-xs);
          color: var(--void-color-text-muted);
          margin: 0 0 var(--void-space-2) 0;
        ">Products / New</p>
        <h1 style="margin: 0; font-family: var(--void-font-sans); color: var(--void-color-text);">New product</h1>
      </div>

      <void-card>
        <div style="padding: var(--void-space-5);">
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

            <div style="display: flex; gap: var(--void-space-2); align-items: center; padding-top: var(--void-space-2);">
              <void-button type="submit" color="success">Create product</void-button>
              <void-button variant="ghost">Back</void-button>
            </div>
          </form>
        </div>
      </void-card>
    </div>
  `,
};
