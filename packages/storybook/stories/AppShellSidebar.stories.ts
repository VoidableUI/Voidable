import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Rails/App Shell/Sidebar',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Application shell with a collapsible sidebar navigation. Suited for admin dashboards, data-heavy apps, and multi-section interfaces.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

const navItemStyle = `display: flex; align-items: center; gap: var(--void-space-2); padding: var(--void-space-2); border-radius: var(--void-radius-md); font-size: var(--void-text-sm); color: var(--void-color-text-secondary); cursor: pointer;`;

const activeNavItemStyle = `${navItemStyle} background: var(--void-color-border-strong); color: var(--void-color-text);`;

const sectionLabelStyle = `font-family: var(--void-font-mono); font-size: var(--void-text-2xs); text-transform: uppercase; color: var(--void-color-text-muted); letter-spacing: var(--void-tracking-widest);`;

const sidebar = html`
  <style>
    void-popover[position="top"].sidebar-settings .void-popover-body {
      right: 0;
      left: auto;
      bottom: calc(100% + var(--void-space-3));
    }
  </style>
  <void-sidebar width="220px" style="position: sticky; top: 0; height: 100%; border-right: 1px solid var(--void-color-border); overflow: visible;">
    <!-- Header -->
    <div style="height: var(--void-space-14); display: flex; align-items: center; padding: 0 var(--void-space-3); border-bottom: 1px solid var(--void-color-border); background: var(--void-color-bg-secondary);">
      <div style="display: flex; align-items: center; gap: var(--void-space-2);">
        <div style="width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; background: var(--void-color-border-strong); border-radius: var(--void-radius-sm); font-family: var(--void-font-sans); font-size: var(--void-text-sm); font-weight: var(--void-weight-semibold); color: var(--void-color-text);">A</div>
        <div style="display: flex; flex-direction: column;">
          <span style="font-family: var(--void-font-sans); font-size: var(--void-text-sm); font-weight: var(--void-weight-medium); color: var(--void-color-text);">Acme App</span>
          <span style="font-family: var(--void-font-mono); font-size: var(--void-text-xs); color: var(--void-color-text-muted);">Production</span>
        </div>
      </div>
    </div>

    <!-- Nav -->
    <nav style="display: flex; flex-direction: column; gap: var(--void-space-1); padding: var(--void-space-3); overflow-y: auto; flex: 1;">
      <span style="${sectionLabelStyle}">MAIN</span>
      <div style="${activeNavItemStyle}">Dashboard</div>
      <div style="${navItemStyle}">Products</div>
      <div style="${navItemStyle}">Orders</div>
      <div style="${navItemStyle}">Customers</div>

      <span style="${sectionLabelStyle} margin-top: var(--void-space-2);">SETTINGS</span>
      <div style="${navItemStyle}">Team</div>
      <div style="${navItemStyle}">Billing</div>
      <div style="${navItemStyle}">Preferences</div>
    </nav>

    <!-- Footer -->
    <div style="padding: var(--void-space-3); border-top: 1px solid var(--void-color-border); background: var(--void-color-bg-secondary); display: flex; align-items: center; gap: var(--void-space-2);">
      <void-avatar initials="KW" size="sm"></void-avatar>
      <div style="display: flex; flex-direction: column;">
        <span style="font-family: var(--void-font-sans); font-size: var(--void-text-xs); font-weight: var(--void-weight-medium); color: var(--void-color-text);">Kaz Walker</span>
        <span style="font-family: var(--void-font-sans); font-size: var(--void-text-2xs); color: var(--void-color-text-muted);">Admin</span>
      </div>
      <void-popover position="top" class="sidebar-settings" style="margin-left: auto;">
        <button style="background: none; border: 1px solid var(--void-color-border); border-radius: var(--void-radius-sm); padding: var(--void-space-1) var(--void-space-2); cursor: pointer; font-size: var(--void-text-sm); color: var(--void-color-text-secondary);">&#x2699;</button>
        <div style="padding: var(--void-space-2); min-width: 160px;">
          <label style="display: flex; align-items: center; gap: var(--void-space-2); padding: var(--void-space-1) 0; font-family: var(--void-font-sans); font-size: var(--void-text-sm); color: var(--void-color-text); cursor: pointer;">
            <i class="ti ti-moon"></i>
            <span>Dark Mode</span>
            <void-switch id="theme-switch" size="sm" checked style="margin-left: auto;"></void-switch>
          </label>
          <hr style="border: none; border-top: 1px solid var(--void-color-border); margin: var(--void-space-1) 0;">
          <button style="display: flex; align-items: center; gap: var(--void-space-2); width: 100%; background: none; border: none; padding: var(--void-space-1) 0; font-family: var(--void-font-sans); font-size: var(--void-text-sm); color: var(--void-color-error); cursor: pointer;">
            Sign Out
          </button>
        </div>
      </void-popover>
    </div>
  </void-sidebar>
`;

const contentHeader = (breadcrumbs: string) => html`
  <div style="height: var(--void-space-14); display: flex; align-items: center; justify-content: space-between; padding: 0 var(--void-space-4); border-bottom: 1px solid var(--void-color-border); background: var(--void-color-bg-secondary); flex-shrink: 0; position: sticky; top: 0; z-index: 10;">
    <span style="font-family: var(--void-font-mono); font-size: var(--void-text-xs); color: var(--void-color-text-muted);">${breadcrumbs}</span>
    <void-action-input icon="search" placeholder="Search…" size="sm" tooltip-position="bottom" style="width: 220px;"></void-action-input>
  </div>
`;

const mainContent = html`
  <div style="flex: 1; min-width: 0; display: flex; flex-direction: column;">
    ${contentHeader('Dashboard')}
    <div style="flex: 1; overflow-y: auto; padding: var(--void-space-6);">
      <h1 style="margin: 0 0 var(--void-space-5) 0; font-family: var(--void-font-sans); color: var(--void-color-text);">Dashboard</h1>
      <div style="display: flex; gap: var(--void-space-4);">
        <void-stat label="Revenue" value="$48,250" description="+12.5% from last month"></void-stat>
        <void-stat label="Orders" value="1,284" description="+8.2% from last month"></void-stat>
        <void-stat label="Customers" value="3,420" description="+3.1% from last month"></void-stat>
        <void-stat label="Conversion" value="2.4%" description="-0.3% from last month"></void-stat>
      </div>
    </div>
  </div>
`;

const orders = [
  { id: 'ORD-001', customer: 'Alice Johnson', total: 129.99, status: 'Shipped', date: '2026-05-12' },
  { id: 'ORD-002', customer: 'Bob Smith', total: 249.50, status: 'Processing', date: '2026-05-11' },
  { id: 'ORD-003', customer: 'Carol White', total: 89.00, status: 'Delivered', date: '2026-05-10' },
  { id: 'ORD-004', customer: 'Dan Brown', total: 312.75, status: 'Pending', date: '2026-05-09' },
  { id: 'ORD-005', customer: 'Eva Green', total: 54.20, status: 'Shipped', date: '2026-05-08' },
];

const orderRows = orders.map(
  (o) => html`
    <tr>
      <td style="font-family: var(--void-font-mono); font-size: var(--void-text-sm); color: var(--void-color-text);">${o.id}</td>
      <td style="font-family: var(--void-font-sans); font-weight: var(--void-weight-medium); color: var(--void-color-text);">${o.customer}</td>
      <td style="font-family: var(--void-font-mono); font-size: var(--void-text-sm); text-align: right; color: var(--void-color-text);">$${o.total.toFixed(2)}</td>
      <td>
        ${o.status === 'Delivered'
          ? html`<void-badge color="success" variant="outline">${o.status}</void-badge>`
          : o.status === 'Shipped'
            ? html`<void-badge color="info" variant="outline">${o.status}</void-badge>`
            : o.status === 'Processing'
              ? html`<void-badge color="warning" variant="outline">${o.status}</void-badge>`
              : html`<void-badge variant="outline">${o.status}</void-badge>`}
      </td>
      <td style="font-family: var(--void-font-sans); font-size: var(--void-text-sm); color: var(--void-color-text-secondary);">${o.date}</td>
    </tr>
  `,
);

const mainContentWithTable = html`
  <div style="flex: 1; min-width: 0; display: flex; flex-direction: column;">
    ${contentHeader('Dashboard / Orders')}
    <div style="flex: 1; overflow: hidden; padding: var(--void-space-6); display: flex; flex-direction: column;">
      <h1 style="margin: 0 0 var(--void-space-5) 0; font-family: var(--void-font-sans); color: var(--void-color-text); flex-shrink: 0;">Dashboard</h1>

      <div style="display: flex; gap: var(--void-space-4); margin-bottom: var(--void-space-6); flex-shrink: 0;">
        <void-stat label="Revenue" value="$48,250" description="+12.5% from last month"></void-stat>
        <void-stat label="Orders" value="1,284" description="+8.2% from last month"></void-stat>
        <void-stat label="Customers" value="3,420" description="+3.1% from last month"></void-stat>
        <void-stat label="Conversion" value="2.4%" description="-0.3% from last month"></void-stat>
      </div>

      <div style="flex: 1; min-height: 0; display: flex; flex-direction: column; border: 1px solid var(--void-color-border); border-radius: var(--void-radius-lg); overflow: hidden;">
        <div style="padding: var(--void-space-3) var(--void-space-5); border-bottom: 1px solid var(--void-color-border); display: flex; align-items: center; justify-content: space-between; background: var(--void-color-bg-secondary); flex-shrink: 0;">
          <span style="font-size: var(--void-text-sm); font-weight: var(--void-weight-medium); color: var(--void-color-text); letter-spacing: var(--void-tracking-snug);">Recent Orders</span>
          <span style="font-size: var(--void-text-xs); color: var(--void-color-text-muted); font-family: var(--void-font-mono);">5 orders</span>
        </div>

        <void-table hoverable style="flex: 1; overflow: auto; min-height: 0;">
          <table>
            <thead>
              <tr>
                <th style="font-family: var(--void-font-sans); position: sticky; top: 0; background: var(--void-color-bg); z-index: 1;">Order</th>
                <th style="font-family: var(--void-font-sans); position: sticky; top: 0; background: var(--void-color-bg); z-index: 1;">Customer</th>
                <th style="font-family: var(--void-font-sans); text-align: right; position: sticky; top: 0; background: var(--void-color-bg); z-index: 1;">Total</th>
                <th style="font-family: var(--void-font-sans); position: sticky; top: 0; background: var(--void-color-bg); z-index: 1;">Status</th>
                <th style="font-family: var(--void-font-sans); position: sticky; top: 0; background: var(--void-color-bg); z-index: 1;">Date</th>
              </tr>
            </thead>
            <tbody>
              ${orderRows}
            </tbody>
          </table>
        </void-table>

        <div style="flex-shrink: 0; padding: var(--void-space-3) var(--void-space-5); border-top: 1px solid var(--void-color-border); display: flex; justify-content: center;">
          <void-pagination total="12" value="1" siblings="1" size="sm"></void-pagination>
        </div>
      </div>
    </div>
  </div>
`;

export const Default: Story = {
  render: () => html`
    <div style="display: flex; min-height: 600px; background: var(--void-color-bg); color: var(--void-color-text); font-family: var(--void-font-sans);">
      ${sidebar}
      ${mainContent}
    </div>
  `,
};

export const WithContent: Story = {
  render: () => html`
    <div style="display: flex; min-height: 600px; background: var(--void-color-bg); color: var(--void-color-text); font-family: var(--void-font-sans);">
      ${sidebar}
      ${mainContentWithTable}
    </div>
  `,
};
