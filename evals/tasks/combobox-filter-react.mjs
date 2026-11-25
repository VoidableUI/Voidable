// SPDX-License-Identifier: MIT
import { ok } from '../lib/expect.mjs';
import { TEAM } from '../fixtures/data.mjs';

export default {
  id: 'combobox-filter-react',
  title: 'Filterable picker (combobox)',
  format: 'react',
  components: ['void-field', 'void-combobox', 'void-option', 'void-button'],
  prompt: `Add an assignee picker to the task form. The field is labelled "Assignee": you type to filter the team members by name and pick one from the matching list. The form has an "Assign" button and posts to /tasks/42/assign with the field assignee set to the member's id.

const team = ${JSON.stringify(TEAM)};`,
  checks: [
    {
      id: 'filters',
      title: 'typing "mar" lists only the matching members',
      run: async (t) => {
        await t.fill(/^assignee/i, 'mar');
        await t.settle();
        await t.visible(t.role('option', { name: /margaret hamilton/i }), 'option Margaret Hamilton');
        await t.visible(t.role('option', { name: /mary keller/i }), 'option Mary Keller');
        ok(!(await t.role('option', { name: /ada lovelace/i }).filter({ visible: true }).count()), 'Ada Lovelace is still listed after typing "mar"');
      },
    },
    {
      id: 'posts-id',
      title: 'picking Mary Keller and assigning posts assignee=u20',
      run: async (t) => {
        await t.fill(/^assignee/i, 'mary');
        await t.settle();
        const opt = await t.visible(t.role('option', { name: /mary keller/i }), 'option Mary Keller');
        await opt.click();
        await t.settle();
        await t.click('button', /^assign$/i);
        const sub = await t.submission('assign form');
        t.field(sub, 'assignee', 'u20');
      },
    },
  ],
};
