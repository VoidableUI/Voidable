// SPDX-License-Identifier: MIT
import { ok } from '../lib/expect.mjs';

const checked = async (l) => (await l.getAttribute('aria-checked')) === 'true' || (await l.isChecked().catch(() => false));

export default {
  id: 'preferences-heex',
  title: 'Settings form with radio and checkbox groups',
  format: 'heex',
  components: ['void-radio-group', 'void-radio', 'void-checkbox-group', 'void-checkbox', 'void-button'],
  prompt: `Notification preferences form for @prefs, posting to /preferences. A "Frequency" choice of exactly one of "Instant", "Daily digest" and "Weekly digest" (values instant, daily, weekly) prefilled from @prefs.frequency; "Channels" checkboxes "Email", "SMS" and "Push" (values email, sms, push) prefilled from @prefs.channels; and a "Save preferences" button. The fields are frequency and channels[].

@prefs is a map with :frequency (a string) and :channels (a list of strings).`,
  data: { prefs: { frequency: 'daily', channels: ['email', 'push'] } },
  checks: [
    {
      id: 'prefilled',
      title: 'Daily digest is selected and Email and Push are checked',
      run: async (t) => {
        ok(await checked(await t.visible(t.role('radio', { name: /daily digest/i }), 'radio Daily digest')), 'Daily digest is not selected');
        ok(!(await checked(await t.visible(t.role('radio', { name: /weekly digest/i }), 'radio Weekly digest'))), 'Weekly digest is selected');
        ok(await checked(await t.visible(t.role('checkbox', { name: /^email$/i }), 'checkbox Email')), 'Email is not checked');
        ok(!(await checked(await t.visible(t.role('checkbox', { name: /^sms$/i }), 'checkbox SMS'))), 'SMS is checked');
        ok(await checked(await t.visible(t.role('checkbox', { name: /^push$/i }), 'checkbox Push')), 'Push is not checked');
      },
    },
    {
      id: 'groups-labelled',
      title: 'the two groups are named Frequency and Channels',
      run: async (t) => {
        await t.visible(t.role('radiogroup', { name: /frequency/i }).or(t.role('group', { name: /frequency/i })), 'group named Frequency');
        await t.visible(t.role('group', { name: /channels/i }), 'group named Channels');
      },
    },
    {
      id: 'saves',
      title: 'changing the choices and saving posts frequency and channels[]',
      run: async (t) => {
        await t.click('radio', /weekly digest/i);
        await t.click('checkbox', /^sms$/i);
        await t.click('checkbox', /^push$/i);
        ok(!(await checked(t.role('radio', { name: /daily digest/i }).first())), 'Daily digest is still selected after choosing Weekly');
        await t.click('button', /save preferences/i);
        const sub = await t.submission('preferences form');
        t.field(sub, 'frequency', 'weekly');
        t.field(sub, 'channels[]', ['email', 'sms']);
      },
    },
  ],
};
