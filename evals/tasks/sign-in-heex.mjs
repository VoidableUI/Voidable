// SPDX-License-Identifier: MIT
import { ok } from '../lib/expect.mjs';

export default {
  id: 'sign-in-heex',
  title: 'Log-in form with a server error',
  format: 'heex',
  components: ['void-alert', 'void-field', 'void-input', 'void-checkbox', 'void-button'],
  prompt: `LiveView log-in page. The form posts to /users/log_in with user[email] and user[password] (both required), a "Keep me logged in" checkbox user[remember_me] and a "Log in" button. When @error_message is set, show it above the form as an error that screen readers announce. There is no @form assign; build the form with the field names above.

Assigns: @error_message is a string or nil.`,
  data: { error_message: 'Invalid email or password' },
  checks: [
    {
      id: 'error-shown',
      title: 'the error message is shown and announced',
      run: async (t) => {
        const msg = await t.visible(t.text(/invalid email or password/i), 'error message');
        const announced = await msg.evaluate((el) => {
          for (let e = el; e; e = e.parentElement) {
            const r = e.getAttribute('role');
            const l = e.getAttribute('aria-live');
            if (r === 'alert' || r === 'status' || (l && l !== 'off')) return true;
          }
          return false;
        });
        ok(announced, 'the error is not in an alert or live region');
      },
    },
    {
      id: 'required',
      title: 'an empty form does not post',
      run: async (t) => {
        await t.click('button', /^log in$/i);
        await t.page.waitForTimeout(400);
        ok((await t.submissionCount()) === 0, 'the empty form was submitted');
      },
    },
    {
      id: 'posts',
      title: 'the filled form posts user[email], user[password] and user[remember_me]',
      run: async (t) => {
        await t.fill(/^email/i, 'ada@example.com');
        await t.fill(/^password/i, 'correct horse');
        await t.click('checkbox', /keep me logged in/i);
        await t.click('button', /^log in$/i);
        const sub = await t.submission('log-in form');
        t.field(sub, 'user[email]', 'ada@example.com');
        t.field(sub, 'user[password]', 'correct horse');
        const r = sub.fields['user[remember_me]'] || [];
        ok(r.some((v) => v !== 'false' && v !== '0' && v !== ''), `user[remember_me] is ${JSON.stringify(r)} after checking it`);
        ok(sub.action === '/users/log_in', `the form posts to ${sub.action}`);
      },
    },
  ],
};
