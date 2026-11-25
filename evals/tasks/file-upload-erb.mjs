// SPDX-License-Identifier: MIT
import { ok } from '../lib/expect.mjs';

export default {
  id: 'file-upload-erb',
  title: 'File upload',
  format: 'erb',
  components: ['void-field', 'void-file-upload', 'void-button'],
  prompt: `Build the "Import contacts" page: a multipart form that POSTs to /contacts/imports with a file field labelled "Contacts file" that only accepts .csv files, the hint "CSV, up to 5 MB" under it, and an "Import" button. The file goes in the field import[file].`,
  checks: [
    {
      id: 'hint',
      title: 'the hint "CSV, up to 5 MB" is shown',
      run: async (t) => {
        await t.visible(t.text(/csv, up to 5 mb/i), 'hint');
        await t.visible(t.text(/contacts file/i), 'label Contacts file');
      },
    },
    {
      id: 'accepts-csv',
      title: 'the file picker only accepts .csv',
      run: async (t) => {
        const inputs = t.page.locator('input[type=file]');
        ok((await inputs.count()) > 0, 'no file input on the page');
        const accept = (await inputs.first().getAttribute('accept')) || '';
        ok(/\.csv|text\/csv/i.test(accept), `accept is "${accept}"`);
      },
    },
    {
      id: 'uploads',
      title: 'choosing contacts.csv and importing submits it as import[file]',
      run: async (t) => {
        await t.page.locator('input[type=file]').first().setInputFiles({ name: 'contacts.csv', mimeType: 'text/csv', buffer: Buffer.from('name,email\nAda,ada@example.com\n') });
        await t.settle();
        await t.click('button', /^import$/i);
        const sub = await t.submission('import form');
        t.field(sub, 'import[file]', 'contacts.csv');
        const form = await t.page.locator('form').first().getAttribute('enctype');
        ok(form === 'multipart/form-data' || sub.kind === 'fetch', `form enctype is ${form}, files need multipart/form-data`);
      },
    },
  ],
};
