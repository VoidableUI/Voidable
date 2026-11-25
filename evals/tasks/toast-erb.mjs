// SPDX-License-Identifier: MIT
import { ok } from '../lib/expect.mjs';

export default {
  id: 'toast-erb',
  title: 'Toast from a row action (Rails)',
  format: 'erb',
  components: ['void-table', 'void-button', 'void-toast-container', 'void-toast'],
  prompt: `Pending invitations page: a table of @invitations (email and sent_at) where each row has a "Resend" button whose accessible name is "Resend invite to <email>". There's no endpoint yet, so clicking it should just show a notification "Invite resent to <email>" that screen readers announce and that disappears by itself after a few seconds.

@invitations is a list of records with id, email and sent_at (a string).`,
  data: { invitations: [{ id: 1, email: 'ada@example.com', sent_at: 'Nov 10' }, { id: 2, email: 'grace@example.com', sent_at: 'Nov 12' }, { id: 3, email: 'alan@example.com', sent_at: 'Nov 14' }] },
  checks: [
    {
      id: 'rows',
      title: 'each invitation has its Resend button',
      run: async (t) => {
        for (const e of ['ada@example.com', 'grace@example.com', 'alan@example.com']) await t.visible(t.role('button', { name: new RegExp(`resend invite to ${e.replace('.', '\\.')}`, 'i') }), `Resend button for ${e}`);
      },
    },
    {
      id: 'toast',
      title: 'Resend shows an announced notification naming the email',
      run: async (t) => {
        await t.click('button', /resend invite to grace@example\.com/i);
        const msg = await t.visible(t.text(/invite resent to grace@example\.com/i), 'notification');
        const live = await msg.evaluate((el) => {
          for (let e = el; e; e = e.parentElement) {
            const r = e.getAttribute('role');
            const l = e.getAttribute('aria-live');
            if (r === 'status' || r === 'alert' || (l && l !== 'off')) return true;
          }
          return false;
        });
        ok(live, 'the notification is not in a live region');
        ok(t.navigations().length === 0, `clicking Resend navigated to ${t.navigations()[0]}`);
      },
    },
    {
      id: 'dismisses',
      title: 'the notification goes away by itself',
      run: async (t) => t.hidden(t.text(/invite resent to grace@example\.com/i), 'notification after 10 s', 10_000),
    },
  ],
};
