// SPDX-License-Identifier: MIT
import { ok } from '../lib/expect.mjs';
import { USERS } from '../fixtures/data.mjs';

export default {
  id: 'users-table-blade',
  title: 'Server-paginated table with filters and row actions',
  format: 'blade',
  components: ['void-field', 'void-input', 'void-select', 'void-table', 'void-badge', 'void-dropdown-menu', 'void-dropdown-menu-item', 'void-pagination'],
  prompt: `Write the view of the Livewire UsersTable component. Above the table: a search field labelled "Search" (wire:model.live="search") and a "Status" select with All, Active, Invited and Suspended (wire:model.live="status", values "", active, invited, suspended). The table shows $users (the current page) with Name, Email and Status columns and, per row, an actions menu whose button is labelled "Actions for <name>" with "Edit" and "Deactivate". Under the table, page links for page $page of $lastPage, each a real link to ?page=N so it works without JavaScript.

$users is an array of objects with id, name, email and status; $search and $status are strings.`,
  data: { users: USERS.slice(0, 10), search: '', status: '', page: 1, lastPage: 3 },
  checks: [
    {
      id: 'rows',
      title: 'the table shows the ten users of page 1',
      run: async (t) => {
        await t.visible(t.role('table'), 'table');
        for (const u of [USERS[0], USERS[9]]) await t.visible(t.role('cell', { name: u.name }), `cell ${u.name}`);
        const n = await t.role('table').first().locator('tbody tr').count();
        ok(n === 10, `${n} body rows`);
      },
    },
    {
      id: 'filters',
      title: 'Search and Status controls are labelled; Status lists the four choices',
      run: async (t) => {
        await t.visible(t.label(/^search/i), 'field Search');
        const status = await t.visible(t.label(/^status/i).or(t.role('combobox', { name: /status/i })), 'control Status');
        const options = await status.evaluate((e) => [...(e.querySelectorAll ? e.querySelectorAll('option') : [])].map((o) => o.textContent.trim()));
        const all = options.length ? options : await t.page.locator('option').allTextContents();
        for (const o of ['All', 'Active', 'Invited', 'Suspended']) ok(all.some((x) => x.trim() === o), `Status has no option ${o} (has ${all.join(', ')})`);
      },
    },
    {
      id: 'row-menu',
      title: 'a row actions menu opens with Edit and Deactivate',
      run: async (t) => {
        await t.click('button', new RegExp(`actions for ${USERS[2].name}`, 'i'));
        await t.visible(t.role('menuitem', { name: /^edit$/i }), 'menu item Edit');
        await t.visible(t.role('menuitem', { name: /deactivate/i }), 'menu item Deactivate');
      },
    },
    {
      id: 'page-links',
      title: 'pagination renders real links to ?page=2 and ?page=3',
      run: async (t) => {
        const hrefs = await t.page.getByRole('link').evaluateAll((as) => as.map((a) => a.getAttribute('href') || ''));
        for (const p of [2, 3]) ok(hrefs.some((h) => new RegExp(`[?&]page=${p}(\\D|$)`).test(h)), `no link to page=${p} (links: ${hrefs.join(' ') || 'none'})`);
      },
    },
  ],
};
