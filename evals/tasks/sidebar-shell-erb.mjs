// SPDX-License-Identifier: MIT
import { ok } from '../lib/expect.mjs';

const LINKS = [['Dashboard', '/dashboard'], ['Projects', '/projects'], ['Team', '/team'], ['Settings', '/settings']];

export default {
  id: 'sidebar-shell-erb',
  title: 'Sidebar app shell with navigation',
  format: 'erb',
  components: ['void-sidebar', 'void-nav-bar', 'void-avatar', 'void-input', 'void-hamburger', 'void-list'],
  prompt: `Build the app shell for the Projects page. A left sidebar with the app name "Orbit" and navigation links Dashboard (/dashboard), Projects (/projects), Team (/team) and Settings (/settings), with Projects marked as the current page. A top bar with a search field labelled "Search" and the signed-in user's avatar for @current_user (show initials when avatar_url is nil). The main area has the heading "Projects" and lists the names of @projects. On phones the sidebar must not squeeze the content: hide it behind a menu button that opens it.

@current_user responds to name and avatar_url; @projects is a list of records with id and name.`,
  data: {
    current_user: { id: 1, name: 'Ada Lovelace', avatar_url: null },
    projects: [{ id: 1, name: 'Apollo' }, { id: 2, name: 'Gemini' }, { id: 3, name: 'Mercury' }],
  },
  checks: [
    {
      id: 'nav-links',
      title: 'a navigation landmark has the four links, Projects is current',
      run: async (t) => {
        const nav = await t.visible(t.role('navigation').filter({ has: t.page.getByRole('link', { name: 'Projects' }) }), 'navigation containing Projects');
        for (const [name, href] of LINKS) {
          const a = nav.getByRole('link', { name, exact: true });
          ok((await a.count()) > 0, `link ${name} missing from the navigation`);
          ok((await a.first().getAttribute('href')) === href, `${name} links to ${await a.first().getAttribute('href')}`);
        }
        ok((await nav.getByRole('link', { name: 'Projects', exact: true }).first().getAttribute('aria-current')) === 'page', 'Projects link lacks aria-current="page"');
      },
    },
    {
      id: 'main-content',
      title: 'main landmark with heading Projects and the project names',
      run: async (t) => {
        const main = await t.visible(t.role('main'), 'main landmark');
        await t.visible(main.getByRole('heading', { name: 'Projects' }), 'heading Projects in main');
        for (const n of ['Apollo', 'Gemini', 'Mercury']) await t.visible(main.getByText(n, { exact: true }), `project ${n}`);
      },
    },
    {
      id: 'top-bar',
      title: 'the top bar has a Search field and the user avatar',
      run: async (t) => {
        await t.visible(t.label(/^search/i).or(t.role('searchbox', { name: /search/i })), 'field Search');
        await t.visible(t.text('AL', { exact: true }).or(t.role('img', { name: /ada lovelace/i })), 'avatar for Ada Lovelace (initials AL)');
      },
    },
    {
      id: 'mobile-menu',
      title: 'at 390 px the content keeps its width and a menu button reveals the links',
      run: async (t) => {
        await t.page.setViewportSize({ width: 390, height: 844 });
        await t.settle();
        const width = await t.role('main').first().evaluate((e) => e.getBoundingClientRect().width);
        ok(width >= 300, `main is ${Math.round(width)}px wide at 390px`);
        const link = t.role('link', { name: 'Team', exact: true });
        if (!(await link.first().isVisible())) {
          const button = await t.visible(t.role('button', { name: /menu|navigation|sidebar/i }), 'a menu button at phone width');
          await button.click();
          await t.settle();
          await t.visible(link, 'link Team after opening the menu');
        }
      },
    },
  ],
};
