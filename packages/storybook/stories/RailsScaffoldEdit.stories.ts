import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Rails/Scaffold/Edit',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Rails scaffold edit view prototype. Presents a pre-filled form for updating an existing product record.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

const openDelete = (e: Event) => {
  const dialog = (e.target as HTMLElement).closest('.scaffold-edit')?.querySelector('#delete-dialog') as any;
  if (dialog) dialog.open = true;
};
const closeDelete = (e: Event) => {
  const dialog = (e.target as HTMLElement).closest('void-dialog') as any;
  if (dialog) dialog.open = false;
};

const deleteDialog = html`
  <void-dialog id="delete-dialog" heading="Delete product" size="sm">
    <p style="font-family: var(--void-font-sans); font-size: var(--void-text-sm); color: var(--void-color-text); margin: 0 0 var(--void-space-4) 0;">
      Are you sure you want to delete <strong>Widget Pro</strong>? This action cannot be undone.
    </p>
    <div style="display: flex; gap: var(--void-space-2); justify-content: flex-end;">
      <void-button variant="ghost" size="sm" @click="${closeDelete}">Cancel</void-button>
      <void-button color="error" size="sm" @click="${closeDelete}">Delete</void-button>
    </div>
  </void-dialog>
`;

export const Default: Story = {
  render: () => html`
    <div class="scaffold-edit" style="max-width: 48rem; margin: 0 auto; padding: 2rem;">
      <div style="margin-bottom: var(--void-space-5);">
        <p style="
          font-family: var(--void-font-mono);
          font-size: var(--void-text-xs);
          color: var(--void-color-text-muted);
          margin: 0 0 var(--void-space-2) 0;
        ">Products / Widget Pro / Edit</p>
        <h1 style="margin: 0; font-family: var(--void-font-sans); color: var(--void-color-text);">Edit product</h1>
      </div>

      <void-card>
        <div style="padding: var(--void-space-5);">
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
              <void-button variant="ghost">Show</void-button>
              <void-button variant="ghost">Back</void-button>
            </div>
          </form>
        </div>
      </void-card>

      <div style="
        margin-top: var(--void-space-5);
        padding: var(--void-space-4);
        border: 1px solid var(--void-color-border);
        border-radius: var(--void-radius-md);
      ">
        <p style="
          font-family: var(--void-font-sans);
          font-size: var(--void-text-xs);
          font-weight: var(--void-weight-semibold);
          color: var(--void-color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin: 0 0 var(--void-space-3) 0;
        ">Danger zone</p>
        <void-button variant="outline" color="error" size="sm" @click="${openDelete}">Delete this product</void-button>
      </div>

      ${deleteDialog}
    </div>
  `,
};

export const WithErrors: Story = {
  render: () => html`
    <div class="scaffold-edit" style="max-width: 48rem; margin: 0 auto; padding: 2rem;">
      <div style="margin-bottom: var(--void-space-5);">
        <p style="
          font-family: var(--void-font-mono);
          font-size: var(--void-text-xs);
          color: var(--void-color-text-muted);
          margin: 0 0 var(--void-space-2) 0;
        ">Products / Widget Pro / Edit</p>
        <h1 style="margin: 0; font-family: var(--void-font-sans); color: var(--void-color-text);">Edit product</h1>
      </div>

      <void-card>
        <div style="padding: var(--void-space-5);">
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
              <void-textarea placeholder="Enter description...">A premium widget for discerning users.</void-textarea>
            </void-field>

            <void-field label="Price" error="must be greater than 0">
              <void-number-input value="0" step="0.01"></void-number-input>
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
              <void-button variant="ghost">Show</void-button>
              <void-button variant="ghost">Back</void-button>
            </div>
          </form>
        </div>
      </void-card>

      <div style="
        margin-top: var(--void-space-5);
        padding: var(--void-space-4);
        border: 1px solid var(--void-color-border);
        border-radius: var(--void-radius-md);
      ">
        <p style="
          font-family: var(--void-font-sans);
          font-size: var(--void-text-xs);
          font-weight: var(--void-weight-semibold);
          color: var(--void-color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin: 0 0 var(--void-space-3) 0;
        ">Danger zone</p>
        <void-button variant="outline" color="error" size="sm" @click="${openDelete}">Delete this product</void-button>
      </div>

      ${deleteDialog}
    </div>
  `,
};
