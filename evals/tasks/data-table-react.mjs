// SPDX-License-Identifier: MIT
import { ok } from '../lib/expect.mjs';
import { USERS } from '../fixtures/data.mjs';

const bodyRows = (t) => t.role('table').first().locator('tbody tr, [role=rowgroup]:not(:first-child) [role=row]');

export default {
  id: 'data-table-react',
  title: 'Data table with toolbar, row actions and pagination',
  format: 'react',
  components: ['void-table', 'void-input', 'void-button', 'void-dropdown-menu', 'void-dropdown-menu-item', 'void-pagination', 'void-badge'],
  prompt: `Build the Users admin screen. Show the users below in a table with Name, Email, Role and Status columns, 10 rows per page with pagination underneath. Above the table put a toolbar with a search box labelled "Search users" that filters by name as you type, and an "Invite user" button. Each row ends with an actions menu (a button labelled "Actions for <name>") offering "Edit" and "Delete"; Delete removes the user from the table. Show the status as a colored badge.

const users = ${JSON.stringify(USERS)};`,
  checks: [
    {
      id: 'first-page',
      title: 'the table shows the first 10 users',
      run: async (t) => {
        await t.visible(t.role('table'), 'table');
        await t.visible(t.role('cell', { name: USERS[0].name }), `cell ${USERS[0].name}`);
        const n = await bodyRows(t).count();
        ok(n === 10, `${n} body rows, expected 10`);
        ok(!(await t.role('cell', { name: USERS[10].name }).isVisible().catch(() => false)), `${USERS[10].name} is on page 1`);
      },
    },
    {
      id: 'paginates',
      title: 'page 2 shows users 11 to 20',
      run: async (t) => {
        const next = t.role('button', { name: /^(2|next.*|go to page 2|page 2)$/i });
        await t.visible(next, 'pagination control for page 2');
        await next.first().click();
        await t.settle();
        await t.visible(t.role('cell', { name: USERS[10].name }), `${USERS[10].name} on page 2`);
        ok(!(await t.role('cell', { name: USERS[0].name }).isVisible().catch(() => false)), `${USERS[0].name} still visible on page 2`);
      },
    },
    {
      id: 'search-filters',
      title: 'searching "ken" leaves only Ken Thompson',
      run: async (t) => {
        await t.fill(/search users/i, 'ken');
        await t.settle();
        await t.visible(t.role('cell', { name: 'Ken Thompson' }), 'Ken Thompson after search');
        const n = await bodyRows(t).count();
        ok(n === 1, `${n} rows after searching "ken", expected 1`);
        await t.fill(/search users/i, '');
        await t.settle();
      },
    },
    {
      id: 'row-menu-delete',
      title: 'the row actions menu deletes a user',
      run: async (t) => {
        const name = USERS[1].name;
        await t.visible(t.role('cell', { name }), `${name} on page 1`);
        await t.click('button', new RegExp(`actions for ${name}`, 'i'));
        await t.visible(t.role('menuitem', { name: /edit/i }), 'menu item Edit');
        await t.click('menuitem', /delete/i);
        await t.hidden(t.role('cell', { name }), `${name} after Delete`);
      },
    },
    {
      id: 'invite-button',
      title: 'the toolbar has an "Invite user" button',
      run: async (t) => {
        await t.visible(t.role('button', { name: /invite user/i }), 'button Invite user');
      },
    },
  ],
};
