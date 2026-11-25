// SPDX-License-Identifier: MIT
//
// The reference pages: what is photographed, and how to put each one in the
// state it is photographed in.
//
// The markup is not here. It lives once, as plain HTML files, in
// packages/storybook/stories/reference/ (the same files Storybook's
// Reference/Screens stories and the docs theme builder's preview render).
// This registry only names the files a page is made of and what to do to the
// page after it has loaded. When a component's markup changes, change that
// HTML, not this file.
//
//   id        the directory name in a capture and the `--page` filter
//   title     the label in the gallery
//   group     a heading in the gallery: screens, sheet or overlays
//   files     reference/<name>.html, concatenated in order
//   nav       the data-nav entry to mark current in the bar (null: no bar entry), or false: no bar
//   overlay   put the bar over the first section (the page opens on a photograph)
//   smoke     part of the small subset captured when no theme or component file changed
//   setup     runs in the page after it settled, before the photograph

/** @typedef {import('@playwright/test').Page} Page */

/** Click, then wait for the overlay the click opens to have stopped moving. */
async function click(page, selector) {
  await page.locator(selector).first().click();
}

const open = (id) => async (page) => {
  await page.evaluate((i) => {
    document.getElementById(i).open = true;
  }, id);
};

/** @type {Array<{id:string,title:string,group:'screens'|'sheet'|'overlays',files:string[],nav?:string|null|false,overlay?:boolean,smoke?:boolean,setup?:(page:Page)=>Promise<void>}>} */
export const PAGES = [
  { id: 'overview', title: 'Dashboard: figures, table, alert', group: 'screens', files: ['overview'], nav: 'overview', smoke: true },
  { id: 'table', title: 'Queue: toolbar, selection, table, pagination', group: 'screens', files: ['table'], nav: 'table' },
  { id: 'form', title: 'Form: groups, validation error', group: 'screens', files: ['form'], nav: 'form', smoke: true },
  {
    id: 'form-dialog',
    title: 'Form with a confirmation dialog open',
    group: 'screens',
    files: ['form', 'form-dialog'],
    nav: 'form',
    setup: open('confirm-dialog'),
  },
  { id: 'settings', title: 'Settings: side list, rows with controls', group: 'screens', files: ['settings'], nav: 'settings' },
  { id: 'empty', title: 'Empty states', group: 'screens', files: ['empty'], nav: null },
  { id: 'live', title: 'Imagery: bar over a photograph, glass panel', group: 'screens', files: ['live'], nav: 'live', overlay: true },
  { id: 'sheet', title: 'Component sheet: variants, sizes, eight colours', group: 'sheet', files: ['sheet'], nav: false, smoke: true },
  { id: 'states', title: 'Interaction states: hover, focus, pressed, disabled, invalid', group: 'sheet', files: ['states'], nav: false },
  { id: 'ov-dialog', title: 'Overlay: dialog', group: 'overlays', files: ['overlays'], nav: false, setup: async (page) => click(page, '#ov-dialog-trigger') },
  { id: 'ov-drawer', title: 'Overlay: drawer', group: 'overlays', files: ['overlays'], nav: false, setup: async (page) => click(page, '#ov-drawer-trigger') },
  { id: 'ov-popover', title: 'Overlay: popover', group: 'overlays', files: ['overlays'], nav: false, setup: async (page) => click(page, '#ov-popover-trigger') },
  { id: 'ov-menu', title: 'Overlay: dropdown menu', group: 'overlays', files: ['overlays'], nav: false, setup: async (page) => click(page, '#ov-menu-trigger') },
  {
    id: 'ov-tooltip',
    title: 'Overlay: tooltip',
    group: 'overlays',
    files: ['overlays'],
    nav: false,
    setup: async (page) => {
      await page.evaluate(() => {
        document.getElementById('ov-tooltip').open = true;
      });
    },
  },
  { id: 'ov-select', title: 'Overlay: select', group: 'overlays', files: ['overlays'], nav: false, setup: async (page) => click(page, '#ov-select') },
  { id: 'ov-combobox', title: 'Overlay: combobox', group: 'overlays', files: ['overlays'], nav: false, setup: async (page) => click(page, '#ov-combobox input') },
  {
    id: 'ov-date',
    title: 'Overlay: date picker',
    group: 'overlays',
    files: ['overlays'],
    nav: false,
    setup: async (page) => {
      await page.evaluate(() => {
        document.getElementById('ov-date').open = true;
      });
    },
  },
  {
    id: 'ov-toast',
    title: 'Overlay: toasts',
    group: 'overlays',
    files: ['overlays'],
    nav: false,
    setup: async (page) => {
      await page.evaluate(() => {
        const { toast } = window.VoidUI;
        toast({ title: 'Pass scheduled', description: 'MRD-0412 is assigned to Kiruna 3.', color: 'success', duration: 0 });
        toast({ title: 'Link degraded', description: 'Tromsø 2 is on its backup link.', color: 'warning', duration: 0 });
        toast({ title: 'Upload failed', description: 'The file is larger than 20 MB.', color: 'error', duration: 0 });
      });
    },
  },
];

/** Looks (a theme, or a skin on the default theme) in the small subset. */
export const SMOKE_LOOKS = ['void', 'skin-loft'];
