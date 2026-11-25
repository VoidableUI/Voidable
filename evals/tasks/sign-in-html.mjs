// SPDX-License-Identifier: MIT
import { ok } from '../lib/expect.mjs';

export default {
  id: 'sign-in-html',
  title: 'Sign-in form',
  format: 'html',
  components: ['void-field', 'void-input', 'void-checkbox', 'void-button'],
  prompt: `Build our sign-in page. It needs an email field and a password field, both required, a "Remember me" checkbox and a "Sign in" button. The form posts to /session with the fields named email, password and remember. Put a "Forgot password?" link to /password/reset under the form. Center the form on the page; it has to work on phones too.`,
  checks: [
    {
      id: 'labelled-fields',
      title: 'email and password fields are labelled',
      run: async (t) => {
        await t.visible(t.label(/^email/i), 'field labelled Email');
        await t.visible(t.label(/^password/i), 'field labelled Password');
      },
    },
    {
      id: 'required-blocks-submit',
      title: 'submitting empty fields does not post',
      run: async (t) => {
        await t.click('button', /sign in/i);
        await t.page.waitForTimeout(400);
        ok((await t.submissionCount()) === 0, 'the empty form was submitted');
      },
    },
    {
      id: 'posts-credentials',
      title: 'filled form posts email, password and remember',
      run: async (t) => {
        await t.fill(/^email/i, 'ada@example.com');
        await t.fill(/^password/i, 'correct horse');
        await t.click('checkbox', /remember me/i);
        await t.click('button', /sign in/i);
        const sub = await t.submission('sign-in form');
        t.field(sub, 'email', 'ada@example.com');
        t.field(sub, 'password', 'correct horse');
        t.field(sub, 'remember');
      },
    },
    {
      id: 'forgot-link',
      title: '"Forgot password?" links to /password/reset',
      run: async (t) => {
        const a = await t.visible(t.role('link', { name: /forgot password/i }), 'link "Forgot password?"');
        ok((await a.getAttribute('href')) === '/password/reset', `href is ${await a.getAttribute('href')}`);
      },
    },
  ],
};
