// SPDX-License-Identifier: MIT
export default {
  id: 'dashboard-react',
  title: 'Dashboard with stat tiles and a chart',
  format: 'react',
  components: ['void-stat', 'void-card', 'void-bar-chart', 'void-list', 'void-list-item'],
  prompt: `Build the analytics dashboard. At the top, four stat tiles in a row that wraps on small screens: Revenue $48,200 (+12% vs last month, trending up), Active users 1,284 (+4%, up), Churn 2.1% (-0.3%, down, which is good), Open tickets 37 (+5, up). Below them a bar chart titled "Monthly signups" for Jun to Nov with the values 120, 150, 180, 170, 210, 260. Next to the chart (below it on phones) a "Recent activity" list with these three entries: "Ada upgraded to Pro", "Grace invited 3 teammates", "Alan exported a report".`,
  checks: [
    {
      id: 'stat-tiles',
      title: 'the four stats show their labels and values',
      run: async (t) => {
        for (const [label, value] of [['Revenue', '$48,200'], ['Active users', '1,284'], ['Churn', '2.1%'], ['Open tickets', '37']]) {
          await t.visible(t.text(label, { exact: true }), `stat label ${label}`);
          await t.visible(t.text(value, { exact: true }), `stat value ${value}`);
        }
      },
    },
    {
      id: 'chart',
      title: 'a chart named "Monthly signups" is drawn',
      run: async (t) => t.chart(/monthly signups/i),
    },
    {
      id: 'activity',
      title: 'the Recent activity list shows three entries',
      run: async (t) => {
        await t.visible(t.text(/recent activity/i), 'heading Recent activity');
        for (const e of ['Ada upgraded to Pro', 'Grace invited 3 teammates', 'Alan exported a report']) await t.visible(t.text(e), `entry "${e}"`);
      },
    },
  ],
};
