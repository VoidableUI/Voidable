// SPDX-License-Identifier: MIT
import { ok } from '../lib/expect.mjs';

export default {
  id: 'tabs-heex',
  title: 'Tabs holding different content',
  format: 'heex',
  components: ['void-tabs', 'void-tab-panel', 'void-list', 'void-list-item', 'void-switch'],
  prompt: `Write the project page for @project. Under the project name, show three tabs: "Overview" (selected first) shows @project.description; "Activity" lists each entry of @activity as "<actor> <action>" (e.g. "Ada pushed 3 commits"); "Settings" has a "Public project" switch reflecting @project.public. Only the selected tab's content is visible.

Assigns: @project is a map with :name, :description and :public; @activity is a list of maps with :actor and :action.`,
  data: {
    project: { name: 'Apollo', description: 'Mission control dashboards for the launch team.', public: true },
    activity: [
      { actor: 'Ada', action: 'pushed 3 commits' },
      { actor: 'Grace', action: 'opened issue #12' },
      { actor: 'Alan', action: 'merged pull request #9' },
    ],
  },
  checks: [
    {
      id: 'tabs-exist',
      title: 'three tabs, Overview selected and its content shown',
      run: async (t) => {
        for (const name of ['Overview', 'Activity', 'Settings']) await t.visible(t.role('tab', { name }), `tab ${name}`);
        ok((await t.role('tab', { name: 'Overview' }).first().getAttribute('aria-selected')) === 'true', 'Overview is not selected');
        await t.visible(t.text(/mission control dashboards/i), 'Overview content');
        await t.hidden(t.text(/pushed 3 commits/i), 'Activity content while Overview is selected');
      },
    },
    {
      id: 'switch-tab',
      title: 'selecting Activity shows the activity and hides the overview',
      run: async (t) => {
        await t.click('tab', 'Activity');
        await t.visible(t.text(/Ada pushed 3 commits/), 'activity entry');
        await t.visible(t.text(/Alan merged pull request #9/), 'last activity entry');
        await t.hidden(t.text(/mission control dashboards/i), 'Overview content after switching');
        ok((await t.role('tab', { name: 'Activity' }).first().getAttribute('aria-selected')) === 'true', 'Activity is not marked selected');
        await t.visible(t.role('tabpanel'), 'a visible tabpanel');
      },
    },
    {
      id: 'settings-switch',
      title: 'the Settings tab has a "Public project" switch that is on',
      run: async (t) => {
        await t.click('tab', 'Settings');
        const sw = await t.visible(t.role('switch', { name: /public project/i }).or(t.role('checkbox', { name: /public project/i })), 'switch "Public project"');
        ok((await sw.getAttribute('aria-checked')) === 'true' || (await sw.isChecked().catch(() => false)), 'the switch is off but @project.public is true');
      },
    },
  ],
};
