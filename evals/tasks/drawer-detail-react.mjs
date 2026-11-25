// SPDX-License-Identifier: MIT
import { ok } from '../lib/expect.mjs';

const ORDERS = [
  { id: 1042, customer: 'Grace Hopper', total: '$129.00', status: 'Paid', items: ['Mechanical keyboard', 'USB-C cable'] },
  { id: 1043, customer: 'Alan Turing', total: '$54.50', status: 'Refunded', items: ['Desk lamp'] },
  { id: 1044, customer: 'Ada Lovelace', total: '$310.00', status: 'Pending', items: ['Monitor arm', 'Webcam', 'Headset'] },
];

export default {
  id: 'drawer-detail-react',
  title: 'Master-detail drawer',
  format: 'react',
  components: ['void-list', 'void-list-item', 'void-drawer', 'void-badge', 'void-button'],
  prompt: `Orders screen: list the orders below; each entry is a button "Order #<id>" with the customer and total next to it. Clicking an order opens a panel sliding in from the right titled "Order #<id>" that shows the customer, status, total and the items. The panel closes with its close button or Escape, and focus goes back to the order you opened.

const orders = ${JSON.stringify(ORDERS)};`,
  checks: [
    {
      id: 'opens-detail',
      title: 'clicking Order #1042 opens a dialog with its details',
      run: async (t) => {
        await t.click('button', /order #1042/i);
        const d = await t.visible(t.role('dialog', { name: /order #1042/i }), 'dialog "Order #1042"');
        for (const s of ['Grace Hopper', '$129.00', 'Mechanical keyboard', 'USB-C cable']) await t.visible(d.getByText(s), `"${s}" in the panel`);
      },
    },
    {
      id: 'escape-returns-focus',
      title: 'Escape closes the panel and focus returns to the order',
      run: async (t) => {
        const d = t.role('dialog', { name: /order #1042/i });
        await t.visible(d, 'dialog');
        await t.page.keyboard.press('Escape');
        await t.settle();
        await t.hidden(d, 'dialog after Escape');
        const focused = await t.page.evaluate(() => (document.activeElement?.textContent || '') + ' ' + (document.activeElement?.getAttribute('aria-label') || ''));
        ok(/1042/.test(focused), `focus is on "${focused.trim().slice(0, 60)}"`);
      },
    },
    {
      id: 'close-button',
      title: 'another order opens with its own details and the close button closes it',
      run: async (t) => {
        await t.click('button', /order #1044/i);
        const d = await t.visible(t.role('dialog', { name: /order #1044/i }), 'dialog "Order #1044"');
        await t.visible(d.getByText('Ada Lovelace'), 'customer of #1044');
        ok(!(await d.getByText('Grace Hopper').isVisible().catch(() => false)), 'the panel still shows #1042');
        await d.getByRole('button', { name: /close/i }).first().click();
        await t.settle();
        await t.hidden(d, 'dialog after its close button');
      },
    },
  ],
};
