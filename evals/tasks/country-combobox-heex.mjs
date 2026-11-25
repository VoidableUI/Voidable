// SPDX-License-Identifier: MIT
import { ok } from '../lib/expect.mjs';
import { COUNTRIES } from '../fixtures/data.mjs';

export default {
  id: 'country-combobox-heex',
  title: 'Searchable select in a server-rendered form',
  format: 'heex',
  components: ['void-field', 'void-input', 'void-combobox', 'void-option', 'void-button'],
  prompt: `Shipping address form posting to /address: "Full name", a searchable "Country" picker over @countries (type to filter, pick one) prefilled from @address.country, and "Postal code", then a "Save address" button. The fields are address[name], address[country] (the country code) and address[postal_code], prefilled from @address.

Assigns: @countries is a list of maps with :code and :name; @address is a map with :name, :country (a code) and :postal_code.`,
  data: { countries: COUNTRIES, address: { name: 'Ada Lovelace', country: 'DE', postal_code: '10115' } },
  checks: [
    {
      id: 'prefilled',
      title: 'the country shows Germany and the other fields are prefilled',
      run: async (t) => {
        const c = await t.visible(t.label(/^country/i), 'field Country');
        const v = await c.inputValue().catch(() => c.evaluate((e) => e.value ?? e.textContent));
        ok(/germany/i.test(v || ''), `Country shows ${JSON.stringify(v)}, expected Germany`);
        const n = await t.visible(t.label(/full name/i), 'field Full name');
        ok((await n.inputValue().catch(() => '')) === 'Ada Lovelace', 'Full name is not prefilled');
      },
    },
    {
      id: 'filters-and-saves',
      title: 'typing "swe" offers Sweden; saving posts address[country]=SE',
      run: async (t) => {
        await t.fill(/^country/i, 'swe');
        await t.settle();
        const opt = await t.visible(t.role('option', { name: /^sweden$/i }), 'option Sweden');
        ok(!(await t.role('option', { name: /^germany$/i }).filter({ visible: true }).count()), 'Germany is still listed after typing "swe"');
        await opt.click();
        await t.settle();
        await t.click('button', /save address/i);
        const sub = await t.submission('address form');
        t.field(sub, 'address[country]', 'SE');
        t.field(sub, 'address[name]', 'Ada Lovelace');
        t.field(sub, 'address[postal_code]', '10115');
      },
    },
  ],
};
