// SPDX-License-Identifier: MIT
import { ok } from '../lib/expect.mjs';

const MESSAGES = [
  { id: 1, subject: 'Quarterly report', from: 'Grace Hopper', preview: 'Numbers are in…', body: 'Revenue grew 12% over the quarter; details attached.' },
  { id: 2, subject: 'Lunch on Friday?', from: 'Alan Turing', preview: 'There is a new place…', body: 'There is a new place near the office that does excellent soup.' },
  { id: 3, subject: 'Release checklist', from: 'Margaret Hamilton', preview: 'Before we ship…', body: 'Before we ship, run the full test suite twice.' },
];

// The role="dialog" element of void-dialog and void-drawer is the native <dialog> in the host's shadow root; the author's parts are slotted into it, not its DOM descendants, so the content is scoped by the open host (evals/CONTRACT.md).
const PANEL = (t) => t.page.locator('void-dialog[open], void-drawer[open], dialog[open], [role="dialog"]');

export default {
  id: 'inbox-drawer-erb',
  title: 'Inbox with a detail side panel (Rails)',
  format: 'erb',
  components: ['void-list', 'void-list-item', 'void-drawer', 'void-avatar'],
  prompt: `Inbox page listing @messages (sender, subject and preview). Clicking a message opens a side panel from the right titled with the subject, showing the sender and the full body. It closes with its close button and with Escape. All messages are on the page already, so no request is needed to open one.

@messages is a list of records with id, subject, from, preview and body.`,
  data: { messages: MESSAGES },
  checks: [
    {
      id: 'opens',
      title: 'clicking "Quarterly report" opens a dialog with its body',
      run: async (t) => {
        const item = await t.visible(t.text('Quarterly report', { exact: true }), 'message "Quarterly report"');
        await item.click();
        await t.settle();
        await t.visible(t.role('dialog', { name: /quarterly report/i }), 'dialog "Quarterly report"');
        await t.visible(PANEL(t).getByText(/revenue grew 12%/i), 'message body in the panel');
        await t.visible(PANEL(t).getByText('Grace Hopper'), 'sender in the panel');
      },
    },
    {
      id: 'escape',
      title: 'Escape closes the panel',
      run: async (t) => {
        const d = t.role('dialog', { name: /quarterly report/i });
        await t.visible(d, 'dialog');
        await t.page.keyboard.press('Escape');
        await t.settle();
        await t.hidden(d, 'dialog after Escape');
      },
    },
    {
      id: 'another',
      title: 'opening another message shows that message',
      run: async (t) => {
        await (await t.visible(t.text('Release checklist', { exact: true }), 'message "Release checklist"')).click();
        await t.settle();
        const d = await t.visible(t.role('dialog', { name: /release checklist/i }), 'dialog "Release checklist"');
        await t.visible(PANEL(t).getByText(/run the full test suite/i), 'its body');
        ok(!(await PANEL(t).getByText(/revenue grew/i).first().isVisible().catch(() => false)), 'the panel still shows the first message');
        await PANEL(t).getByRole('button', { name: /close/i }).first().click();
        await t.settle();
        await t.hidden(d, 'dialog after its close button');
      },
    },
  ],
};
