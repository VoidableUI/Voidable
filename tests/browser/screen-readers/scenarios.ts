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
    trace: true,
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
      // VoiceOver, arriving by quick navigation, says "Free selected radio button, 1 of 3": the group name is not repeated.
      { reach: { role: 'radio', name: 'Free', checked: true, group: { role: 'radiogroup', name: 'Plan' }, position: { n: 1, of: 3, within: '#plan' }, spoken: { VoiceOver: [/selected/, /1 of 3/] } }, by: 'control' },
      { reach: { role: 'radio', name: 'Pro', checked: false, position: { n: 2, of: 3, within: '#plan' }, spoken: { VoiceOver: [/\b2 of 3\b/] } }, by: 'control' },
      { act: true },
      { hear: { role: 'radio', name: 'Pro', checked: true } },
      // Arrow keys move through the group and check as they go; the group is one tab stop.
      { press: 'ArrowDown' },
      { hear: { role: 'radio', name: 'Team', checked: true, position: { n: 3, of: 3, within: '#plan' }, spoken: { VoiceOver: [/3 of 3/] } } },
      { press: 'ArrowDown' },
      { hear: { role: 'radio', name: 'Free', checked: true, position: { n: 1, of: 3, within: '#plan' } } },
      { press: 'ArrowUp' },
      { hear: { role: 'radio', name: 'Team', checked: true } },
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
      // No `act`: VoiceOver's control navigation already puts focus on the slider. With it, one run heard
      // "70" where "60" was expected (two steps) and passed on retry; VO+Space on a slider is not a step the user takes.
      { reach: { role: 'slider', name: 'Volume', value: '50' }, by: { VoiceOver: 'control', NVDA: 'focusable' } },
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
    readerIssues: { VoiceOver: { key: 'untracked:voiceover-dialog-description', detail: 'VoiceOver said "Profile settings web dialog with 6 items" and never the description.' } },
    steps: [
      { reach: { role: 'button', name: 'Edit profile' }, by: 'control' },
      { act: true },
      { hear: { role: 'dialog', name: 'Profile settings' } },
      { hear: { role: 'dialog', name: 'Profile settings', description: 'Change how your name appears.', describedByReference: true } },
      { focus: 'void-dialog' },
      { walk: 10, unreachable: { role: 'button', name: 'Background action' } },
      // NVDA in focus mode on the name field can spend the first Escape on leaving focus mode (browse mode) before the page sees it: press it twice there; a second Escape on a closed dialog does nothing.
      { press: 'Escape', times: { NVDA: 2 } },
      { focus: '#opener' },
      { hear: { role: 'button', name: 'Edit profile' } },
    ],
  },
  {
    id: 'dropdown-menu',
    title: 'A dropdown menu announces menu items with their position, and choosing one closes it and returns focus',
    page: '/sr-menu',
    steps: [
      // VoiceOver says "Actions menu pop up button" and leaves the collapsed state unspoken.
      { reach: { role: 'button', name: 'Actions', expanded: false, spoken: { VoiceOver: [/pop up/] } }, by: 'control' },
      { act: true },
      { focus: '[role="menuitem"]' },
      { hear: { role: 'menuitem', name: 'Rename', position: { n: 1, of: 3, within: 'void-dropdown-menu-content' } } },
      { press: 'ArrowDown' },
      { hear: { role: 'menuitem', name: 'Duplicate', position: { n: 2, of: 3, within: 'void-dropdown-menu-content' } } },
      { press: 'Enter' },
      { check: async (page) => expect(page.locator('#chosen')).toHaveText('Chosen duplicate'), note: 'the chosen item was selected' },
      { focus: '#actions-trigger' },
      { hear: { role: 'button', name: 'Actions', expanded: false, spoken: { VoiceOver: [/actions/] } } },
    ],
  },
  {
    id: 'tabs',
    trace: true,
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
    trace: true,
    title: 'A toast is announced once, politely, by the container\'s status announcer without moving focus',
    page: '/sr-notices',
    steps: [
      { reach: { role: 'button', name: 'Send notification' }, by: 'control' },
      { act: true },
      { hear: { role: 'status', text: 'Changes saved', container: true, spoken: [/changes saved/] } },
      { once: /changes saved/ },
      {
        check: async (page) => {
          await expect(page.getByRole('region', { name: 'Notifications' })).not.toHaveAttribute('aria-live', /.+/);
          await expect(page.locator('#flash [role=status]')).toHaveAttribute('aria-live', 'polite');
          await expect(page.locator('#flash > void-toast')).toHaveAttribute('role', 'group');
          await expect(page.getByRole('group', { name: 'Changes saved' })).toHaveCount(1);
        },
        note: 'the container announces through a polite status announcer; the visible toast is a group, not a second live region',
      },
      { focus: '#notify' },
    ],
  },
  {
    id: 'alert',
    title: 'An alert is read with its title and message, and its close control dismisses it',
    page: '/sr-alert',
    steps: [
      { reach: { role: 'alert', text: 'Payment failed', container: true, spoken: [/payment failed/] } },
      { reach: { role: 'button', name: 'Dismiss' }, by: 'control' },
      { act: true },
      {
        check: async (page) => {
          await expect(page.locator('#problem')).toHaveCount(0);
          await expect(page.getByRole('alert')).toHaveCount(0);
        },
        note: 'the alert is gone from the page and from the accessibility tree',
      },
    ],
  },
  {
    id: 'tooltip',
    title: 'A tooltip is announced as the description of its trigger when the trigger takes focus',
    page: '/sr-tooltip',
    steps: [
      { reach: { role: 'heading', name: 'Toolbar', level: 1 }, by: 'heading' },
      // Not `press: 'Tab'`: after heading navigation VoiceOver said nothing for Tab (only "You are
      // currently on a heading level 1."). Control navigation focuses the button, which is what shows the tooltip.
      { reach: { role: 'button', name: 'Bold' }, by: 'control' },
      { hear: { role: 'button', name: 'Bold' } },
      { hear: { role: 'button', name: 'Bold', description: 'Make the selection bold' } },
    ],
  },
  {
    id: 'table',
    trace: true,
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
    // The filter field comes first on the page, then the table (#89): the count is a polite status.
    id: 'table-filter',
    title: 'Filtering a table says how many rows are shown',
    page: '/sr-table-data',
    steps: [
      { reach: { role: 'searchbox', name: 'Filter team' }, by: 'control' },
      { act: true },
      { type: 'jose' },
      { hear: { role: 'status', text: '1 of 3 rows', container: true, spoken: [/1 of 3 rows/] } },
    ],
  },
  {
    id: 'table-sort',
    title: 'Sorting a column by its header button says the new state, and the header carries it',
    page: '/sr-table-data',
    steps: [
      { reach: { role: 'button', name: 'Name' }, by: 'control' },
      { act: true },
      { hear: { role: 'status', text: 'Sorted by Name, ascending', container: true, spoken: [/sorted by name.*ascending/] } },
      {
        check: async (page) => {
          await expect(page.locator('th[data-sort]')).toHaveAttribute('aria-sort', 'ascending');
        },
        note: 'the column header says it is sorted ascending',
      },
    ],
  },
  {
    id: 'table-select',
    title: 'Selecting a row says how many are selected, and select-all is named for what it does',
    page: '/sr-table-data',
    steps: [
      { reach: { role: 'checkbox', name: 'Select all rows' }, by: 'control' },
      { reach: { role: 'checkbox', name: 'Select Ada' }, by: 'control' },
      { act: true },
      { hear: { role: 'status', text: '1 selected', container: true, spoken: [/1 selected/] } },
      {
        check: async (page) => {
          await expect(page.getByRole('checkbox', { name: 'Select all rows' })).toHaveAttribute('aria-checked', 'mixed');
        },
        note: 'select-all is mixed while some rows are selected',
      },
    ],
  },
  {
    // A chart is a drawing hidden from the reader plus a visually hidden table of its data (#71): the
    // reader finds the table by the chart's name and moves through the values like any table.
    id: 'chart-table',
    trace: true,
    title: 'A chart is read as a data table named by the chart, and a value is read with its series header',
    page: '/sr-chart',
    steps: [
      { reach: { role: 'table', name: 'Visitors by day' }, by: 'table' },
      { cell: 'down' },
      { cell: 'right' },
      { hear: { role: 'cell', name: '120', header: 'Visitors' } },
    ],
  },
  {
    id: 'breadcrumbs',
    title: 'Breadcrumbs are a named navigation landmark of links and the last item is the current page',
    page: '/sr-navigation',
    steps: [
      { reach: { role: 'navigation', name: 'Breadcrumb' }, by: 'landmark' },
      { reach: { role: 'link', name: 'Products' }, by: 'link' },
      { reach: { role: 'listitem', text: 'Keyboards', current: true, container: true, position: { n: 3, of: 3, within: 'void-breadcrumbs-list' }, spoken: { NVDA: [/current page/] } } },
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
