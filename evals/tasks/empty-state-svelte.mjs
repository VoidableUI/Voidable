// SPDX-License-Identifier: MIT
import { ok } from '../lib/expect.mjs';

export default {
  id: 'empty-state-svelte',
  title: 'Empty state',
  format: 'svelte',
  components: ['void-card', 'void-button'],
  prompt: `Build the Projects page. Projects come from \`let projects = $state([])\` (each { id, name, updatedAt }) and are shown as cards when there are any. Right now the list is empty, so design the empty state: a heading "No projects yet", one sentence explaining what a project is, and a primary "Create project" action that takes the user to /projects/new. The empty state should sit centered in the content area.`,
  checks: [
    {
      id: 'empty-message',
      title: 'the empty state heading and explanation are shown',
      run: async (t) => {
        await t.visible(t.role('heading', { name: /no projects yet/i }), 'heading "No projects yet"');
      },
    },
    {
      id: 'centered',
      title: 'the empty state is horizontally centered',
      run: async (t) => {
        const h = await t.visible(t.role('heading', { name: /no projects yet/i }), 'heading');
        const { left, right } = await h.evaluate((e) => {
          const r = document.createRange();
          r.selectNodeContents(e);
          const b = r.getBoundingClientRect();
          return { left: b.left, right: window.innerWidth - b.right };
        });
        ok(Math.abs(left - right) < 80, `heading text is off-center (left ${Math.round(left)}px, right ${Math.round(right)}px)`);
      },
    },
    {
      id: 'create-action',
      title: '"Create project" goes to /projects/new',
      run: async (t) => {
        const el = await t.visible(t.role('link', { name: /create project/i }).or(t.role('button', { name: /create project/i })), 'Create project action');
        await el.click();
        await t.page.waitForTimeout(300);
        ok(t.navigations().some((n) => n.startsWith('/projects/new')), `did not navigate to /projects/new (navigations: ${t.navigations().join(', ') || 'none'})`);
      },
    },
  ],
};
