// SPDX-License-Identifier: MIT
import { ok } from '../lib/expect.mjs';

export default {
  id: 'settings-erb',
  title: 'Settings page with sections',
  format: 'erb',
  components: ['void-panel', 'void-field', 'void-input', 'void-textarea', 'void-switch', 'void-button'],
  prompt: `Build the account settings page for @user as one form that PATCHes to /settings. Group it into three sections, each with its own heading: "Profile" (display name and bio, prefilled from @user), "Notifications" (two on/off toggles, "Email notifications" and "Weekly digest", reflecting @user) and "Danger zone" (a red "Delete account" button that does not submit the form). End with a "Save changes" submit button. Use the field names user[display_name], user[bio], user[email_notifications] and user[weekly_digest].

@user responds to display_name, bio, email_notifications and weekly_digest (booleans).`,
  data: { user: { id: 7, display_name: 'Ada', bio: 'Analyst. Writes notes on engines.', email_notifications: true, weekly_digest: false } },
  checks: [
    {
      id: 'sections',
      title: 'the three section headings are present',
      run: async (t) => {
        for (const name of ['Profile', 'Notifications', 'Danger zone']) await t.visible(t.role('heading', { name }).or(t.role('region', { name })).or(t.role('group', { name })), `section "${name}"`);
      },
    },
    {
      id: 'prefilled',
      title: 'display name is prefilled and the toggles reflect @user',
      run: async (t) => {
        const name = await t.visible(t.label(/display name/i), 'field labelled Display name');
        const v = await name.inputValue().catch(async () => name.evaluate((e) => e.value ?? e.querySelector('input')?.value));
        ok(v === 'Ada', `display name is ${JSON.stringify(v)}`);
        const email = await t.visible(t.role('switch', { name: /email notifications/i }).or(t.role('checkbox', { name: /email notifications/i })), 'toggle Email notifications');
        const digest = await t.visible(t.role('switch', { name: /weekly digest/i }).or(t.role('checkbox', { name: /weekly digest/i })), 'toggle Weekly digest');
        const on = async (l) => (await l.getAttribute('aria-checked')) === 'true' || (await l.isChecked().catch(() => false));
        ok(await on(email), 'Email notifications is off but @user has it on');
        ok(!(await on(digest)), 'Weekly digest is on but @user has it off');
      },
    },
    {
      id: 'saves',
      title: 'toggling Weekly digest and saving posts all fields',
      run: async (t) => {
        await t.fill(/display name/i, 'Ada L.');
        await t.role('switch', { name: /weekly digest/i }).or(t.role('checkbox', { name: /weekly digest/i })).first().click();
        await t.settle();
        await t.click('button', /save changes/i);
        const sub = await t.submission('settings form');
        t.field(sub, 'user[display_name]', 'Ada L.');
        t.field(sub, 'user[bio]', 'Analyst. Writes notes on engines.');
        const digest = sub.fields['user[weekly_digest]'] || [];
        ok(digest.some((v) => v !== '0' && v !== 'false' && v !== ''), `user[weekly_digest] is ${JSON.stringify(digest)} after turning it on`);
        t.field(sub, 'user[email_notifications]');
        const method = (sub.fields._method || [sub.method])[0];
        ok(/patch/i.test(method), `the form submits with method ${method}, expected PATCH`);
      },
    },
    {
      id: 'delete-does-not-submit',
      title: '"Delete account" does not submit the form',
      run: async (t) => {
        const before = await t.submissionCount();
        await t.click('button', /delete account/i);
        await t.page.waitForTimeout(300);
        ok((await t.submissionCount()) === before, 'clicking Delete account submitted the settings form');
      },
    },
  ],
};
