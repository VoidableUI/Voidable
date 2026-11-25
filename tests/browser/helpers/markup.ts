// SPDX-License-Identifier: MIT
//
// Server-rendered markup for the morph and snapshot specs.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pages = join(dirname(fileURLToPath(import.meta.url)), '..', 'pages');

/** Every component, as on the kitchen page, without its scripts and styles. */
export function allComponents(): string {
  return readFileSync(join(pages, 'kitchen.html'), 'utf8')
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '');
}

/** The form from issue #61: one unrelated text change empties it on master. */
export function signupForm(flash: string): string {
  return `<p class="flash">${flash}</p>
<form id="f">
  <void-field label="Email"><void-input id="email" name="email" type="email" value="ada@example.com"></void-input></void-field>
  <void-switch id="news" name="news" value="yes" checked>Newsletter</void-switch>
  <void-button id="save" type="submit">Save</void-button>
</form>`;
}

export type AppState = {
  v: number;
  dialogOpen: boolean;
  selectValue: string;
  options: string[];
  tabs: string[];
  menuItems: string[];
  checked: Record<string, boolean>;
  radio: string;
  tags: string[];
};

export const initialState: AppState = {
  v: 1,
  dialogOpen: false,
  selectValue: 'a',
  options: ['a', 'b', 'c'],
  tabs: ['a', 'b', 'c'],
  menuItems: ['a', 'b'],
  checked: { a: false, b: true, c: false },
  radio: 'x',
  tags: ['a', 'b'],
};

/**
 * A page of components that use the projection controller, rendered by the
 * "server" from `s`. `p` prefixes ids, for the fresh reference copy.
 */
export function projectionApp(s: AppState, p = ''): string {
  return `<void-card id="${p}card" heading="Card ${s.v}">
  <form id="${p}form">
    <label>Name <input name="n" class="ci"></label>
    <void-select id="${p}s" name="s" aria-label="Select" value="${s.selectValue}">${s.options.map((o) => `<option value="${o}">opt ${o} ${s.v}</option>`).join('')}</void-select>
    <void-combobox id="${p}cb" name="cb" placeholder="pick" aria-label="Combobox">${s.options.map((o) => `<void-option value="${o}">cb ${o} ${s.v}</void-option>`).join('')}</void-combobox>
    <void-multiselect id="${p}ms" name="ms" placeholder="many" aria-label="Multiselect">${s.options.map((o) => `<void-option value="${o}">ms ${o} ${s.v}</void-option>`).join('')}</void-multiselect>
    <void-checkbox-group id="${p}cg" label="Group ${s.v}" name="cg">${Object.entries(s.checked).map(([k, c]) => `<void-checkbox id="${p}ck-${k}" value="${k}"${c ? ' checked' : ''}>check ${k} ${s.v}</void-checkbox>`).join('')}</void-checkbox-group>
    <void-radio-group id="${p}rg" label="Radio ${s.v}" name="rg" value="${s.radio}">${['x', 'y', 'z'].map((o) => `<void-radio value="${o}">radio ${o} ${s.v}</void-radio>`).join('')}</void-radio-group>
  </form>
  <p class="cp">card ${s.v}</p>
</void-card>
<void-dialog id="${p}d" heading="Edit ${s.v}"${s.dialogOpen ? ' open' : ''}><div class="dc"><span>dialog ${s.v}</span><input class="din" aria-label="In dialog"></div></void-dialog>
<void-drawer id="${p}dr" heading="Drawer ${s.v}"><p class="drc">drawer ${s.v}</p></void-drawer>
<void-tabs id="${p}t">${s.tabs.map((o) => `<void-tab-panel tab="k${o}" label="Tab ${o} ${s.v}">panel ${o} ${s.v}</void-tab-panel>`).join('')}</void-tabs>
<void-dropdown-menu id="${p}dd"><button slot="trigger">Menu ${s.v}</button>${s.menuItems.map((o) => `<void-dropdown-menu-item>item ${o} ${s.v}</void-dropdown-menu-item>`).join('')}</void-dropdown-menu>
<div id="${p}tags">${s.tags.map((o) => `<void-tag removable>tag ${o} ${s.v}</void-tag>`).join('')}</div>`;
}
