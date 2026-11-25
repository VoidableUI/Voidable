// SPDX-License-Identifier: MIT
import { ok } from '../lib/expect.mjs';

export default {
  id: 'confirm-dialog-html',
  title: 'Confirm dialog flow',
  format: 'html',
  components: ['void-card', 'void-button', 'void-dialog'],
  prompt: `On the project page, add a "Delete project" button below the project card for "Apollo". Clicking it asks for confirmation in a modal titled "Delete Apollo?" that explains it can't be undone, with "Cancel" and "Delete" buttons. Cancel (or Escape) closes the modal and puts focus back on the "Delete project" button. Delete closes the modal, removes the project card and shows the text "Project deleted".`,
  checks: [
    {
      id: 'opens-modal',
      title: '"Delete project" opens a dialog named "Delete Apollo?"',
      run: async (t) => {
        await t.click('button', /delete project/i);
        await t.visible(t.role('dialog', { name: /delete apollo/i }), 'dialog "Delete Apollo?"');
      },
    },
    {
      id: 'cancel-returns-focus',
      title: 'Cancel closes the dialog and focus returns to the trigger',
      run: async (t) => {
        const dialog = t.role('dialog', { name: /delete apollo/i });
        await t.visible(dialog, 'dialog');
        await t.click('button', /^cancel$/i);
        await t.hidden(dialog, 'dialog after Cancel');
        const focused = await t.page.evaluate(() => (document.activeElement?.textContent || '').trim());
        ok(/delete project/i.test(focused), `focus is on "${focused.slice(0, 60)}", not the "Delete project" button`);
      },
    },
    {
      id: 'escape-closes',
      title: 'Escape closes the dialog',
      run: async (t) => {
        await t.click('button', /delete project/i);
        const dialog = t.role('dialog', { name: /delete apollo/i });
        await t.visible(dialog, 'dialog');
        await t.page.keyboard.press('Escape');
        await t.settle();
        await t.hidden(dialog, 'dialog after Escape');
      },
    },
    {
      id: 'delete-removes',
      title: 'Delete removes the card and shows "Project deleted"',
      run: async (t) => {
        await t.click('button', /delete project/i);
        const dialog = t.role('dialog', { name: /delete apollo/i });
        await t.visible(dialog, 'dialog');
        await dialog.first().getByRole('button', { name: /^delete$/i }).click();
        await t.settle();
        await t.hidden(dialog, 'dialog after Delete');
        await t.visible(t.text(/project deleted/i), 'text "Project deleted"');
        await t.hidden(t.text('Apollo', { exact: true }), 'the Apollo card');
      },
    },
  ],
};
