// SPDX-License-Identifier: MIT
// Value reflection (#67), the one rule: every control with a `value` reflects it to the `value` attribute
// whenever it changes, whether the user changed it or a script set the property, and setting the attribute
// sets the property. A scalar is its string form; a list is a JSON array. `void-change` is not fired for a
// property or attribute set. A control for which the rule is harmful is listed with `excluded` and a reason.
//
// contract.test.mjs checks, in Chromium, for every entry:
//   user      what a user does (steps: fill, click, clickOption, press, select, type, key)
//   afterUser the `value` attribute after those steps
//   set       a value assigned to the `value` property, and afterSet, the attribute that results
//   write     { attribute, property }: the attribute is written, and the property reads `property`
//   secret    for a control that hides what is typed: after these steps the typed text is not in the attribute
// and against the manifest, that every element with a `value` field has an entry, and that a control that is
// not excluded has `value` as a reflected attribute. A control that does not follow the rule fails.
//
// A step is { fill: { label, text } }, { click: { role, name } }, { clickOption: name },
// { press: { role, name, key } }, { select: { label, value } }, { type: { label, text } } or { key: 'Tab' }.

/** A value that is configuration rather than state: a script sets it, the user never changes it. */
const identity = (html, set, write) => ({ html, set, afterSet: String(set), write: { attribute: String(write), property: write } });

export const VALUE_REFLECTION = {
  'void-input': {
    html: '<void-field label="Email"><void-input name="email"></void-input></void-field>',
    user: [{ fill: { label: 'Email', text: 'a@b.co' } }], afterUser: 'a@b.co',
    set: 'x@y.co', afterSet: 'x@y.co', write: { attribute: 'z@z.co', property: 'z@z.co' },
    secret: { html: '<void-field label="Secret"><void-input type="password" name="p"></void-input></void-field>', user: [{ fill: { label: 'Secret', text: 'hunter2' } }], text: 'hunter2' },
  },
  'void-textarea': {
    html: '<void-field label="Notes"><void-textarea name="n"></void-textarea></void-field>',
    user: [{ fill: { label: 'Notes', text: 'two\nlines' } }], afterUser: 'two\nlines',
    set: 'set text', afterSet: 'set text', write: { attribute: 'from attribute', property: 'from attribute' },
  },
  'void-action-input': {
    html: '<void-field label="Link"><void-action-input name="l"></void-action-input></void-field>',
    user: [{ fill: { label: 'Link', text: 'https://example.com' } }], afterUser: 'https://example.com',
    set: 'https://example.org', afterSet: 'https://example.org', write: { attribute: 'https://example.net', property: 'https://example.net' },
    secret: { html: '<void-field label="Secret"><void-action-input type="password" name="p"></void-action-input></void-field>', user: [{ fill: { label: 'Secret', text: 'hunter2' } }], text: 'hunter2' },
  },
  'void-compose-input': {
    html: '<void-compose-input aria-label="Message"></void-compose-input>',
    user: [{ fill: { label: 'Message', text: 'hello' } }], afterUser: 'hello',
    set: 'draft', afterSet: 'draft', write: { attribute: 'from attribute', property: 'from attribute' },
  },
  'void-number-input': {
    html: '<void-number-input aria-label="Quantity" name="q"></void-number-input>',
    user: [{ fill: { label: 'Quantity', text: '5' } }, { key: 'Tab' }], afterUser: '5',
    set: 7, afterSet: '7', write: { attribute: '9', property: 9 },
  },
  'void-slider': {
    html: '<void-slider aria-label="Volume" name="v"></void-slider>',
    user: [{ press: { role: 'slider', name: 'Volume', key: 'End' } }], afterUser: '100',
    set: 30, afterSet: '30', write: { attribute: '60', property: 60 },
  },
  'void-gauge': {
    html: '<void-gauge aria-label="Load" value="10"></void-gauge>',
    set: 64, afterSet: '64', write: { attribute: '33', property: 33 },
  },
  'void-pin-input': {
    html: '<void-pin-input length="4" name="code"></void-pin-input>',
    user: [{ type: { label: 'Digit 1 of 4', text: '1234' } }], afterUser: '1234',
    set: '5678', afterSet: '5678', write: { attribute: '4321', property: '4321' },
    secret: { html: '<void-pin-input mask length="4" name="pin"></void-pin-input>', user: [{ type: { label: 'Digit 1 of 4', text: '1234' } }], text: '1234' },
  },
  'void-radio-group': {
    html: '<void-radio-group label="Size" name="s"><void-radio value="s">Small</void-radio><void-radio value="l">Large</void-radio></void-radio-group>',
    user: [{ click: { role: 'radio', name: 'Large' } }], afterUser: 'l',
    set: 's', afterSet: 's', write: { attribute: 'l', property: 'l' },
  },
  'void-select': {
    html: '<void-field label="Plan"><void-select><select name="plan"><option value="free">Free</option><option value="pro">Pro</option></select></void-select></void-field>',
    user: [{ select: { label: 'Plan', value: 'pro' } }], afterUser: 'pro',
    set: 'free', afterSet: 'free', write: { attribute: 'pro', property: 'pro' },
  },
  'void-combobox': {
    html: '<void-field label="Fruit"><void-combobox name="f"><void-combobox-content><void-option value="a">Apple</void-option><void-option value="b">Banana</void-option></void-combobox-content></void-combobox></void-field>',
    user: [{ fill: { label: 'Fruit', text: 'ban' } }, { clickOption: 'Banana' }], afterUser: 'b',
    set: 'a', afterSet: 'a', write: { attribute: 'b', property: 'b' },
  },
  'void-multiselect': {
    html: '<void-field label="Fruits"><void-multiselect name="f"><void-multiselect-content><void-option value="a">Apple</void-option><void-option value="b">Banana</void-option></void-multiselect-content></void-multiselect></void-field>',
    user: [{ click: { role: 'combobox', name: 'Fruits' } }, { clickOption: 'Banana' }], afterUser: '["b"]',
    set: ['a', 'b'], afterSet: '["a","b"]', write: { attribute: '["a"]', property: ['a'] },
  },
  'void-checkbox-group': {
    html: '<void-checkbox-group label="Permissions" name="p"><void-checkbox value="r">Read</void-checkbox><void-checkbox value="w">Write</void-checkbox></void-checkbox-group>',
    user: [{ click: { role: 'checkbox', name: 'Write' } }], afterUser: '["w"]',
    set: ['r', 'w'], afterSet: '["r","w"]', write: { attribute: '["r"]', property: ['r'] },
  },
  'void-table': {
    html: '<void-table selectable aria-label="Fruit"><table><thead><tr><th>Pick</th><th>Name</th></tr></thead><tbody><tr data-value="a"><td><input type="checkbox" aria-label="Select Apple"></td><td>Apple</td></tr><tr data-value="b"><td><input type="checkbox" aria-label="Select Banana"></td><td>Banana</td></tr></tbody></table></void-table>',
    user: [{ click: { role: 'checkbox', name: 'Select Banana' } }], afterUser: '["b"]',
    set: ['a', 'b'], afterSet: '["a","b"]', write: { attribute: '["a"]', property: ['a'] },
  },
  'void-tags-input': {
    html: '<void-field label="Tags"><void-tags-input name="t"></void-tags-input></void-field>',
    user: [{ fill: { label: 'Tags', text: 'x' } }, { key: 'Enter' }], afterUser: '["x"]',
    set: ['a', 'b'], afterSet: '["a","b"]', write: { attribute: '["c"]', property: ['c'] },
  },
  'void-tabs': {
    html: '<void-tabs value="a"><void-tabs-list><void-tabs-trigger value="a">One</void-tabs-trigger><void-tabs-trigger value="b">Two</void-tabs-trigger></void-tabs-list><void-tabs-content value="a">1</void-tabs-content><void-tabs-content value="b">2</void-tabs-content></void-tabs>',
    user: [{ click: { role: 'tab', name: 'Two' } }], afterUser: 'b',
    set: 'a', afterSet: 'a', write: { attribute: 'b', property: 'b' },
  },
  'void-segmented-control': {
    html: '<void-segmented-control value="m" aria-label="Period"><void-segmented-control-item value="m">Monthly</void-segmented-control-item><void-segmented-control-item value="y">Yearly</void-segmented-control-item></void-segmented-control>',
    user: [{ click: { role: 'radio', name: 'Yearly' } }], afterUser: 'y',
    set: 'm', afterSet: 'm', write: { attribute: 'y', property: 'y' },
  },
  'void-toggle-group': {
    html: '<void-toggle-group aria-label="Format"><void-toggle value="b">Bold</void-toggle><void-toggle value="i">Italic</void-toggle></void-toggle-group>',
    user: [{ click: { role: 'button', name: 'Italic' } }], afterUser: 'i',
    set: 'b', afterSet: 'b', write: { attribute: 'i', property: 'i' },
  },
  'void-pagination': {
    html: '<void-pagination total="5" value="1"></void-pagination>',
    user: [{ click: { role: 'button', name: '2' } }], afterUser: '2',
    set: 3, afterSet: '3', write: { attribute: '4', property: 4 },
  },
  'void-calendar': {
    html: '<void-calendar value="2026-11-03"></void-calendar>',
    set: '2026-11-10', afterSet: '2026-11-10', write: { attribute: '2026-11-12', property: '2026-11-12' },
  },
  'void-date-picker': {
    html: '<void-date-picker aria-label="Due" value="2026-11-03"></void-date-picker>',
    set: '2026-11-10', afterSet: '2026-11-10', write: { attribute: '2026-11-12', property: '2026-11-12' },
  },
  'void-color-picker': {
    html: '<void-color-picker aria-label="Colour" value="#ff0000"></void-color-picker>',
    set: '#00ff00', afterSet: '#00ff00', write: { attribute: '#0000ff', property: '#0000ff' },
  },
  'void-editable': {
    html: '<void-editable aria-label="Title" value="Old"></void-editable>',
    set: 'New', afterSet: 'New', write: { attribute: 'Other', property: 'Other' },
  },
  'void-stepper': identity('<void-stepper value="0"></void-stepper>', 2, 1),
  'void-progress': identity('<void-progress value="10"></void-progress>', 40, 20),
  'void-stat': identity('<void-stat label="Revenue" value="1"></void-stat>', '5', '7'),
  'void-toggle': identity('<void-toggle>Bold</void-toggle>', 'bold', 'italic'),
  'void-checkbox': identity('<void-checkbox>Accept</void-checkbox>', 'yes', 'maybe'),
  'void-radio': identity('<void-radio>Small</void-radio>', 's', 'm'),
  'void-switch': identity('<void-switch>Notify</void-switch>', 'yes', 'maybe'),
  'void-option': identity('<void-option value="a">Apple</void-option>', 'b', 'c'),
  'void-menu-item': identity('<void-menu-item value="a">Apple</void-menu-item>', 'b', 'c'),
  'void-dropdown-menu-item': identity('<void-dropdown-menu-item value="a">Apple</void-dropdown-menu-item>', 'b', 'c'),
  'void-segmented-control-item': identity('<void-segmented-control-item value="a">A</void-segmented-control-item>', 'b', 'c'),

  'void-file-upload': {
    excluded: 'the value is a list of File objects the browser only lets a user choose: it has no string form, a file name is private to the page and would leak into the markup, and scripts cannot assign it. The void-change detail carries the files.',
  },
};

// Data from markup (#71), the named exception to the reflection rule above. A chart's `data` (and a gauge's
// `zones`) is read from a JSON attribute as well as from the property, so server-rendered markup draws a chart
// with no script; but it is NOT reflected when the property is set: the data can be large, and writing it back
// into the markup on every update would cost a serialisation and a DOM write for nothing. The attribute stays as
// the server wrote it, and an attribute that a server morph leaves unchanged does not animate the chart again.
//
// contract.test.mjs checks, in Chromium, for every entry: `html` (carrying the JSON attributes) draws `count`
// elements matching `draws`; assigning `set` to the property leaves every attribute exactly as written; and
// against the manifest, that every element with a `data` field is listed, with each attribute declared and
// not reflected.
export const DATA_ATTRIBUTES = {
  'void-bar-chart': {
    attributes: ['data'],
    html: '<void-bar-chart aria-label="Sales" data=\'{"series":[{"name":"Sales","values":[1,2,3]}],"labels":["a","b","c"]}\'></void-bar-chart>',
    draws: '.void-bar-chart-bar', count: 3,
    set: { series: [{ name: 'Sales', values: [4, 5] }], labels: ['a', 'b'] },
  },
  'void-line-chart': {
    attributes: ['data'],
    html: '<void-line-chart aria-label="Visits" data=\'{"series":[{"name":"Visits","values":[1,2,3]}],"labels":["a","b","c"]}\'></void-line-chart>',
    draws: '.void-line-chart-line', count: 1,
    set: { series: [{ name: 'Visits', values: [4, 5] }, { name: 'Signups', values: [1, 2] }], labels: ['a', 'b'] },
  },
  'void-donut-chart': {
    attributes: ['data'],
    html: '<void-donut-chart aria-label="Mix" data=\'{"segments":[{"name":"A","value":1},{"name":"B","value":2}]}\'></void-donut-chart>',
    draws: '.void-donut-chart-segment', count: 2,
    set: { segments: [{ name: 'A', value: 5 }] },
  },
  'void-gauge': {
    attributes: ['data', 'zones'],
    html: '<void-gauge aria-label="Memory" data=\'{"segments":[{"name":"Used","value":30},{"name":"Cache","value":20}]}\' zones=\'[{"from":0,"to":100,"color":"green"}]\'></void-gauge>',
    draws: '.void-gauge-segment', count: 2,
    set: { segments: [{ name: 'Used', value: 10 }] },
  },
};
