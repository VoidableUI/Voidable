// SPDX-License-Identifier: MIT
export default {
  id: 'dashboard-svelte',
  title: 'Usage dashboard with line and donut charts',
  format: 'svelte',
  components: ['void-stat', 'void-card', 'void-line-chart', 'void-donut-chart'],
  prompt: `Usage dashboard. Three stats: "Weekly active users" 3,412, "Avg. session" 6m 20s, "Error rate" 0.4%. Then two charts side by side (stacked on phones): a line chart "Weekly active users" for weeks W1 to W8 with 2810, 2950, 3020, 3100, 3180, 3240, 3330, 3412, and a donut chart "Plan mix" with Free 62, Pro 31, Enterprise 7.`,
  checks: [
    {
      id: 'stats',
      title: 'the three stats show their values',
      run: async (t) => {
        for (const v of ['3,412', '6m 20s', '0.4%']) await t.visible(t.text(v, { exact: true }), `value ${v}`);
        for (const l of ['Avg. session', 'Error rate']) await t.visible(t.text(l, { exact: true }), `label ${l}`);
      },
    },
    { id: 'line-chart', title: 'a chart named "Weekly active users" is drawn', run: async (t) => t.chart(/weekly active users/i) },
    { id: 'donut-chart', title: 'a chart named "Plan mix" is drawn', run: async (t) => t.chart(/plan mix/i) },
  ],
};
