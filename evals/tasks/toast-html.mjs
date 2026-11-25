// SPDX-License-Identifier: MIT
import { ok } from '../lib/expect.mjs';

export default {
  id: 'toast-html',
  title: 'Toast after an action',
  format: 'html',
  components: ['void-field', 'void-input', 'void-button', 'void-toast-container', 'void-toast'],
  prompt: `Profile page with a "Name" field and a "Save" button. Saving shouldn't reload the page (there's no backend yet, just pretend it worked): show a short-lived success notification "Profile saved" in the corner that screen readers announce, and that goes away on its own after a few seconds.`,
  checks: [
    {
      id: 'shows-toast',
      title: 'Save shows "Profile saved" in a live region without navigating',
      run: async (t) => {
        await t.fill(/^name/i, 'Ada');
        await t.click('button', /^save$/i);
        const msg = await t.visible(t.text(/profile saved/i), 'notification "Profile saved"');
        const live = await msg.evaluate((el) => {
          for (let e = el; e; e = e.parentElement) {
            const role = e.getAttribute('role');
            const liveAttr = e.getAttribute('aria-live');
            if (role === 'status' || role === 'alert' || role === 'log' || (liveAttr && liveAttr !== 'off')) return true;
          }
          return false;
        });
        ok(live, 'the notification is not inside a live region (role=status/alert or aria-live)');
        ok(t.navigations().length === 0, `the page navigated to ${t.navigations()[0]}`);
      },
    },
    {
      id: 'auto-dismiss',
      title: 'the notification disappears on its own within 10 seconds',
      run: async (t) => {
        await t.hidden(t.text(/profile saved/i), 'notification after 10 s', 10_000);
      },
    },
  ],
};
