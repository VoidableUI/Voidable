// SPDX-License-Identifier: MIT
import { ok } from '../lib/expect.mjs';

const NAMES = ['Inbox', 'Drafts', 'Sent', 'Archive'];
const navWidth = (t) =>
  t.role('link', { name: 'Drafts' }).first().evaluate((a) => {
    let e = a;
    while (e && !(e.getAttribute('role') === 'navigation' || e.localName === 'nav' || e.localName === 'aside')) e = e.parentElement;
    return (e || a).getBoundingClientRect().width;
  });

export default {
  id: 'sidebar-collapse-react',
  title: 'Collapsible sidebar app shell',
  format: 'react',
  components: ['void-sidebar', 'void-button', 'void-tooltip'],
  prompt: `Mail app shell with a collapsible left sidebar: navigation links Inbox, Drafts, Sent and Archive (each with an icon; Inbox is the current page) and a "Collapse sidebar" button that toggles between the full sidebar and a narrow icon-only rail, where the button then reads "Expand sidebar". In the rail the links must still have their names for screen readers. The content area shows the heading "Inbox".`,
  checks: [
    {
      id: 'links',
      title: 'the four links are in a navigation landmark, Inbox current',
      run: async (t) => {
        const nav = await t.visible(t.role('navigation').filter({ has: t.page.getByRole('link', { name: 'Drafts' }) }), 'navigation with the links');
        for (const n of NAMES) ok((await nav.getByRole('link', { name: n, exact: true }).count()) > 0, `link ${n} missing`);
        ok((await nav.getByRole('link', { name: 'Inbox', exact: true }).first().getAttribute('aria-current')) === 'page', 'Inbox lacks aria-current="page"');
        await t.visible(t.role('heading', { name: 'Inbox' }), 'heading Inbox');
      },
    },
    {
      id: 'collapses',
      title: '"Collapse sidebar" narrows the sidebar and keeps link names',
      run: async (t) => {
        const before = await navWidth(t);
        await t.click('button', /collapse sidebar/i);
        await t.page.waitForTimeout(500);
        const after = await navWidth(t);
        ok(after < before * 0.6, `sidebar went from ${Math.round(before)}px to ${Math.round(after)}px`);
        for (const n of NAMES) ok((await t.role('link', { name: n, exact: true }).count()) > 0, `link ${n} lost its name when collapsed`);
        await t.visible(t.role('button', { name: /expand sidebar/i }), 'button "Expand sidebar"');
      },
    },
    {
      id: 'expands',
      title: '"Expand sidebar" restores the full width',
      run: async (t) => {
        const narrow = await navWidth(t);
        await t.click('button', /expand sidebar/i);
        await t.page.waitForTimeout(500);
        const wide = await navWidth(t);
        ok(wide > narrow * 1.5, `sidebar went from ${Math.round(narrow)}px to ${Math.round(wide)}px`);
      },
    },
  ],
};
