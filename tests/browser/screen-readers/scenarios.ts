// SPDX-License-Identifier: MIT
//
// The screen-reader scenarios, as data. See facts.ts for the vocabulary and
// README.md in this folder for how to add one. Select, combobox and multiselect
// are in scenarios-pickers.ts, because their markup is being redesigned.
//
// Write steps in the order the page reads (top to bottom): a screen reader's
// cursor only moves forward through them. Every scenario starts at the top of
// the page. Names, roles and states are what the accessibility tree says today
// (tree.ts asserts them in Chromium and Firefox); the screen-reader run says
// the same things with its own words (words.ts).
import { expect } from '@playwright/test';
import type { Scenario } from './facts';

export const scenarios: Scenario[] = [
  {
    id: 'button',
    title: 'A button has a name and a role, and activating it works',
    page: '/sr-buttons',
    steps: [
      { reach: { role: 'button', name: 'Save changes' }, by: 'control' },
      { act: true },
      { check: async (page) => expect(await page.evaluate(() => (window as any).saved)).toBe(1), note: 'activating Save changes ran its handler once' },
    ],
  },
  {
    id: 'link-button',
    title: 'A link inside a button is announced as a link, by its text',
    page: '/sr-buttons',
    steps: [{ reach: { role: 'link', name: 'Read the documentation' }, by: 'link' }],
  },
  {
    id: 'link-button-one-control',
    title: 'A link button is one control, not a button around a link',
    page: '/sr-buttons',
    knownIssue: {
      key: 'untracked:link-button-nested-interactive',
      detail:
        '<void-button><a href> puts role="button" and tabindex="0" on the host around the link, so the accessibility tree has a button named "Read the documentation" containing a link of the same name: two nested interactive controls (axe nested-interactive), announced twice and with two tab stops.',
    },
    steps: [
      {
        check: async (page) => {
          await expect(page.getByRole('link', { name: 'Read the documentation' })).toHaveCount(1);
          await expect(page.getByRole('button', { name: 'Read the documentation' }), 'no button around the link').toHaveCount(0);
        },
        note: 'one link and no button with that name',
      },
    ],
  },
  {
    id: 'icon-button',
    title: 'An icon-only button is announced by its aria-label',
    page: '/sr-buttons',
    steps: [{ reach: { role: 'button', name: 'Close panel' }, by: 'control' }],
  },
  {
    id: 'field-required-invalid',
    title: 'A field announces its label, that it is required, its helper text; an invalid one says so and reads its error',
    page: '/sr-field',
    steps: [
      { reach: { role: 'textbox', name: 'Email address', required: true, description: 'We never share it.' }, by: 'control' },
      { reach: { role: 'textbox', name: 'Invite code', invalid: true, description: 'Enter the six character code.' }, by: 'control' },
    ],
  },
  {
    id: 'checkbox',
    title: 'A checkbox announces unchecked, then checked after activation',
    page: '/sr-controls',
    steps: [
      { reach: { role: 'checkbox', name: 'Accept the terms', checked: false }, by: 'control' },
      { act: true },
      { hear: { role: 'checkbox', name: 'Accept the terms', checked: true } },
    ],
  },
  {
    id: 'radio-group',
    title: 'A radio group announces its name, each radio, its position and which is checked',
    page: '/sr-controls',
    steps: [
      { reach: { role: 'radio', name: 'Free', checked: true, group: { role: 'radiogroup', name: 'Plan' }, position: { n: 1, of: 3, within: '#plan' } }, by: 'control' },
      { reach: { role: 'radio', name: 'Pro', checked: false, position: { n: 2, of: 3, within: '#plan' } }, by: 'control' },
      { act: true },
      { hear: { role: 'radio', name: 'Pro', checked: true } },
    ],
  },
  {
    id: 'switch',
    title: 'A switch announces off, then on after activation',
    page: '/sr-controls',
    steps: [
      { reach: { role: 'switch', name: 'Weekly newsletter', checked: false }, by: 'control' },
      { act: true },
      { hear: { role: 'switch', name: 'Weekly newsletter', checked: true } },
    ],
  },
  {
    id: 'slider',
    title: 'A slider announces its value, and the new value when it changes',
    page: '/sr-controls',
    steps: [
      { reach: { role: 'slider', name: 'Volume', value: '50' }, by: 'control' },
      { act: true },
      { press: 'ArrowRight' },
      { hear: { role: 'slider', name: 'Volume', value: '60', spoken: [/\b60\b/] } },
    ],
  },
  {
    id: 'number-input',
    title: 'A number input announces its value, and the new value when it changes',
    page: '/sr-controls',
    steps: [
      { reach: { role: 'spinbutton', name: 'Seats', value: '2' }, by: 'control' },
      { act: true },
      { press: 'ArrowUp' },
      { hear: { role: 'spinbutton', name: 'Seats', value: '3', spoken: [/\b3\b/] } },
    ],
  },
  {
    id: 'dialog',
    title: 'A dialog announces itself and its title, contains reading, and Escape returns focus to its opener',
    page: '/sr-dialog',
    steps: [
      { reach: { role: 'button', name: 'Edit profile' }, by: 'control' },
      { act: true },
      { hear: { role: 'dialog', name: 'Profile settings' } },
      { hear: { role: 'dialog', name: 'Profile settings', description: 'Change how your name appears.', describedByReference: true } },
      { focus: 'void-dialog' },
      { walk: 10, unreachable: { role: 'button', name: 'Background action' } },
      { press: 'Escape' },
      { focus: '#opener' },
      { hear: { role: 'button', name: 'Edit profile' } },
    ],
  },
  {
    id: 'dropdown-menu',
    title: 'A dropdown menu announces menu items with their position, and choosing one closes it and returns focus',
    page: '/sr-menu',
    steps: [
      { reach: { role: 'button', name: 'Actions', expanded: false }, by: 'control' },
      { act: true },
      { focus: '[role="menuitem"]' },
      { hear: { role: 'menuitem', name: 'Rename', position: { n: 1, of: 3, within: 'void-dropdown-menu-content' } } },
      { press: 'ArrowDown' },
      { hear: { role: 'menuitem', name: 'Duplicate', position: { n: 2, of: 3, within: 'void-dropdown-menu-content' } } },
      { press: 'Enter' },
      { check: async (page) => expect(page.locator('#chosen')).toHaveText('Chosen duplicate'), note: 'the chosen item was selected' },
      { focus: '#actions-trigger' },
      { hear: { role: 'button', name: 'Actions', expanded: false } },
    ],
  },
  {
    id: 'tabs',
    title: 'Tabs announce tab, selected state and position; selecting one reads its panel',
    page: '/sr-tabs',
    steps: [
      { reach: { role: 'tab', name: 'Profile', selected: true, position: { n: 1, of: 3, within: 'void-tabs-list' } } },
      { reach: { role: 'tab', name: 'Billing', selected: false, position: { n: 2, of: 3, within: 'void-tabs-list' } } },
      { act: true },
      { hear: { role: 'tab', name: 'Billing', selected: true } },
      { reach: { role: 'tabpanel', name: 'Billing', text: 'Your invoices and cards.', container: true } },
    ],
  },
  {
    id: 'accordion',
    title: 'An accordion trigger announces collapsed, expanded after activation, and collapsed again',
    page: '/sr-disclosure',
    steps: [
      { reach: { role: 'button', name: 'How do refunds work?', expanded: false }, by: 'control' },
      { act: true },
      { hear: { role: 'button', name: 'How do refunds work?', expanded: true } },
      { reach: { role: 'region', name: 'How do refunds work?', text: 'Refunds arrive within five days.', container: true } },
    ],
  },
  {
    id: 'collapsible',
    title: 'A collapsible trigger announces collapsed, then expanded, then collapsed',
    page: '/sr-collapsible',
    steps: [
      { reach: { role: 'button', name: 'Shipping details', expanded: false }, by: 'control' },
      { act: true },
      { hear: { role: 'button', name: 'Shipping details', expanded: true } },
      { act: true },
      { hear: { role: 'button', name: 'Shipping details', expanded: false } },
    ],
  },
  {
    id: 'toast',
    title: 'A toast is announced politely by its live region without moving focus',
    page: '/sr-notices',
    steps: [
      { reach: { role: 'button', name: 'Send notification' }, by: 'control' },
      { act: true },
      { hear: { role: 'status', text: 'Changes saved', container: true, spoken: [/changes saved/] } },
      {
        check: async (page) => expect(page.getByRole('region', { name: 'Notifications' })).toHaveAttribute('aria-live', 'polite'),
        note: 'the toast container is a polite live region',
      },
      { focus: '#notify' },
    ],
  },
  {
    id: 'alert',
    title: 'An alert is read with its title and message',
    page: '/sr-alert',
    steps: [{ reach: { role: 'alert', text: 'Payment failed', container: true, spoken: [/payment failed/] } }],
  },
  {
    id: 'tooltip',
    title: 'A tooltip is announced as the description of its trigger when the trigger takes focus',
    page: '/sr-tooltip',
    steps: [
      { reach: { role: 'heading', name: 'Toolbar', level: 1 }, by: 'heading' },
      { press: 'Tab' },
      { hear: { role: 'button', name: 'Bold' } },
      { hear: { role: 'button', name: 'Bold', description: 'Make the selection bold' } },
    ],
  },
  {
    id: 'table',
    title: 'A table is announced with its name, and a cell is read with its column header',
    page: '/sr-table',
    steps: [
      { reach: { role: 'table', name: 'Team members' }, by: 'table' },
      { cell: 'down' },
      { cell: 'right' },
      { hear: { role: 'cell', name: 'Engineer', header: 'Role' } },
    ],
  },
  {
    id: 'breadcrumbs',
    title: 'Breadcrumbs are a named navigation landmark of links and the last item is the current page',
    page: '/sr-navigation',
    steps: [
      { reach: { role: 'navigation', name: 'Breadcrumb' }, by: 'landmark' },
      { reach: { role: 'link', name: 'Products' }, by: 'link' },
      { reach: { role: 'listitem', text: 'Keyboards', current: true, container: true, position: { n: 3, of: 3, within: 'void-breadcrumbs-list' } } },
    ],
  },
  {
    id: 'breadcrumbs-list',
    title: 'Breadcrumbs are a list of links, so a screen reader says how many and which one',
    page: '/sr-navigation',
    steps: [
      {
        check: async (page) => {
          const nav = page.getByRole('navigation', { name: 'Breadcrumb' });
          await expect(nav.getByRole('list'), 'a list inside the breadcrumb navigation').toHaveCount(1);
          await expect(nav.getByRole('listitem'), 'one list item per crumb').toHaveCount(3);
        },
        note: 'the breadcrumb navigation holds a list of three items',
      },
    ],
  },
  {
    id: 'pagination',
    title: 'Pagination is a navigation landmark and the current page is announced as current',
    page: '/sr-navigation',
    steps: [
      { reach: { role: 'navigation', name: 'Pagination' }, by: 'landmark' },
      { reach: { role: 'button', name: '3', current: true }, by: 'control' },
    ],
  },
];
