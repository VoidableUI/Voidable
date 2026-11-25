// SPDX-License-Identifier: MIT
// The selector and state contract (#27): how a test, an agent driving a
// browser, or an eval check finds each element and reads its state without
// calling component JavaScript.
//
//   role     the ARIA role on the host element ("inner" when only a rendered
//            descendant carries one, null when there is none)
//   name     where the accessible name comes from
//   state    the stable handles for its state: reflected attributes (from the
//            manifest, checked by the unit test) and ARIA attributes
//   probe    optional browser check of one interaction (contract.test.mjs):
//            markup, an action, and the attributes that must change
//   gaps     what a test cannot observe or find reliably today; these are
//            findings for the library, not workarounds
//
// Reflected attributes come from the Custom Elements Manifest; this file only
// lists the ones that carry state. Events are the manifest's void-* events.

export const CONTRACT = {
  'void-accordion': { role: null, name: 'none', state: [], gaps: ['no group role or name; the items are only found by their heading buttons'] },
  'void-accordion-item': {
    role: 'inner',
    name: 'heading attribute, on the rendered button',
    state: ['open (reflected)', 'aria-expanded on the rendered heading button'],
    probe: { html: '<void-accordion-item heading="Shipping">Ships in 2 days</void-accordion-item>', click: { role: 'button', name: 'Shipping' }, expect: { host: { open: '' }, button: { name: 'Shipping', 'aria-expanded': 'true' } } },
  },
  'void-action-input': { role: 'inner', name: 'void-field label (on the inner input); the action button uses action-label', state: ['value (property only: the attribute is the initial value and is not updated)'], gaps: ['the current value is not reflected to an attribute: [value=...] selectors and attribute assertions see the initial value only', 'host has no role; void-action is its only signal for the action'] },
  'void-alert': { role: 'alert', name: 'text content', state: ['color (reflected)'], gaps: ['always role="alert", so a static, non-urgent notice is announced as urgent; no status variant'] },
  'void-avatar': { role: 'img', name: 'alt attribute', state: [], gaps: ['without alt the host is role="img" with an empty aria-label: an unnamed image (axe image-alt / role-img-alt)'] },
  'void-badge': { role: 'status', name: 'text content', state: ['color (reflected)'], gaps: ['every badge is role="status", a live region: a table of status badges is a page of live regions, and a decorative badge cannot opt out'] },
  'void-banner': { role: 'banner', name: 'text content', state: ['dismissable (reflected)'], gaps: ['role="banner" is the page header landmark; a second banner, or one inside <main>, is invalid'] },
  'void-bar-chart': { role: 'img', name: 'aria-label attribute', state: [], gaps: ['data is a property only and its shape ({ series: [{ name, values }], labels }) is not in the manifest or `voidable ref`; the drawn values are not exposed as text'] },
  'void-breadcrumbs': { role: 'navigation', name: 'fixed "Breadcrumb"', state: [] },
  'void-button': {
    role: 'button',
    name: 'text content or aria-label',
    state: ['disabled (reflected)', 'aria-disabled'],
    probe: { html: '<void-button disabled>Save</void-button>', expect: { host: { 'aria-disabled': 'true' } } },
  },
  'void-calendar': { role: 'group', name: 'fixed "Calendar"; the grid is named "<Month> <Year>"', state: ['value (reflected, YYYY-MM-DD)', 'aria-selected on the day cell'], gaps: ['day buttons are named with a long date ("Tuesday, November 3, 2026") that depends on locale'] },
  'void-card': { role: null, name: 'none', state: [], gaps: ['heading is rendered as text, not a heading element, so a card cannot be found by its title with getByRole("heading")'] },
  'void-carousel': { role: 'region', name: 'none (aria-roledescription="carousel")', state: ['active (reflected)'], gaps: ['no accessible name'] },
  'void-carousel-slide': { role: 'group', name: 'none (aria-roledescription="slide")', state: [] },
  'void-checkbox': {
    role: 'checkbox',
    name: 'text content',
    state: ['checked (reflected)', 'aria-checked ("mixed" when indeterminate)'],
    probe: { html: '<void-checkbox name="tos">Accept</void-checkbox>', click: { role: 'checkbox', name: 'Accept' }, expect: { host: { checked: '', 'aria-checked': 'true' } }, event: 'void-change' },
  },
  'void-checkbox-group': { role: 'group', name: 'label attribute (aria-label)', state: ['disabled (reflected)'], gaps: ['the selected values are a property only (value: string[]); read them from the child checkboxes'] },
  'void-collapsible': {
    role: 'inner',
    name: 'heading attribute, on the rendered button',
    state: ['open (reflected)', 'aria-expanded on the rendered button'],
    probe: { html: '<void-collapsible heading="Details">More</void-collapsible>', click: { role: 'button', name: 'Details' }, expect: { host: { open: '' }, button: { name: 'Details', 'aria-expanded': 'true' } } },
  },
  'void-color-picker': { role: null, name: 'none', state: ['value (reflected)', 'open (reflected)'], gaps: ['no role or accessible name on the host'] },
  'void-combobox': {
    role: 'inner',
    name: 'void-field label, on the inner role="combobox" input (aria-label falls back to the placeholder)',
    state: ['open (reflected)', 'aria-expanded on the inner combobox', 'role="option" with data-selected on the rendered options', 'value (property only: the attribute is the initial value and is not updated)'],
    probe: { html: '<void-field label="Fruit"><void-combobox name="f"><void-option value="a">Apple</void-option><void-option value="b">Banana</void-option></void-combobox></void-field>', fill: { label: 'Fruit', text: 'ban' }, clickOption: 'Banana', event: 'void-change' },
    gaps: [
      'the current value is not reflected to an attribute: [value=...] selectors and attribute assertions see the initial value only',
      'aria-selected on the rendered options marks the keyboard-active option, not the chosen one; the choice is only in data-selected',
      'the void-option children are not the options a user sees: the list renders its own role="option" copies',
    ],
  },
  'void-compose-input': { role: null, name: 'none (inner textarea)', state: ['value (property only: the attribute is the initial value and is not updated)'], gaps: ['the current value is not reflected to an attribute: [value=...] selectors and attribute assertions see the initial value only', 'no role or name on the host; the send button has no stable name'] },
  'void-date-picker': {
    role: 'combobox',
    name: 'void-field label, on the inner input',
    state: ['value (reflected, YYYY-MM-DD)', 'open (reflected)', 'aria-expanded'],
    gaps: ['the inner input is readonly: typing a date is impossible, so tests and users must page the calendar', 'the inner input carries aria-expanded without a role (axe aria-allowed-attr)'],
  },
  'void-dialog': {
    role: 'dialog',
    name: 'heading attribute (aria-label)',
    state: ['open (reflected)', 'aria-modal="true"'],
    probe: { html: '<void-dialog heading="Confirm">Sure?</void-dialog>', set: { open: true }, expect: { host: { open: '' } }, visible: { role: 'dialog', name: 'Confirm' } },
    gaps: ['role="dialog" stays on the host while closed (hidden content only)', 'focus is not returned to the opener on close; tests that check focus return need the app to do it'],
  },
  'void-divider': { role: 'separator', name: 'label attribute', state: ['aria-orientation'] },
  'void-donut-chart': { role: 'img', name: 'aria-label attribute', state: [], gaps: ['data is a property only; its shape ({ segments: [{ name, value }] }) is not in the manifest or `voidable ref`'] },
  'void-drawer': {
    role: 'dialog',
    name: 'heading attribute (aria-label)',
    state: ['open (reflected)', 'aria-modal="true"'],
    gaps: ['opening does not move focus into the drawer, and Escape is only handled while focus is inside it (void-dialog listens on the document)', 'focus is not returned to the opener on close'],
  },
  'void-dropdown-menu': {
    role: 'inner',
    name: 'the trigger element',
    state: ['open (reflected)', 'aria-haspopup="menu" and aria-expanded on the trigger', 'role="menu" panel', 'role="menuitem" items'],
    probe: { html: '<void-dropdown-menu><void-button slot="trigger">Actions</void-button><void-dropdown-menu-item>Edit</void-dropdown-menu-item></void-dropdown-menu>', click: { role: 'button', name: 'Actions' }, expect: { host: { open: '' }, button: { name: 'Actions', 'aria-expanded': 'true' } }, visible: { role: 'menuitem', name: 'Edit' } },
    gaps: ['the menu panel has no accessible name'],
  },
  'void-dropdown-menu-item': { role: 'menuitem', name: 'text content', state: ['disabled (reflected)', 'aria-disabled', 'destructive (reflected)'], gaps: ['void-select carries the item element, not a value; identify items by text'] },
  'void-editable': { role: null, name: 'none (inner input while editing)', state: ['value (reflected)', 'editing (reflected)'], gaps: ['no role or accessible name on the host in display mode'] },
  'void-error-fallback': { role: 'alert', name: 'heading attribute', state: [] },
  'void-field': { role: null, name: 'its label names the control inside (aria-labelledby, and for= on native controls)', state: ['error (reflected) -> aria-invalid and aria-describedby on the control'], gaps: [] },
  'void-file-upload': {
    role: 'inner',
    name: 'void-field label is not applied to the file input; the drop zone is a button named "Drop files here or browse"',
    state: ['the chosen file names as text'],
    gaps: ['files over max-size or not matching accept are dropped silently: no event, no error attribute, nothing to assert', 'no attribute reflects whether a file is chosen'],
  },
  'void-gauge': { role: 'img', name: 'aria-label attribute', state: ['value (property only: the attribute is the initial value and is not updated)'], gaps: ['the current value is not reflected to an attribute: [value=...] selectors and attribute assertions see the initial value only'] },
  'void-hamburger': {
    role: 'button',
    name: 'fixed "Menu" / "Close menu"',
    state: ['active (reflected)', 'aria-expanded'],
    probe: { html: '<void-hamburger></void-hamburger>', click: { role: 'button', name: 'Menu' }, expect: { host: { active: '', 'aria-expanded': 'true' } }, event: 'void-toggle' },
    gaps: ['the name is fixed and cannot say what it opens; aria-controls is not set'],
  },
  'void-hover-card': { role: 'inner', name: 'the trigger element', state: ['open (reflected)', 'aria-expanded on the trigger'] },
  'void-indicator': { role: 'status', name: 'fixed "notification"', state: ['count (reflected)'], gaps: ['the name does not include the count'] },
  'void-input': {
    role: 'inner',
    name: 'void-field label, on the inner input',
    state: ['value (attribute; the live value is the inner input value)', 'error (reflected) -> aria-invalid on the inner input', 'disabled (reflected)'],
    probe: { html: '<void-field label="Email"><void-input name="email"></void-input></void-field>', fill: { label: 'Email', text: 'a@b.co' }, event: 'void-input' },
  },
  'void-line-chart': { role: 'img', name: 'aria-label attribute', state: [], gaps: ['data is a property only; its shape ({ series: [{ name, values }], labels }) is not in the manifest or `voidable ref`'] },
  'void-list': { role: 'list', name: 'none', state: [] },
  'void-list-item': { role: 'listitem', name: 'text content', state: ['selected (reflected)', 'disabled (reflected)'], gaps: ['interactive items stay role="listitem": "selected" has no ARIA equivalent'] },
  'void-menu': { role: 'inner', name: 'none', state: ['open (reflected)', 'role="menu" rendered inside'], gaps: ['the menu has no accessible name'] },
  'void-menu-group': { role: 'group', name: 'label attribute', state: [] },
  'void-menu-item': { role: 'menuitem', name: 'text content', state: ['disabled (reflected)', 'aria-disabled'] },
  'void-multiselect': { role: 'inner', name: 'void-field label, on the inner combobox', state: ['open (reflected)', 'aria-expanded on the inner combobox', 'role="option" + aria-selected on rendered options'], gaps: ['the selected values are a property only (value: string[]), not reflected (#23)'] },
  'void-nav-bar': { role: 'navigation', name: 'none', state: [], gaps: ['role="navigation" on a top bar that usually holds search and account controls; a <nav> inside it makes a nested, unnamed landmark'] },
  'void-nav-menu': { role: 'menubar', name: 'none', state: [] },
  'void-nav-menu-item': { role: 'none', name: 'text content, on the rendered menuitem', state: ['open (reflected)', 'active (reflected)', 'aria-expanded on the trigger'] },
  'void-number-input': { role: null, name: 'void-field label or aria-label, on the inner spinbutton', state: ['value (reflected)', 'aria-valuenow on the inner spinbutton'], gaps: [] },
  'void-option': { role: null, name: 'text content', state: ['selected (reflected)'], gaps: ['not the element users interact with (see void-combobox)'] },
  'void-pagination': {
    role: 'inner',
    name: 'the rendered nav is named "Pagination"; buttons by page number, "Previous page", "Next page"',
    state: ['value (attribute)', 'aria-current="page" on the current page button or link'],
    probe: { html: '<void-pagination total="5" value="1"></void-pagination>', click: { role: 'button', name: '2' }, expect: { button: { name: '2', 'aria-current': 'page' } }, event: 'void-change' },
    gaps: ['value is not reflected after a click: read aria-current instead'],
  },
  'void-panel': { role: 'region', name: 'label attribute (aria-label)', state: [], gaps: ['without label it is an unnamed role="region"'] },
  'void-pin-input': { role: 'group', name: 'fixed "PIN input"', state: ['value (property only: the attribute is the initial value and is not updated)'], gaps: ['the current value is not reflected to an attribute: [value=...] selectors and attribute assertions see the initial value only'] },
  'void-popover': { role: null, name: 'the trigger element', state: ['open (reflected)'], gaps: ['the trigger gets no aria-expanded or aria-haspopup; the content has no role'] },
  'void-progress': { role: 'progressbar', name: 'none', state: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax', 'value (reflected)'], gaps: ['no accessible name'] },
  'void-radio': {
    role: 'radio',
    name: 'text content',
    state: ['checked (reflected)', 'aria-checked'],
    probe: { html: '<void-radio-group label="Size" name="s"><void-radio value="s">Small</void-radio><void-radio value="l">Large</void-radio></void-radio-group>', click: { role: 'radio', name: 'Large' }, expect: { radio: { name: 'Large', 'aria-checked': 'true' } }, event: 'void-change' },
  },
  'void-radio-group': { role: 'radiogroup', name: 'label attribute (aria-label)', state: ['value (property only: the attribute is the initial value and is not updated)'], gaps: ['the current value is not reflected to an attribute: [value=...] selectors and attribute assertions see the initial value only'] },
  'void-scroll-area': { role: null, name: 'none', state: [], gaps: ['a scrollable region with no role, name or tabindex: keyboard users cannot scroll it (axe scrollable-region-focusable when it overflows)'] },
  'void-segmented-control': { role: 'radiogroup', name: 'aria-label from the author', state: ['value (reflected)'] },
  'void-segmented-control-item': {
    role: 'radio',
    name: 'text content',
    state: ['aria-checked'],
    probe: { html: '<void-segmented-control value="m" aria-label="Period"><void-segmented-control-item value="m">Monthly</void-segmented-control-item><void-segmented-control-item value="y">Yearly</void-segmented-control-item></void-segmented-control>', click: { role: 'radio', name: 'Yearly' }, expect: { radio: { name: 'Yearly', 'aria-checked': 'true' } }, event: 'void-change' },
  },
  'void-select': { role: 'inner', name: 'void-field label, on the native select', state: ['value (property only: the attribute is the initial value and is not updated)', 'native select value'], gaps: ['the current value is not reflected to an attribute: [value=...] selectors and attribute assertions see the initial value only'] },
  'void-sidebar': {
    role: 'navigation',
    name: 'fixed "Sidebar navigation" unless aria-label is set',
    state: ['collapsed (reflected)'],
    gaps: ['no responsive behaviour and no aria-expanded/aria-controls link to a toggle: collapsing is a width change only'],
  },
  'void-skeleton': { role: 'presentation', name: 'none (aria-hidden)', state: [], gaps: ['the loading region gets no aria-busy; nothing announces loading'] },
  'void-slider': { role: null, name: 'void-field label or aria-label, on the inner slider', state: ['aria-valuenow on the inner slider', 'value (property only: the attribute is the initial value and is not updated)'], gaps: ['the current value is not reflected to an attribute: [value=...] selectors and attribute assertions see the initial value only'] },
  'void-spinner': { role: 'status', name: 'label attribute (default "Loading")', state: [] },
  'void-stat': { role: 'figure', name: 'none', state: ['trend (reflected)'], gaps: ['role="figure" without a name; the label is plain text, not linked to the value'] },
  'void-status-dot': { role: 'status', name: 'status attribute ("Online", "Away", "Offline")', state: ['status (reflected)'] },
  'void-stepper': { role: 'navigation', name: 'fixed "Progress"', state: ['value (reflected)', 'aria-current="step" and data-state="completed|active|upcoming" on each step'] },
  'void-switch': {
    role: 'switch',
    name: 'text content',
    state: ['checked (reflected)', 'aria-checked'],
    probe: { html: '<void-switch name="n">Notifications</void-switch>', click: { role: 'switch', name: 'Notifications' }, expect: { host: { checked: '', 'aria-checked': 'true' } }, event: 'void-change' },
  },
  'void-tab-panel': { role: 'tabpanel', name: 'aria-labelledby its tab', state: ['active (reflected)'] },
  'void-table': { role: null, name: 'none; the native <table> inside carries the table, row and cell roles', state: ['striped, hoverable, compact, bordered (reflected, presentational)'], gaps: ['no caption or name support; a wide table overflows unless the author wraps it (void-scroll-area)'] },
  'void-tabs': {
    role: 'inner',
    name: 'each void-tab-panel label becomes a role="tab" button',
    state: ['value (property only: the attribute is the initial value and is not updated)', 'aria-selected on the tabs', 'active on each void-tab-panel (reflected there)'],
    probe: { html: '<void-tabs value="a"><void-tab-panel tab="a" label="One">1</void-tab-panel><void-tab-panel tab="b" label="Two">2</void-tab-panel></void-tabs>', click: { role: 'tab', name: 'Two' }, expect: { tab: { name: 'Two', 'aria-selected': 'true' } }, event: 'void-change' },
    gaps: ['the current value is not reflected to an attribute: [value=...] selectors and attribute assertions see the initial value only', 'the tablist has no accessible name'],
  },
  'void-tag': { role: 'listitem', name: 'text content', state: ['removable (reflected)'], gaps: ['role="listitem" outside any list unless the author adds one'] },
  'void-tags-input': { role: null, name: 'void-field label or aria-label, on the inner text input', state: [], gaps: ['the tags are a property (value: TagValue[]), not reflected'] },
  'void-textarea': { role: null, name: 'void-field label, on the inner textarea', state: ['value (attribute)', 'error (reflected)'], gaps: [] },
  'void-toast': { role: 'status', name: 'text content (role="alert" for error and warning)', state: ['color (reflected)'], gaps: ['no attribute says whether it is still showing; it is removed from the DOM after duration'] },
  'void-toast-container': { role: 'region', name: 'fixed "Notifications" (aria-live="polite")', state: [] },
  'void-toggle': {
    role: 'button',
    name: 'text content',
    state: ['pressed (reflected)', 'aria-pressed'],
    probe: { html: '<void-toggle>Bold</void-toggle>', click: { role: 'button', name: 'Bold' }, expect: { host: { pressed: '', 'aria-pressed': 'true' } }, event: 'void-change' },
  },
  'void-toggle-group': { role: 'group', name: 'none', state: ['value (reflected, comma list when multiple)'] },
  'void-tooltip': { role: 'inner', name: 'the tooltip text (role="tooltip"), linked to the trigger by aria-describedby', state: [] },
};
