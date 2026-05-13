import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Rails/Devise/Edit Account',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Devise account settings view prototype. Allows users to update email, password, and delete their account.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

const togglePasswordVisibility = (e: Event) => {
  const el = e.target as any;
  const visible = el.type === 'text';
  el.type = visible ? 'password' : 'text';
  el.icon = visible ? 'eye' : 'eye-off';
};

const openDelete = (e: Event) => {
  const dialog = (e.target as HTMLElement).closest('.devise-edit-account')?.querySelector('#delete-dialog') as any;
  if (dialog) dialog.open = true;
};
const closeDelete = (e: Event) => {
  const dialog = (e.target as HTMLElement).closest('void-dialog') as any;
  if (dialog) dialog.open = false;
};

const deleteDialog = html`
  <void-dialog id="delete-dialog" heading="Delete account" size="sm">
    <p style="font-family: var(--void-font-sans); font-size: var(--void-text-sm); color: var(--void-color-text); margin: 0 0 var(--void-space-4) 0;">
      Are you sure you want to delete your account? This action cannot be undone.
    </p>
    <div style="display: flex; gap: var(--void-space-2); justify-content: flex-end;">
      <void-button variant="ghost" size="sm" @click="${closeDelete}">Cancel</void-button>
      <void-button color="error" size="sm" @click="${closeDelete}">Delete</void-button>
    </div>
  </void-dialog>
`;

export const Default: Story = {
  render: () => html`
    <div class="devise-edit-account" style="max-width: 36rem; margin: 0 auto; padding: 2rem;">
      <void-card>
        <div style="padding: var(--void-space-6);">
          <h1 style="margin: 0 0 var(--void-space-5) 0; font-family: var(--void-font-sans); font-size: var(--void-text-xl); font-weight: var(--void-weight-bold); color: var(--void-color-text);">Account settings</h1>

          <form style="display: flex; flex-direction: column; gap: var(--void-space-4);">
            <void-field label="Email">
              <void-input type="email" value="user@example.com" autocomplete="email"></void-input>
            </void-field>

            <void-field label="New password" helper="Leave blank if you don't want to change it">
              <void-action-input type="password" icon="eye" action-label="Toggle visibility" autocomplete="new-password" @void-action=${togglePasswordVisibility}></void-action-input>
            </void-field>

            <void-field label="Confirm new password">
              <void-action-input type="password" icon="eye" action-label="Toggle visibility" autocomplete="new-password" @void-action=${togglePasswordVisibility}></void-action-input>
            </void-field>

            <void-field label="Current password" helper="We need your current password to confirm changes">
              <void-action-input type="password" icon="eye" action-label="Toggle visibility" autocomplete="current-password" @void-action=${togglePasswordVisibility}></void-action-input>
            </void-field>

            <div style="padding-top: var(--void-space-2);">
              <void-button type="submit" color="success" style="width: 100%;">Update</void-button>
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
        <void-button variant="outline" color="error" size="sm" @click="${openDelete}">Delete my account</void-button>
      </div>

      ${deleteDialog}
    </div>
  `,
};

export const WithPendingReconfirmation: Story = {
  render: () => html`
    <div class="devise-edit-account" style="max-width: 36rem; margin: 0 auto; padding: 2rem;">
      <void-card>
        <div style="padding: var(--void-space-6);">
          <h1 style="margin: 0 0 var(--void-space-5) 0; font-family: var(--void-font-sans); font-size: var(--void-text-xl); font-weight: var(--void-weight-bold); color: var(--void-color-text);">Account settings</h1>

          <form style="display: flex; flex-direction: column; gap: var(--void-space-4);">
            <void-field label="Email">
              <void-input type="email" value="user@example.com" autocomplete="email"></void-input>
            </void-field>

            <void-alert>Currently waiting confirmation for: new@example.com</void-alert>

            <void-field label="New password" helper="Leave blank if you don't want to change it">
              <void-action-input type="password" icon="eye" action-label="Toggle visibility" autocomplete="new-password" @void-action=${togglePasswordVisibility}></void-action-input>
            </void-field>

            <void-field label="Confirm new password">
              <void-action-input type="password" icon="eye" action-label="Toggle visibility" autocomplete="new-password" @void-action=${togglePasswordVisibility}></void-action-input>
            </void-field>

            <void-field label="Current password" helper="We need your current password to confirm changes">
              <void-action-input type="password" icon="eye" action-label="Toggle visibility" autocomplete="current-password" @void-action=${togglePasswordVisibility}></void-action-input>
            </void-field>

            <div style="padding-top: var(--void-space-2);">
              <void-button type="submit" color="success" style="width: 100%;">Update</void-button>
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
        <void-button variant="outline" color="error" size="sm" @click="${openDelete}">Delete my account</void-button>
      </div>

      ${deleteDialog}
    </div>
  `,
};

export const WithErrors: Story = {
  render: () => html`
    <div class="devise-edit-account" style="max-width: 36rem; margin: 0 auto; padding: 2rem;">
      <void-card>
        <div style="padding: var(--void-space-6);">
          <h1 style="margin: 0 0 var(--void-space-5) 0; font-family: var(--void-font-sans); font-size: var(--void-text-xl); font-weight: var(--void-weight-bold); color: var(--void-color-text);">Account settings</h1>

          <form style="display: flex; flex-direction: column; gap: var(--void-space-4);">
            <void-alert color="error">
              1 error prohibited this account from being updated:
              <ul style="margin: var(--void-space-2) 0 0 var(--void-space-4); padding: 0;">
                <li>Current password is invalid</li>
              </ul>
            </void-alert>

            <void-field label="Email">
              <void-input type="email" value="user@example.com" autocomplete="email"></void-input>
            </void-field>

            <void-field label="New password" helper="Leave blank if you don't want to change it">
              <void-action-input type="password" icon="eye" action-label="Toggle visibility" autocomplete="new-password" @void-action=${togglePasswordVisibility}></void-action-input>
            </void-field>

            <void-field label="Confirm new password">
              <void-action-input type="password" icon="eye" action-label="Toggle visibility" autocomplete="new-password" @void-action=${togglePasswordVisibility}></void-action-input>
            </void-field>

            <void-field label="Current password" helper="We need your current password to confirm changes" error="is invalid">
              <void-action-input type="password" icon="eye" action-label="Toggle visibility" autocomplete="current-password" @void-action=${togglePasswordVisibility}></void-action-input>
            </void-field>

            <div style="padding-top: var(--void-space-2);">
              <void-button type="submit" color="success" style="width: 100%;">Update</void-button>
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
        <void-button variant="outline" color="error" size="sm" @click="${openDelete}">Delete my account</void-button>
      </div>

      ${deleteDialog}
    </div>
  `,
};
