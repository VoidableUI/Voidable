// SPDX-License-Identifier: MIT
import { ok } from '../lib/expect.mjs';

export default {
  id: 'validation-errors-blade',
  title: 'Server validation errors on a field',
  format: 'blade',
  components: ['void-field', 'void-input', 'void-button'],
  prompt: `Write the view of the Livewire NewsletterSignup component: an "Email" field (wire:model="email", name email, keeping the entered $email) and a "Subscribe" button in a POST form to /newsletter (with @csrf). Show the validation error for email from $errors under the field, associated with the field so screen readers read it with the field, and mark the field invalid.`,
  data: { email: 'taken@example.com', errors: { email: ['The email has already been taken.'] } },
  checks: [
    {
      id: 'error-visible',
      title: 'the error message is shown',
      run: async (t) => {
        await t.visible(t.text(/the email has already been taken/i), 'error message');
      },
    },
    {
      id: 'error-associated',
      title: 'the Email field is invalid and described by the error',
      run: async (t) => {
        const f = await t.visible(t.label(/^email/i), 'field Email');
        const desc = await t.description(f);
        ok(/already been taken/i.test(desc), `the Email field's description is "${desc}"`);
        ok((await f.getAttribute('aria-invalid')) === 'true', 'the Email field is not aria-invalid');
      },
    },
    {
      id: 'keeps-value',
      title: 'the entered email is kept and submitted',
      run: async (t) => {
        const f = await t.visible(t.label(/^email/i), 'field Email');
        const v = await f.inputValue().catch(() => f.evaluate((e) => e.value ?? e.querySelector('input')?.value));
        ok(v === 'taken@example.com', `Email is ${JSON.stringify(v)}`);
        await t.click('button', /subscribe/i);
        const sub = await t.submission('signup form');
        t.field(sub, 'email', 'taken@example.com');
        t.field(sub, '_token');
      },
    },
  ],
};
