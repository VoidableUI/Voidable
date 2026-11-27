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
  'void-accordion': { role: null, name: 'none', state: [], gaps: ['no group role or name; the items are only found by their trigger buttons'] },
  'void-accordion-item': {
    role: null,
    name: 'its void-accordion-trigger part (role="button") names the void-accordion-content part (role="region", aria-labelledby)',
    state: ['open (reflected)', 'aria-expanded on the void-accordion-trigger part', 'closed content is out of the accessibility tree (hidden="until-found" where supported) and opens and closes with a height animation, none under reduced motion'],
    probe: { html: '<void-accordion-item><void-accordion-trigger>Shipping</void-accordion-trigger><void-accordion-content>Ships in 2 days</void-accordion-content></void-accordion-item>', click: { role: 'button', name: 'Shipping' }, expect: { host: { open: '' }, button: { name: 'Shipping', 'aria-expanded': 'true' } } },
  },
  'void-action-input': { role: 'inner', name: 'void-field label or aria-label / aria-labelledby on the host (moved onto it), on the inner input (aria-label falls back to the placeholder); the action button uses action-label', state: ['value (reflected; not for type="password")'], gaps: ['host has no role; void-action is its only signal for the action'] },
  'void-alert': { role: 'status', name: 'text content (its void-alert-title and void-alert-description parts)', state: ['color (reflected)', 'a void-alert-actions part holds buttons or links, read after the message and before the close control', 'a void-alert-close part makes it dismissible', 'role="alert" for color error and warning, role="status" (the default) for every other color; a role the author writes is kept'], gaps: [] },
  'void-avatar': { role: 'img', name: 'alt attribute', state: [], gaps: ['without alt the host is role="img" with an empty aria-label: an unnamed image (axe image-alt / role-img-alt)'] },
  'void-badge': { role: null, name: 'text content', state: ['color (reflected)'], gaps: ['no role by design: a badge is text, not a live region (a table of status badges would announce each one); write role="status" on the one whose change must be heard'] },
  'void-banner': { role: 'status', name: 'text content (its void-banner-title and void-banner-description parts)', state: ['color (reflected)', 'role is alert for color error and warning, else status (never banner); an author-written role is kept', 'a void-banner-close part makes it dismissible'] },
  'void-bar-chart': { role: 'figure', name: 'aria-label attribute, which is also the caption of its data table', state: ['show-table (reflected)', 'data: a JSON attribute or the property; the property is not reflected (the data can be large)'] },
  'void-breadcrumbs': { role: 'navigation', name: 'fixed "Breadcrumb"', state: ['void-breadcrumbs-list is role="list" and each void-breadcrumbs-item in it role="listitem"', 'aria-current="page" on the void-breadcrumbs-item part the author marks'], gaps: ['the landmark name is fixed English; there is no attribute to change it'] },
  'void-button': {
    role: 'button',
    name: 'text content or aria-label; a link button (an <a href> or <button> inside) is presentational: no role, no tabindex, the inner link or button is the control and is named by its own text',
    state: ['disabled (reflected)', 'aria-disabled="true" while disabled (own or a disabled fieldset), absent otherwise; on a link button it goes on the inner <a> (with tabindex="-1"), a native <button> inside gets disabled'],
    probe: { html: '<void-button disabled>Save</void-button>', expect: { host: { 'aria-disabled': 'true' } } },
    gaps: ['not form-associated: it submits and resets its closest form like a native button but is not in form.elements'],
  },
  'void-calendar': { role: 'group', name: 'fixed "Calendar"; the grid is named "<Month> <Year>"', state: ['value (reflected, YYYY-MM-DD)', 'aria-selected on the day cell'], gaps: ['day buttons are named with a long date ("Tuesday, November 3, 2026") that depends on locale'] },
  'void-card': { role: null, name: 'none', state: [], gaps: ['no role by design, and the void-card-title part is not a heading (its level depends on the page): write your own heading element inside it, <void-card-title><h3>...</h3></void-card-title>'] },
  'void-carousel': { role: 'region', name: 'aria-label / aria-labelledby on the host (aria-roledescription="carousel"); the slides are role="group" with aria-roledescription="slide" named "n of m"; the slides are a polite live region, off while autoplay rotates them', state: ['index (reflected)'], gaps: [] },
  'void-carousel-previous': { role: 'button', name: 'aria-label the author writes on it', state: ['aria-disabled at the first slide unless loop'] },
  'void-carousel-next': { role: 'button', name: 'aria-label the author writes on it', state: ['aria-disabled at the last slide unless loop'] },
  'void-checkbox': {
    role: 'checkbox',
    name: 'text content',
    state: ['checked (reflected)', 'aria-checked ("mixed" when indeterminate)'],
    probe: { html: '<void-checkbox name="tos">Accept</void-checkbox>', click: { role: 'checkbox', name: 'Accept' }, expect: { host: { checked: '', 'aria-checked': 'true' } }, event: 'void-change' },
  },
  'void-checkbox-group': { role: 'group', name: 'label attribute (aria-label)', state: ['value (reflected, a JSON array of the checked values)', 'disabled (reflected)'] },
  'void-collapsible': {
    role: 'inner',
    name: 'its void-collapsible-trigger part, which is the button',
    state: ['open (reflected)', 'aria-expanded on the trigger part', 'closed content is out of the accessibility tree (hidden="until-found" where supported) and opens and closes with a height animation, none under reduced motion'],
    probe: { html: '<void-collapsible><void-collapsible-trigger>Details</void-collapsible-trigger><void-collapsible-content>More</void-collapsible-content></void-collapsible>', click: { role: 'button', name: 'Details' }, expect: { host: { open: '' }, button: { name: 'Details', 'aria-expanded': 'true' } } },
  },
  'void-color-picker': { role: null, name: 'aria-label / aria-labelledby on the host, moved onto the inner hex input', state: ['value (reflected)', 'open (reflected)'], gaps: ['no role on the host'] },
  'void-combobox': {
    role: 'inner',
    name: 'void-field label or aria-label / aria-labelledby on the host (moved onto it), on the inner role="combobox" input (aria-label falls back to the placeholder)',
    state: ['open (reflected)', 'aria-expanded and aria-activedescendant on the inner combobox', 'role="listbox" on the void-combobox-content part', 'role="option" on the void-option children, aria-selected="true" on the chosen one, active on the highlighted one, hidden on the ones the text filters out', 'value (reflected)'],
    probe: { html: '<void-field label="Fruit"><void-combobox name="f"><void-combobox-content><void-option value="a">Apple</void-option><void-option value="b">Banana</void-option></void-combobox-content></void-combobox></void-field>', fill: { label: 'Fruit', text: 'ban' }, clickOption: 'Banana', event: 'void-change' },
  },
  'void-compose-input': { role: null, name: 'void-field label or aria-label / aria-labelledby on the host (moved onto it), on the inner textarea', state: ['value (reflected)'], gaps: ['no role on the host; the send button has no stable name'] },
  'void-date-picker': {
    role: 'inner',
    name: 'void-field label or aria-label / aria-labelledby on the host (moved onto it), on the inner role="combobox" input (aria-label falls back to the placeholder)',
    state: ['value (reflected, YYYY-MM-DD)', 'open (reflected)', 'aria-expanded on the inner combobox', 'role="dialog" calendar popup', 'error (reflected) -> aria-invalid and aria-describedby on the inner input; set by the field when typed text is refused (not a date, before min, after max), cleared by a valid date', 'a date typed in format or as ISO is read on blur and on Enter: void-change once with the ISO value'],
    gaps: ['a click on the field opens the calendar and keeps focus in it, so a second click closes it again'],
  },
  'void-dialog': {
    role: 'inner',
    name: 'its void-dialog-title part (the native dialog in its shadow root is labelled by it), else aria-label on the host',
    state: ['open (reflected)', 'the native <dialog> in its shadow root is open and modal (:modal) while open'],
    gaps: ['the role="dialog" element is the native <dialog> in the shadow root, and the parts are slotted into it, not its DOM descendants: getByRole("dialog").getByRole(...) finds nothing inside; scope by the host instead (locator("void-dialog[open]").getByRole(...))'],
    probe: { html: '<void-dialog><void-dialog-title>Confirm</void-dialog-title><void-dialog-description>Sure?</void-dialog-description></void-dialog>', set: { open: true }, expect: { host: { open: '' } }, visible: { role: 'dialog', name: 'Confirm' } },
  },
  'void-divider': { role: 'separator', name: 'label attribute', state: ['aria-orientation'] },
  'void-donut-chart': { role: 'figure', name: 'aria-label attribute, which is also the caption of its data table', state: ['show-table (reflected)', 'data: a JSON attribute or the property; the property is not reflected (the data can be large)'] },
  'void-drawer': {
    role: 'inner',
    name: 'its void-drawer-title part (the native dialog in its shadow root is labelled by it), else aria-label on the host',
    state: ['open (reflected)', 'the native <dialog> in its shadow root is open and modal (:modal) while open'],
    gaps: ['as void-dialog: getByRole("dialog") cannot be used as a scope for the parts; scope by the host (locator("void-drawer[open]"))'],
  },
  'void-dropdown-menu': {
    role: 'inner',
    name: 'the control in its void-dropdown-menu-trigger part',
    state: ['open (reflected)', 'aria-haspopup="menu", aria-expanded and aria-controls on the trigger control', 'role="menu" on the void-dropdown-menu-content part', 'role="menuitem" items'],
    probe: { html: '<void-dropdown-menu><void-dropdown-menu-trigger><void-button>Actions</void-button></void-dropdown-menu-trigger><void-dropdown-menu-content><void-dropdown-menu-item value="edit">Edit</void-dropdown-menu-item></void-dropdown-menu-content></void-dropdown-menu>', click: { role: 'button', name: 'Actions' }, expect: { host: { open: '' }, button: { name: 'Actions', 'aria-expanded': 'true' } }, visible: { role: 'menuitem', name: 'Edit' } },
  },
  'void-dropdown-menu-item': { role: 'menuitem', name: 'text content', state: ['value (reflected)', 'disabled (reflected)', 'aria-disabled', 'destructive (reflected)'] },
  'void-editable': { role: null, name: 'aria-label / aria-labelledby on the host, moved onto the role="button" preview and the inner input', state: ['value (reflected)', 'editing (reflected)'], gaps: ['no role on the host'] },
  'void-error-fallback': { role: 'alert', name: 'text content (its void-error-fallback-title part, or the heading attribute while no part is written)', state: [], gaps: ['void-retry comes only from the built-in retry button; write your own listener for buttons in void-error-fallback-actions'] },
  'void-field': { role: null, name: 'its label names the control inside (aria-labelledby, and for= on native controls)', state: ['error (reflected) -> aria-invalid and aria-describedby on the control'], gaps: [] },
  'void-file-upload': {
    role: 'inner',
    name: 'the drop zone is a role="button" named "Drop files here or browse", or by aria-label / aria-labelledby on the host (moved onto it); void-field label is not applied',
    state: ['the chosen file names as text', 'no value attribute: the files are File objects with no string form (excluded from value reflection, see evals/contract/value.mjs)', 'error (reflected) -> aria-invalid and aria-describedby on the drop zone, the message is a role="alert" element; set by the zone when it rejects a file, cleared by the next accepted selection', 'void-reject (does not bubble): detail.rejected is a list of { file, reason }, reason one of type, size, count'],
    gaps: ['no attribute reflects whether a file is chosen'],
  },
  'void-gauge': { role: 'figure', name: 'aria-label attribute, which is also the caption of its data table', state: ['value (reflected)', 'show-table (reflected)', 'data and zones: JSON attributes or the properties; the properties are not reflected'] },
  'void-hamburger': {
    role: 'button',
    name: 'aria-label / aria-labelledby the author writes (say what it opens; constant while open, aria-expanded says the rest); without one it is "Menu" / "Close menu", and voidable check reports the missing name',
    state: ['open (reflected)', 'aria-expanded'],
    probe: { html: '<void-hamburger></void-hamburger>', click: { role: 'button', name: 'Menu' }, expect: { host: { open: '', 'aria-expanded': 'true' } }, event: 'void-open' },
    gaps: ['aria-controls is not set; void-open reason is trigger for a click and keyboard for Enter and Space, void-close is always trigger'],
  },
  'void-hover-card': { role: 'inner', name: 'the control in its void-hover-card-trigger part', state: ['open (reflected)'], gaps: ['the card is a visual preview: the trigger gets no aria-expanded, and the void-hover-card-content part has no role'] },
  'void-indicator': { role: 'status', name: 'fixed "notification"', state: ['count (reflected)'], gaps: ['the name does not include the count'] },
  'void-input': {
    role: 'inner',
    name: 'void-field label or aria-label / aria-labelledby on the host (moved onto it), on the inner input',
    state: ['value (reflected; not for type="password")', 'error (reflected) -> aria-invalid on the inner input', 'disabled (reflected)'],
    probe: { html: '<void-field label="Email"><void-input name="email"></void-input></void-field>', fill: { label: 'Email', text: 'a@b.co' }, event: 'void-input' },
  },
  'void-line-chart': { role: 'figure', name: 'aria-label attribute, which is also the caption of its data table', state: ['show-table (reflected)', 'data: a JSON attribute or the property; the property is not reflected (the data can be large)'] },
  'void-list': { role: 'list', name: 'none', state: [] },
  'void-list-item': { role: 'listitem', name: 'text content', state: ['selected (reflected)', 'disabled (reflected)'], gaps: ['interactive items stay role="listitem": "selected" has no ARIA equivalent'] },
  'void-menu': { role: null, name: 'aria-label on the host, copied to the void-menu-content part (default "Menu")', state: ['open (reflected)', 'role="menu" on the void-menu-content part', 'empty attribute on the host while a search matches nothing'] },
  'void-menu-group': { role: 'group', name: 'its void-menu-group-label part (aria-labelledby)', state: [] },
  'void-menu-item': { role: 'menuitem', name: 'text content', state: ['value (reflected)', 'disabled (reflected)', 'aria-disabled'] },
  'void-multiselect': { role: 'inner', name: 'void-field label or aria-label / aria-labelledby on the host (moved onto it), on the inner combobox', state: ['value (reflected, a JSON array of the chosen values)', 'open (reflected)', 'aria-expanded and aria-activedescendant on the inner combobox', 'role="listbox" + aria-multiselectable on the void-multiselect-content part', 'role="option" on the void-option children, aria-selected="true" on the chosen ones, active on the highlighted one'] },
  'void-nav-bar': { role: 'navigation', name: 'optional aria-label; name each when the page has more than one navigation landmark', state: ['sticky (reflected)', 'hide-border (reflected)', 'variant (reflected)'], gaps: ['no role is added inside a <nav> or an element with a role, or around a <nav>, so landmarks never nest; a role the author writes is kept'] },
  'void-nav-menu': { role: 'menubar', name: 'none', state: [] },
  'void-nav-menu-item': { role: 'none', name: 'the control in its void-nav-menu-trigger part (a button or a link)', state: ['open (reflected)', 'current (reflected)', 'aria-expanded, aria-haspopup and aria-controls on a button trigger', 'aria-current="page" on a link trigger when current'] },
  'void-number-input': { role: 'inner', name: 'void-field label or aria-label / aria-labelledby on the host (moved onto it), else the label attribute, on the inner role="spinbutton" input', state: ['value (reflected; absent when the field is empty)', 'aria-valuenow on the inner spinbutton (absent when empty)'] },
  'void-option': { role: null, name: 'text content', state: ['role="option", written by the picker whose content part holds it', 'selected (reflected)', 'aria-selected="true" when chosen', 'active (highlighted)', 'disabled (reflected)', 'aria-disabled'], gaps: ['selected is the initial choice: the current choice is aria-selected, not the attribute'] },
  'void-pagination': {
    role: 'inner',
    name: 'the rendered nav (a group with landmark="none" or inside a nav) is named "Pagination"; buttons by page number, "Previous page", "Next page"',
    state: ['value (reflected)', 'aria-current="page" on the current page button or link'],
    probe: { html: '<void-pagination total="5" value="1"></void-pagination>', click: { role: 'button', name: '2' }, expect: { button: { name: '2', 'aria-current': 'page' } }, event: 'void-change' },
  },
  'void-panel': { role: 'region', name: 'its void-panel-title part (aria-labelledby), or aria-label; voidable check reports a panel with neither', state: [] },
  'void-pin-input': { role: 'group', name: 'fixed "PIN input"', state: ['value (reflected; not while mask is set)'] },
  'void-popover': { role: null, name: 'the control in its void-popover-trigger part (aria-labelledby on the role="dialog" void-popover-content part)', state: ['open (reflected)', 'aria-haspopup="dialog", aria-expanded and aria-controls on the trigger control'] },
  'void-progress': { role: 'progressbar', name: 'aria-label / aria-labelledby on the host, or a void-field label; voidable check reports a bare progress', state: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax', 'value (reflected)'] },
  'void-radio': {
    role: 'radio',
    name: 'text content',
    state: ['checked (reflected)', 'aria-checked'],
    probe: { html: '<void-radio-group label="Size" name="s"><void-radio value="s">Small</void-radio><void-radio value="l">Large</void-radio></void-radio-group>', click: { role: 'radio', name: 'Large' }, expect: { radio: { name: 'Large', 'aria-checked': 'true' } }, event: 'void-change' },
  },
  'void-radio-group': { role: 'radiogroup', name: 'label attribute (aria-label)', state: ['value (reflected)'] },
  'void-scroll-area': { role: null, name: 'none', state: [], gaps: ['a scrollable region with no role, name or tabindex: keyboard users cannot scroll it (axe scrollable-region-focusable when it overflows)'] },
  'void-segmented-control': { role: 'radiogroup', name: 'aria-label from the author', state: ['value (reflected)'] },
  'void-segmented-control-item': {
    role: 'radio',
    name: 'text content',
    state: ['aria-checked'],
    probe: { html: '<void-segmented-control value="m" aria-label="Period"><void-segmented-control-item value="m">Monthly</void-segmented-control-item><void-segmented-control-item value="y">Yearly</void-segmented-control-item></void-segmented-control>', click: { role: 'radio', name: 'Yearly' }, expect: { radio: { name: 'Yearly', 'aria-checked': 'true' } }, event: 'void-change' },
  },
  'void-select': { role: 'inner', name: 'void-field label or aria-label / aria-labelledby on the host (moved onto it), on the native select written inside it', state: ['value (reflected)', 'native select value and :checked option'] },
  'void-sidebar': {
    role: 'navigation',
    name: 'fixed "Sidebar navigation" unless aria-label is set',
    state: ['collapsed (reflected)'],
    gaps: ['no responsive behaviour and no aria-expanded/aria-controls link to a toggle: collapsing is a width change only'],
  },
  'void-skeleton': { role: 'presentation', name: 'none (aria-hidden)', state: [], gaps: ['the loading region gets no aria-busy; nothing announces loading'] },
  'void-slider': { role: 'inner', name: 'void-field label or aria-label / aria-labelledby on the host (moved onto it), on the inner range input', state: ['aria-valuenow on the inner range input', 'value (reflected)'] },
  'void-spinner': { role: 'status', name: 'label attribute (default "Loading")', state: [] },
  'void-stat': { role: null, name: 'with a label it is role="group" named by it (aria-labelledby on the void-stat-label text); with none it has no role and no name; an aria-label the author writes wins', state: ['trend (reflected)'] },
  'void-status-dot': { role: 'status', name: 'status attribute ("Online", "Away", "Offline")', state: ['status (reflected)'] },
  'void-stepper': { role: 'list', name: 'fixed "Progress" unless aria-label is set', state: ['each step is role="listitem"; it is not a navigation landmark', 'value (reflected)', 'aria-current="step" and data-state="completed|active|upcoming" on each step'] },
  'void-switch': {
    role: 'switch',
    name: 'text content',
    state: ['checked (reflected)', 'aria-checked'],
    probe: { html: '<void-switch name="n">Notifications</void-switch>', click: { role: 'switch', name: 'Notifications' }, expect: { host: { checked: '', 'aria-checked': 'true' } }, event: 'void-change' },
  },
  'void-table': { role: null, name: 'a <caption> in the native <table>, or aria-label or label on the void-table (copied onto the table); voidable check reports a table with neither. The native <table> inside carries the table, row and cell roles', state: ['striped (reflected)', 'hoverable (reflected)', 'compact (reflected)', 'bordered (reflected)', 'sort and sort-direction (reflected): aria-sort on the sortable th (data-sort), whose content is a button', 'filter (reflected): rows that do not match get hidden; a polite live region says "N of M rows"', 'selectable (reflected), value (reflected, a JSON array of the selected row values; data-value on the row, else its index): aria-selected on the tr, the select-all checkbox is checked, mixed or unchecked for the rows shown', 'manual (reflected): rows are never reordered or hidden by the table'], gaps: ['a wide table overflows unless the author wraps it (void-scroll-area)'] },
  'void-tabs': {
    role: 'inner',
    name: 'each void-tabs-trigger part is a role="tab" named by its text; each void-tabs-content part is a tabpanel labelled by its tab',
    state: ['value (reflected)', 'aria-selected and active on the void-tabs-trigger parts', 'active on the visible void-tabs-content part'],
    probe: { html: '<void-tabs value="a"><void-tabs-list><void-tabs-trigger value="a">One</void-tabs-trigger><void-tabs-trigger value="b">Two</void-tabs-trigger></void-tabs-list><void-tabs-content value="a">1</void-tabs-content><void-tabs-content value="b">2</void-tabs-content></void-tabs>', click: { role: 'tab', name: 'Two' }, expect: { host: { value: 'b' }, tab: { name: 'Two', 'aria-selected': 'true' } }, event: 'void-change' },
    gaps: ['the tablist has no accessible name unless the author gives the void-tabs-list part an aria-label'],
  },
  'void-tag': { role: null, name: 'text content', state: ['removable (reflected)', 'role="listitem" inside a void-list or a role="list" parent'] },
  'void-tags-input': { role: 'inner', name: 'void-field label or aria-label / aria-labelledby on the host (moved onto it), on the inner entry input', state: ['value (reflected, a JSON array of the tags)'] },
  'void-textarea': { role: 'inner', name: 'void-field label or aria-label / aria-labelledby on the host (moved onto it), on the inner textarea', state: ['value (reflected)', 'error (reflected)'] },
  'void-toast': { role: 'group', name: 'text content (its void-toast-title and void-toast-description parts); it is not a live region: the container announces it, assertively for error and warning', state: ['color (reflected)', 'a void-toast-close part makes it dismissible'], gaps: ['no attribute says whether it is still showing; it is removed from the DOM after duration'] },
  'void-toast-container': { role: 'region', name: 'fixed "Notifications"; holds two hidden announcers (role="status" and role="alert") that speak each toast', state: [] },
  'void-toggle': {
    role: 'button',
    name: 'text content',
    state: ['pressed (reflected)', 'aria-pressed', 'value (reflected, what the toggle stands for)'],
    probe: { html: '<void-toggle>Bold</void-toggle>', click: { role: 'button', name: 'Bold' }, expect: { host: { pressed: '', 'aria-pressed': 'true' } }, event: 'void-change' },
  },
  'void-toggle-group': { role: 'group', name: 'aria-label from the author', state: ['value (reflected, comma list when multiple; without one, taken from toggles written with pressed)'] },
  'void-tooltip': { role: 'inner', name: 'its void-tooltip-content part (role="tooltip"), linked to the trigger control by aria-describedby', state: ['open (reflected)'] },
};
