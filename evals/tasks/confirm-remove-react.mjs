// SPDX-License-Identifier: MIT
import { ok } from '../lib/expect.mjs';

const MEMBERS = ['Ada Lovelace', 'Grace Hopper', 'Alan Turing', 'Katherine Johnson', 'Linus Torvalds'];

export default {
  id: 'confirm-remove-react',
  title: 'Confirm before a destructive action',
  format: 'react',
  components: ['void-list', 'void-list-item', 'void-avatar', 'void-button', 'void-dialog', 'void-alert'],
  prompt: `Team members page listing these people: ${MEMBERS.join(', ')}. Each row shows an avatar with initials, the name and a "Remove" button whose accessible name is "Remove <name>". Remove asks "Remove <name> from the team?" in a modal with "Cancel" and a red "Remove" button. Confirming removes the person and shows the notice "<name> was removed" above the list; cancelling changes nothing.`,
  checks: [
    {
      id: 'lists-members',
      title: 'all five members with their Remove buttons',
      run: async (t) => {
        for (const m of MEMBERS) await t.visible(t.role('button', { name: new RegExp(`^remove ${m}$`, 'i') }), `button "Remove ${m}"`);
      },
    },
    {
      id: 'cancel-keeps',
      title: 'Cancel closes the modal and keeps the member',
      run: async (t) => {
        await t.click('button', /^remove grace hopper$/i);
        const d = await t.visible(t.role('dialog', { name: /remove grace hopper/i }), 'dialog "Remove Grace Hopper from the team?"');
        await d.getByRole('button', { name: /^cancel$/i }).click();
        await t.settle();
        await t.hidden(t.role('dialog', { name: /remove grace hopper/i }), 'dialog after Cancel');
        await t.visible(t.role('button', { name: /^remove grace hopper$/i }), 'Grace Hopper still listed');
      },
    },
    {
      id: 'confirm-removes',
      title: 'confirming removes the member and shows the notice',
      run: async (t) => {
        await t.click('button', /^remove grace hopper$/i);
        const d = await t.visible(t.role('dialog', { name: /remove grace hopper/i }), 'dialog');
        await d.getByRole('button', { name: /^remove$/i }).click();
        await t.settle();
        await t.hidden(t.role('dialog', { name: /remove grace hopper/i }), 'dialog after confirming');
        await t.visible(t.text(/grace hopper was removed/i), 'notice "Grace Hopper was removed"');
        ok(!(await t.role('button', { name: /^remove grace hopper$/i }).count()), 'Grace Hopper is still listed');
        await t.visible(t.role('button', { name: /^remove alan turing$/i }), 'the others are still listed');
      },
    },
  ],
};
