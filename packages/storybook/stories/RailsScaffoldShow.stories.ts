import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Rails/Scaffold/Show',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Rails scaffold show view prototype. Displays a single product record with all field values organised into labelled sections.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

const dlStyles = `
  display: grid;
  grid-template-columns: 10rem 1fr;
  gap: var(--void-space-3) var(--void-space-4);
  margin: 0;
`;

const dtStyles = `
  font-family: var(--void-font-sans);
  font-size: var(--void-text-sm);
  color: var(--void-color-text-secondary);
  margin: 0;
  padding-top: 2px;
`;

const ddStyles = `
  font-family: var(--void-font-sans);
  font-size: var(--void-text-sm);
  color: var(--void-color-text);
  margin: 0;
`;

const sectionLabelStyles = `
  font-family: var(--void-font-sans);
  font-size: var(--void-text-xs);
  font-weight: var(--void-weight-semibold);
  color: var(--void-color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0 0 var(--void-space-3) 0;
`;

const sectionDividerStyles = `
  border: none;
  border-top: 1px solid var(--void-color-border);
  margin: var(--void-space-4) 0;
`;

const openDelete = (e: Event) => {
  const dialog = (e.target as HTMLElement).closest('.scaffold-show')?.querySelector('#delete-dialog') as any;
  if (dialog) dialog.open = true;
};
const closeDelete = (e: Event) => {
  const dialog = (e.target as HTMLElement).closest('void-dialog') as any;
  if (dialog) dialog.open = false;
};

const showCard = html`
  <void-card>
    <div style="padding: var(--void-space-5);">
      <!-- Details -->
      <p style="${sectionLabelStyles}">Details</p>
      <dl style="${dlStyles}">
        <dt style="${dtStyles}">Name</dt>
        <dd style="${ddStyles}">Widget Pro</dd>

        <dt style="${dtStyles}">Description</dt>
        <dd style="${ddStyles}">A premium widget for discerning users.</dd>

        <dt style="${dtStyles}">Category</dt>
        <dd style="${ddStyles}">Electronics</dd>
      </dl>

      <hr style="${sectionDividerStyles}">

      <!-- Pricing & Inventory -->
      <p style="${sectionLabelStyles}">Pricing &amp; Inventory</p>
      <dl style="${dlStyles}">
        <dt style="${dtStyles}">Price</dt>
        <dd style="font-family: var(--void-font-mono); font-size: var(--void-text-sm); color: var(--void-color-text); margin: 0;">$29.99</dd>

        <dt style="${dtStyles}">Quantity</dt>
        <dd style="font-family: var(--void-font-mono); font-size: var(--void-text-sm); color: var(--void-color-text); margin: 0;">150</dd>

        <dt style="${dtStyles}">Weight</dt>
        <dd style="font-family: var(--void-font-mono); font-size: var(--void-text-sm); color: var(--void-color-text); margin: 0;">0.5 kg</dd>
      </dl>

      <hr style="${sectionDividerStyles}">

      <!-- Status & Dates -->
      <p style="${sectionLabelStyles}">Status &amp; Dates</p>
      <dl style="${dlStyles}">
        <dt style="${dtStyles}">Active</dt>
        <dd style="${ddStyles}"><void-badge color="success" variant="outline">Active</void-badge></dd>

        <dt style="${dtStyles}">Release date</dt>
        <dd style="${ddStyles}">2024-03-15</dd>

        <dt style="${dtStyles}">Published at</dt>
        <dd style="${ddStyles}">2024-03-15 09:00</dd>

        <dt style="${dtStyles}">Available from</dt>
        <dd style="${ddStyles}">08:00</dd>
      </dl>
    </div>
  </void-card>
`;

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
    <div class="scaffold-show" style="max-width: 48rem; margin: 0 auto; padding: 2rem;">
      <div style="margin-bottom: var(--void-space-5);">
        <p style="
          font-family: var(--void-font-mono);
          font-size: var(--void-text-xs);
          color: var(--void-color-text-muted);
          margin: 0 0 var(--void-space-2) 0;
        ">Products / Widget Pro</p>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h1 style="margin: 0; font-family: var(--void-font-sans); color: var(--void-color-text);">Widget Pro</h1>
          <void-dropdown-menu position="bottom-end">
            <void-button variant="outline" size="sm">Actions</void-button>
            <void-dropdown-menu-item>Edit</void-dropdown-menu-item>
            <hr>
            <void-dropdown-menu-item destructive @click="${openDelete}">Delete</void-dropdown-menu-item>
          </void-dropdown-menu>
        </div>
      </div>

      ${showCard}

      <div style="margin-top: var(--void-space-4);">
        <void-button variant="ghost" size="sm">&#x2190; Back to products</void-button>
      </div>

      ${deleteDialog}
    </div>
  `,
};

export const WithNotice: Story = {
  render: () => html`
    <div class="scaffold-show" style="max-width: 48rem; margin: 0 auto; padding: 2rem;">
      <void-alert color="success" dismissible style="margin-bottom: var(--void-space-4);">
        Product was successfully updated.
      </void-alert>

      <div style="margin-bottom: var(--void-space-5);">
        <p style="
          font-family: var(--void-font-mono);
          font-size: var(--void-text-xs);
          color: var(--void-color-text-muted);
          margin: 0 0 var(--void-space-2) 0;
        ">Products / Widget Pro</p>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h1 style="margin: 0; font-family: var(--void-font-sans); color: var(--void-color-text);">Widget Pro</h1>
          <void-dropdown-menu position="bottom-end">
            <void-button variant="outline" size="sm">Actions</void-button>
            <void-dropdown-menu-item>Edit</void-dropdown-menu-item>
            <hr>
            <void-dropdown-menu-item destructive @click="${openDelete}">Delete</void-dropdown-menu-item>
          </void-dropdown-menu>
        </div>
      </div>

      ${showCard}

      <div style="margin-top: var(--void-space-4);">
        <void-button variant="ghost" size="sm">&#x2190; Back to products</void-button>
      </div>

      ${deleteDialog}
    </div>
  `,
};

export const WithDeleteConfirmation: Story = {
  render: () => html`
    <div class="scaffold-show" style="max-width: 48rem; margin: 0 auto; padding: 2rem;">
      <div style="margin-bottom: var(--void-space-5);">
        <p style="
          font-family: var(--void-font-mono);
          font-size: var(--void-text-xs);
          color: var(--void-color-text-muted);
          margin: 0 0 var(--void-space-2) 0;
        ">Products / Widget Pro</p>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h1 style="margin: 0; font-family: var(--void-font-sans); color: var(--void-color-text);">Widget Pro</h1>
          <void-dropdown-menu position="bottom-end">
            <void-button variant="outline" size="sm">Actions</void-button>
            <void-dropdown-menu-item>Edit</void-dropdown-menu-item>
            <hr>
            <void-dropdown-menu-item destructive>Delete</void-dropdown-menu-item>
          </void-dropdown-menu>
        </div>
      </div>

      ${showCard}

      <div style="margin-top: var(--void-space-4);">
        <void-button variant="ghost" size="sm">&#x2190; Back to products</void-button>
      </div>

      <void-dialog id="delete-dialog" heading="Delete product" size="sm" .open="${true}">
        <p style="font-family: var(--void-font-sans); font-size: var(--void-text-sm); color: var(--void-color-text); margin: 0 0 var(--void-space-4) 0;">
          Are you sure you want to delete <strong>Widget Pro</strong>? This action cannot be undone.
        </p>
        <div style="display: flex; gap: var(--void-space-2); justify-content: flex-end;">
          <void-button variant="ghost" size="sm" @click="${closeDelete}">Cancel</void-button>
          <void-button color="error" size="sm" @click="${closeDelete}">Delete</void-button>
        </div>
      </void-dialog>
    </div>
  `,
};
