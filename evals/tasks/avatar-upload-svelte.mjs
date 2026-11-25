// SPDX-License-Identifier: MIT
import { ok } from '../lib/expect.mjs';

const png = (bytes) => ({ name: bytes > 1e6 ? 'huge.png' : 'me.png', mimeType: 'image/png', buffer: Buffer.alloc(bytes, 1) });

export default {
  id: 'avatar-upload-svelte',
  title: 'Image upload with a size limit',
  format: 'svelte',
  components: ['void-field', 'void-file-upload', 'void-alert', 'void-button'],
  prompt: `Profile photo uploader: a file picker labelled "Profile photo" that accepts PNG or JPEG up to 2 MB. If the chosen file is larger, show the error "File is larger than 2 MB" and don't let it be uploaded. Otherwise show the file name and enable an "Upload" button that submits a multipart form to /avatar with the file in the field avatar.`,
  checks: [
    {
      id: 'accepts-images',
      title: 'the picker accepts PNG and JPEG',
      run: async (t) => {
        await t.visible(t.text(/profile photo/i), 'label Profile photo');
        const accept = (await t.page.locator('input[type=file]').first().getAttribute('accept')) || '';
        ok(/png/i.test(accept) && /jpe?g/i.test(accept), `accept is "${accept}"`);
      },
    },
    {
      id: 'rejects-large',
      title: 'a 3 MB file shows the size error and cannot be uploaded',
      run: async (t) => {
        await t.page.locator('input[type=file]').first().setInputFiles(png(3 * 1024 * 1024));
        await t.settle();
        await t.visible(t.text(/larger than 2 mb/i), 'error "File is larger than 2 MB"');
        const upload = t.role('button', { name: /^upload$/i });
        if (await upload.first().isVisible().catch(() => false)) {
          await upload.first().click({ timeout: 1000, force: true }).catch(() => {});
          await t.page.waitForTimeout(300);
          const n = await t.submissionCount();
          ok(n === 0, 'the oversized file was submitted');
        }
      },
    },
    {
      id: 'uploads-small',
      title: 'a small PNG shows its name and uploads as avatar',
      run: async (t) => {
        await t.page.locator('input[type=file]').first().setInputFiles(png(20 * 1024));
        await t.settle();
        await t.visible(t.text('me.png'), 'file name me.png');
        await t.click('button', /^upload$/i);
        const sub = await t.submission('avatar upload');
        t.field(sub, 'avatar', 'me.png');
      },
    },
  ],
};
