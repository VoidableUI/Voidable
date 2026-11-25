// SPDX-License-Identifier: MIT
import { ok } from '../lib/expect.mjs';

const fullName = (t) => t.label(/full name/i);

export default {
  id: 'multi-step-svelte',
  title: 'Multi-step form with validation',
  format: 'svelte',
  components: ['void-stepper', 'void-field', 'void-input', 'void-select', 'void-button'],
  prompt: `Build a three-step signup wizard. Step 1 "Account": email and password (at least 8 characters). Step 2 "Profile": full name and a role picker with Developer, Designer and Manager. Step 3 "Review": a summary of the answers and a "Create account" button. Show which step the user is on. "Next" validates the current step and, instead of moving on, shows an error message at the invalid field; "Back" returns to the previous step and keeps the answers. Creating the account submits one form to /signup with the fields email, password, full_name and role (developer, designer or manager).`,
  checks: [
    {
      id: 'shows-steps',
      title: 'the step names are shown and step 1 asks for email and password',
      run: async (t) => {
        for (const s of ['Account', 'Profile', 'Review']) await t.visible(t.text(s, { exact: true }), `step name ${s}`);
        await t.visible(t.label(/^email/i), 'field Email');
        await t.visible(t.label(/^password/i), 'field Password');
      },
    },
    {
      id: 'validates-email',
      title: 'an invalid email blocks Next and shows an error',
      run: async (t) => {
        await t.fill(/^email/i, 'not-an-email');
        await t.fill(/^password/i, 'longenough1');
        await t.click('button', /^next$/i);
        await t.page.waitForTimeout(200);
        ok(!(await fullName(t).first().isVisible().catch(() => false)), 'moved to step 2 with an invalid email');
        await t.visible(t.text(/valid email|email.*(invalid|valid)|enter an email/i), 'an error message about the email');
      },
    },
    {
      id: 'validates-password',
      title: 'a short password blocks Next and shows an error',
      run: async (t) => {
        await t.fill(/^email/i, 'ada@example.com');
        await t.fill(/^password/i, 'short');
        await t.click('button', /^next$/i);
        await t.page.waitForTimeout(200);
        ok(!(await fullName(t).first().isVisible().catch(() => false)), 'moved to step 2 with a 5-character password');
        await t.visible(t.text(/8 characters/i), 'an error message about the password length');
      },
    },
    {
      id: 'back-keeps-answers',
      title: 'Next then Back keeps the email',
      run: async (t) => {
        await t.fill(/^email/i, 'ada@example.com');
        await t.fill(/^password/i, 'longenough1');
        await t.click('button', /^next$/i);
        await t.visible(fullName(t), 'field Full name on step 2');
        await t.click('button', /^back$/i);
        const email = await t.visible(t.label(/^email/i), 'field Email after Back');
        const v = await email.inputValue().catch(() => email.evaluate((e) => e.value ?? e.querySelector('input')?.value));
        ok(v === 'ada@example.com', `email is ${JSON.stringify(v)} after Back`);
      },
    },
    {
      id: 'submits-all',
      title: 'finishing the wizard submits all four fields',
      run: async (t) => {
        await t.click('button', /^next$/i);
        await t.fill(/full name/i, 'Ada Lovelace');
        await t.choose(/^role/i, 'Designer');
        await t.click('button', /^next$/i);
        await t.visible(t.text(/ada@example\.com/), 'summary shows the email');
        await t.visible(t.text(/designer/i), 'summary shows the role');
        await t.click('button', /create account/i);
        const sub = await t.submission('signup');
        t.field(sub, 'email', 'ada@example.com');
        t.field(sub, 'password', 'longenough1');
        t.field(sub, 'full_name', 'Ada Lovelace');
        t.field(sub, 'role', 'designer');
      },
    },
  ],
};
