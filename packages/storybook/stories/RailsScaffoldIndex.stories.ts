import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Rails/Scaffold/Index',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Rails scaffold index view prototype. Displays a table listing of products with search, filtering, and row-level actions.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

const products = [
  { name: 'Widget Pro', price: 29.99, quantity: 150, active: true, category: 'Electronics' },
  { name: 'Gadget Lite', price: 9.99, quantity: 500, active: true, category: 'Accessories' },
  { name: 'Super Gizmo', price: 49.99, quantity: 75, active: false, category: 'Electronics' },
  { name: 'Mini Doohickey', price: 4.99, quantity: 1000, active: true, category: 'Misc' },
  { name: 'Mega Thingamajig', price: 99.99, quantity: 25, active: true, category: 'Premium' },
];

const openDelete = (e: Event) => {
  const dialog = (e.target as HTMLElement).closest('.scaffold-index')?.querySelector('#delete-dialog') as any;
  if (dialog) dialog.open = true;
};
const closeDelete = (e: Event) => {
  const dialog = (e.target as HTMLElement).closest('void-dialog') as any;
  if (dialog) dialog.open = false;
};

const pageHeader = html`
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--void-space-5);">
    <div>
      <h1 style="margin: 0; font-family: var(--void-font-sans); color: var(--void-color-text);">Products</h1>
      <p style="margin: var(--void-space-1) 0 0 0; font-family: var(--void-font-sans); font-size: var(--void-text-sm); color: var(--void-color-text-secondary);">
        Manage your product catalog
      </p>
    </div>
    <div style="display: flex; gap: var(--void-space-2); align-items: stretch;">
      <void-action-input icon="search" placeholder="Search products..." action-label="Search" size="sm"></void-action-input>
      <void-button color="success" size="sm">New product</void-button>
    </div>
  </div>
`;

const sectionHeader = html`
  <div style="
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: var(--void-space-3);
    margin-bottom: var(--void-space-3);
    border-bottom: 1px solid var(--void-color-border);
  ">
    <span style="
      font-family: var(--void-font-sans);
      font-size: var(--void-text-sm);
      font-weight: var(--void-weight-semibold);
      color: var(--void-color-text);
    ">All Products</span>
    <span style="
      font-family: var(--void-font-sans);
      font-size: var(--void-text-xs);
      color: var(--void-color-text-secondary);
    ">5 products</span>
  </div>
`;

const productRows = products.map(
  (p) => html`
    <tr>
      <td style="font-family: var(--void-font-sans); font-weight: var(--void-weight-medium); color: var(--void-color-text);">
        ${p.name}
      </td>
      <td style="font-family: var(--void-font-mono); font-size: var(--void-text-sm); text-align: right; color: var(--void-color-text);">
        $${p.price.toFixed(2)}
      </td>
      <td style="font-family: var(--void-font-mono); font-size: var(--void-text-sm); text-align: right; color: var(--void-color-text);">
        ${p.quantity}
      </td>
      <td>
        ${p.active
          ? html`<void-badge color="success" variant="outline">Active</void-badge>`
          : html`<void-badge variant="outline">Inactive</void-badge>`}
      </td>
      <td style="font-family: var(--void-font-sans); font-size: var(--void-text-sm); color: var(--void-color-text-secondary);">
        ${p.category}
      </td>
      <td style="text-align: right;">
        <void-dropdown-menu position="bottom-end">
          <void-button variant="ghost" size="sm">&#x22EF;</void-button>
          <void-dropdown-menu-item>View</void-dropdown-menu-item>
          <void-dropdown-menu-item>Edit</void-dropdown-menu-item>
          <hr>
          <void-dropdown-menu-item destructive @click="${openDelete}">Delete</void-dropdown-menu-item>
        </void-dropdown-menu>
      </td>
    </tr>
  `,
);

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

const productTable = html`
  <void-table hoverable>
    <table>
      <thead>
        <tr>
          <th style="font-family: var(--void-font-sans);">Name</th>
          <th style="font-family: var(--void-font-sans); text-align: right;">Price</th>
          <th style="font-family: var(--void-font-sans); text-align: right;">Quantity</th>
          <th style="font-family: var(--void-font-sans);">Status</th>
          <th style="font-family: var(--void-font-sans);">Category</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${productRows}
      </tbody>
    </table>
  </void-table>
`;

export const Default: Story = {
  render: () => html`
    <div class="scaffold-index" style="max-width: 72rem; margin: 0 auto; padding: 2rem;">
      ${pageHeader}
      ${sectionHeader}
      ${productTable}
      ${deleteDialog}
    </div>
  `,
};

export const Empty: Story = {
  render: () => html`
    <div class="scaffold-index" style="max-width: 72rem; margin: 0 auto; padding: 2rem;">
      ${pageHeader}
      ${sectionHeader}
      <void-table hoverable>
        <table>
          <thead>
            <tr>
              <th style="font-family: var(--void-font-sans);">Name</th>
              <th style="font-family: var(--void-font-sans); text-align: right;">Price</th>
              <th style="font-family: var(--void-font-sans); text-align: right;">Quantity</th>
              <th style="font-family: var(--void-font-sans);">Status</th>
              <th style="font-family: var(--void-font-sans);">Category</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colspan="6" style="
                text-align: center;
                padding: var(--void-space-6);
                font-family: var(--void-font-sans);
                font-size: var(--void-text-sm);
                color: var(--void-color-text-muted);
              ">
                No products found. Create your first product to get started.
              </td>
            </tr>
          </tbody>
        </table>
      </void-table>
    </div>
  `,
};

export const WithNotice: Story = {
  render: () => html`
    <div class="scaffold-index" style="max-width: 72rem; margin: 0 auto; padding: 2rem;">
      <void-alert color="success" dismissible style="margin-bottom: var(--void-space-4);">
        Product was successfully created.
      </void-alert>
      ${pageHeader}
      ${sectionHeader}
      ${productTable}
      ${deleteDialog}
    </div>
  `,
};

export const WithDeleteConfirmation: Story = {
  render: () => {
    const template = html`
      <div class="scaffold-index" style="max-width: 72rem; margin: 0 auto; padding: 2rem;">
        ${pageHeader}
        ${sectionHeader}
        ${productTable}
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
    `;
    return template;
  },
};
