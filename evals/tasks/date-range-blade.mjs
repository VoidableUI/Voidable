// SPDX-License-Identifier: MIT
export default {
  id: 'date-range-blade',
  title: 'Date range picker in a form',
  format: 'blade',
  components: ['void-field', 'void-date-picker', 'void-button'],
  prompt: `Write the view of the Livewire ReportFilter component: a "Start date" and an "End date" date picker (bound to the start_date and end_date properties), prefilled from $start_date and $end_date (YYYY-MM-DD strings), and an "Apply" button. The form is a plain GET form to /reports sending start_date and end_date as YYYY-MM-DD, so it also works without Livewire.`,
  data: { start_date: '2026-11-01', end_date: '2026-11-15' },
  checks: [
    {
      id: 'prefilled',
      title: 'applying without changes sends the prefilled range',
      run: async (t) => {
        await t.visible(t.label(/start date/i), 'field Start date');
        await t.visible(t.label(/end date/i), 'field End date');
        await t.click('button', /^apply$/i);
        const sub = await t.submission('report filter');
        t.field(sub, 'start_date', '2026-11-01');
        t.field(sub, 'end_date', '2026-11-15');
      },
    },
    {
      id: 'picks-range',
      title: 'picking Nov 3 to Nov 20 sends that range',
      run: async (t) => {
        await t.pickDate(/start date/i, '2026-11-03');
        await t.pickDate(/end date/i, '2026-11-20');
        await t.click('button', /^apply$/i);
        const sub = await t.submission('report filter');
        t.field(sub, 'start_date', '2026-11-03');
        t.field(sub, 'end_date', '2026-11-20');
      },
    },
  ],
};
