// SPDX-License-Identifier: MIT
import { ok } from '../lib/expect.mjs';

export default {
  id: 'pricing-toggle-html',
  title: 'Pricing cards with a billing period switcher',
  format: 'html',
  components: ['void-segmented-control', 'void-segmented-control-item', 'void-card', 'void-badge', 'void-button'],
  prompt: `Pricing section with three plan cards, Starter ($9/mo or $90/yr), Team ($29/mo or $290/yr, marked "Most popular") and Business ($79/mo or $790/yr), each with a "Choose <plan>" button. Above the cards a Monthly / Yearly switcher, Monthly selected; choosing Yearly shows the yearly prices on all cards. The cards sit in a row on wide screens and stack on phones.`,
  checks: [
    {
      id: 'monthly',
      title: 'monthly prices are shown first',
      run: async (t) => {
        for (const p of ['$9', '$29', '$79']) await t.visible(t.text(new RegExp(`\\${p}(?!\\d)`)), `price ${p}`);
        await t.visible(t.text(/most popular/i), '"Most popular" on Team');
        for (const p of ['Starter', 'Team', 'Business']) await t.visible(t.role('button', { name: new RegExp(`choose ${p}`, 'i') }), `button Choose ${p}`);
      },
    },
    {
      id: 'yearly',
      title: 'choosing Yearly shows $90, $290 and $790',
      run: async (t) => {
        await t.choose(/billing|period/i, 'Yearly');
        for (const p of ['$90', '$290', '$790']) await t.visible(t.text(new RegExp(`\\${p}(?!\\d)`)), `yearly price ${p}`);
        ok(!(await t.text(/\$29(?!\d)/).filter({ visible: true }).count()), '$29 is still shown after choosing Yearly');
      },
    },
    {
      id: 'selected-state',
      title: 'the switcher reports Yearly as selected',
      run: async (t) => {
        const y = t.role('radio', { name: /^yearly$/i }).or(t.role('tab', { name: /^yearly$/i })).or(t.role('button', { name: /^yearly$/i }));
        const el = await t.visible(y, 'Yearly option');
        const state = (await el.getAttribute('aria-checked')) ?? (await el.getAttribute('aria-selected')) ?? (await el.getAttribute('aria-pressed'));
        ok(state === 'true', `Yearly reports ${state}`);
      },
    },
  ],
};
