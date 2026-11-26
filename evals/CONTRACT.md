# Selector and state contract

<!-- Generated from evals/contract/contract.mjs by `mise run evals -- contract`. Edit that file, not this one. -->

How to find every Voidable element and read its state the way a user, an agent driving a browser, or a test does: by role, accessible name, attributes and `void-*` events, without calling component JavaScript. `evals/test/contract.test.mjs` checks this table against the Custom Elements Manifest (every element listed; every handle marked "reflected" is a reflected attribute) and in Chromium (every host role; one interaction per interactive element changes the listed attributes and fires its event). The agent evals write their checks against these handles.

**Role** is the ARIA role on the element itself; "inner" means only a rendered descendant has one. **Gaps** are places where a test cannot find the element or observe its state reliably today. They are findings for the library, not workarounds.

| Element | Role | Name from | State handles | Gaps |
|---|---|---|---|---|
| `void-accordion` | — | none | — | no group role or name; the items are only found by their trigger buttons |
| `void-accordion-item` | — | its void-accordion-trigger part (role="button") names the void-accordion-content part (role="region", aria-labelledby) | open (reflected)<br>aria-expanded on the void-accordion-trigger part<br>closed content is out of the accessibility tree (hidden="until-found" where supported) and opens and closes with a height animation, none under reduced motion | — |
| `void-action-input` | inner | void-field label or aria-label / aria-labelledby on the host (moved onto it), on the inner input (aria-label falls back to the placeholder); the action button uses action-label | value (reflected; not for type="password") | host has no role; void-action is its only signal for the action |
| `void-alert` | alert | text content (its void-alert-title and void-alert-description parts) | color (reflected)<br>a void-alert-close part makes it dismissible | always role="alert", so a static, non-urgent notice is announced as urgent; no status variant |
| `void-avatar` | img | alt attribute | — | without alt the host is role="img" with an empty aria-label: an unnamed image (axe image-alt / role-img-alt) |
| `void-badge` | status | text content | color (reflected) | every badge is role="status", a live region: a table of status badges is a page of live regions, and a decorative badge cannot opt out |
| `void-banner` | banner | text content (its void-banner-title and void-banner-description parts) | color (reflected)<br>a void-banner-close part makes it dismissible | role="banner" is the page header landmark; a second banner, or one inside <main>, is invalid |
| `void-bar-chart` | img | aria-label attribute | — | data is a property only (its shape is in the manifest and `voidable ref`); the drawn values are not exposed as text |
| `void-breadcrumbs` | navigation | fixed "Breadcrumb" | void-breadcrumbs-list is role="list" and each void-breadcrumbs-item in it role="listitem"<br>aria-current="page" on the void-breadcrumbs-item part the author marks | the landmark name is fixed English; there is no attribute to change it |
| `void-button` | button | text content or aria-label; a link button (an <a href> or <button> inside) is presentational: no role, no tabindex, the inner link or button is the control and is named by its own text | disabled (reflected)<br>aria-disabled="true" while disabled (own or a disabled fieldset), absent otherwise; on a link button it goes on the inner <a> (with tabindex="-1"), a native <button> inside gets disabled | not form-associated: it submits and resets its closest form like a native button but is not in form.elements |
| `void-calendar` | group | fixed "Calendar"; the grid is named "<Month> <Year>" | value (reflected, YYYY-MM-DD)<br>aria-selected on the day cell | day buttons are named with a long date ("Tuesday, November 3, 2026") that depends on locale |
| `void-card` | — | none | — | the void-card-title part is not a heading, so a card cannot be found by its title with getByRole("heading"); add a heading element inside it |
| `void-carousel` | region | none (aria-roledescription="carousel") | index (reflected) | no accessible name |
| `void-carousel-next` | button | aria-label the author writes on it | aria-disabled at the last slide unless loop | — |
| `void-carousel-previous` | button | aria-label the author writes on it | aria-disabled at the first slide unless loop | — |
| `void-checkbox` | checkbox | text content | checked (reflected)<br>aria-checked ("mixed" when indeterminate) | — |
| `void-checkbox-group` | group | label attribute (aria-label) | value (reflected, a JSON array of the checked values)<br>disabled (reflected) | — |
| `void-collapsible` | inner | its void-collapsible-trigger part, which is the button | open (reflected)<br>aria-expanded on the trigger part<br>closed content is out of the accessibility tree (hidden="until-found" where supported) and opens and closes with a height animation, none under reduced motion | — |
| `void-color-picker` | — | aria-label / aria-labelledby on the host, moved onto the inner hex input | value (reflected)<br>open (reflected) | no role on the host |
| `void-combobox` | inner | void-field label or aria-label / aria-labelledby on the host (moved onto it), on the inner role="combobox" input (aria-label falls back to the placeholder) | open (reflected)<br>aria-expanded and aria-activedescendant on the inner combobox<br>role="listbox" on the void-combobox-content part<br>role="option" on the void-option children, aria-selected="true" on the chosen one, active on the highlighted one, hidden on the ones the text filters out<br>value (reflected) | — |
| `void-compose-input` | — | void-field label or aria-label / aria-labelledby on the host (moved onto it), on the inner textarea | value (reflected) | no role on the host; the send button has no stable name |
| `void-date-picker` | inner | void-field label or aria-label / aria-labelledby on the host (moved onto it), on the inner role="combobox" input (aria-label falls back to the placeholder) | value (reflected, YYYY-MM-DD)<br>open (reflected)<br>aria-expanded on the inner combobox<br>role="dialog" calendar popup | the inner input is readonly: typing a date is impossible, so tests and users must page the calendar (a click on the field opens it with focus kept in the field; ArrowDown or the calendar button moves into it) |
| `void-dialog` | inner | its void-dialog-title part (the native dialog in its shadow root is labelled by it), else aria-label on the host | open (reflected)<br>the native <dialog> in its shadow root is open and modal (:modal) while open | the role="dialog" element is the native <dialog> in the shadow root, and the parts are slotted into it, not its DOM descendants: getByRole("dialog").getByRole(...) finds nothing inside; scope by the host instead (locator("void-dialog[open]").getByRole(...)) |
| `void-divider` | separator | label attribute | aria-orientation | — |
| `void-donut-chart` | img | aria-label attribute | — | data is a property only (its shape is in the manifest and `voidable ref`); the drawn values are not exposed as text |
| `void-drawer` | inner | its void-drawer-title part (the native dialog in its shadow root is labelled by it), else aria-label on the host | open (reflected)<br>the native <dialog> in its shadow root is open and modal (:modal) while open | as void-dialog: getByRole("dialog") cannot be used as a scope for the parts; scope by the host (locator("void-drawer[open]")) |
| `void-dropdown-menu` | inner | the control in its void-dropdown-menu-trigger part | open (reflected)<br>aria-haspopup="menu", aria-expanded and aria-controls on the trigger control<br>role="menu" on the void-dropdown-menu-content part<br>role="menuitem" items | — |
| `void-dropdown-menu-item` | menuitem | text content | value (reflected)<br>disabled (reflected)<br>aria-disabled<br>destructive (reflected) | — |
| `void-editable` | — | aria-label / aria-labelledby on the host, moved onto the role="button" preview and the inner input | value (reflected)<br>editing (reflected) | no role on the host |
| `void-error-fallback` | alert | text content (its void-error-fallback-title part, or the heading attribute while no part is written) | — | void-retry comes only from the built-in retry button; write your own listener for buttons in void-error-fallback-actions |
| `void-field` | — | its label names the control inside (aria-labelledby, and for= on native controls) | error (reflected) -> aria-invalid and aria-describedby on the control | — |
| `void-file-upload` | inner | the drop zone is a role="button" named "Drop files here or browse", or by aria-label / aria-labelledby on the host (moved onto it); void-field label is not applied | the chosen file names as text<br>no value attribute: the files are File objects with no string form (excluded from value reflection, see evals/contract/value.mjs) | files over max-size or not matching accept are dropped silently: no event, no error attribute, nothing to assert<br>no attribute reflects whether a file is chosen |
| `void-gauge` | img | aria-label attribute | value (reflected) | — |
| `void-hamburger` | button | fixed "Menu" / "Close menu" | open (reflected)<br>aria-expanded | the name is fixed and cannot say what it opens; aria-controls is not set |
| `void-hover-card` | inner | the control in its void-hover-card-trigger part | open (reflected) | the card is a visual preview: the trigger gets no aria-expanded, and the void-hover-card-content part has no role |
| `void-indicator` | status | fixed "notification" | count (reflected) | the name does not include the count |
| `void-input` | inner | void-field label or aria-label / aria-labelledby on the host (moved onto it), on the inner input | value (reflected; not for type="password")<br>error (reflected) -> aria-invalid on the inner input<br>disabled (reflected) | — |
| `void-line-chart` | img | aria-label attribute | — | data is a property only (its shape is in the manifest and `voidable ref`); the drawn values are not exposed as text |
| `void-list` | list | none | — | — |
| `void-list-item` | listitem | text content | selected (reflected)<br>disabled (reflected) | interactive items stay role="listitem": "selected" has no ARIA equivalent |
| `void-menu` | — | aria-label on the host, copied to the void-menu-content part (default "Menu") | open (reflected)<br>role="menu" on the void-menu-content part<br>empty attribute on the host while a search matches nothing | — |
| `void-menu-group` | group | its void-menu-group-label part (aria-labelledby) | — | — |
| `void-menu-item` | menuitem | text content | value (reflected)<br>disabled (reflected)<br>aria-disabled | — |
| `void-multiselect` | inner | void-field label or aria-label / aria-labelledby on the host (moved onto it), on the inner combobox | value (reflected, a JSON array of the chosen values)<br>open (reflected)<br>aria-expanded and aria-activedescendant on the inner combobox<br>role="listbox" + aria-multiselectable on the void-multiselect-content part<br>role="option" on the void-option children, aria-selected="true" on the chosen ones, active on the highlighted one | — |
| `void-nav-bar` | navigation | none | — | role="navigation" on a top bar that usually holds search and account controls; a <nav> inside it makes a nested, unnamed landmark |
| `void-nav-menu` | menubar | none | — | — |
| `void-nav-menu-item` | none | the control in its void-nav-menu-trigger part (a button or a link) | open (reflected)<br>current (reflected)<br>aria-expanded, aria-haspopup and aria-controls on a button trigger<br>aria-current="page" on a link trigger when current | — |
| `void-number-input` | inner | void-field label or aria-label / aria-labelledby on the host (moved onto it), else the label attribute, on the inner role="spinbutton" input | value (reflected; absent when the field is empty)<br>aria-valuenow on the inner spinbutton (absent when empty) | — |
| `void-option` | — | text content | role="option", written by the picker whose content part holds it<br>selected (reflected)<br>aria-selected="true" when chosen<br>active (highlighted)<br>disabled (reflected)<br>aria-disabled | selected is the initial choice: the current choice is aria-selected, not the attribute |
| `void-pagination` | inner | the rendered nav is named "Pagination"; buttons by page number, "Previous page", "Next page" | value (reflected)<br>aria-current="page" on the current page button or link | — |
| `void-panel` | region | its void-panel-title part (aria-labelledby), or aria-label | — | without a title part or an aria-label it is an unnamed role="region" |
| `void-pin-input` | group | fixed "PIN input" | value (reflected; not while mask is set) | — |
| `void-popover` | — | the control in its void-popover-trigger part (aria-labelledby on the role="dialog" void-popover-content part) | open (reflected)<br>aria-haspopup="dialog", aria-expanded and aria-controls on the trigger control | — |
| `void-progress` | progressbar | none | aria-valuenow<br>aria-valuemin<br>aria-valuemax<br>value (reflected) | no accessible name |
| `void-radio` | radio | text content | checked (reflected)<br>aria-checked | — |
| `void-radio-group` | radiogroup | label attribute (aria-label) | value (reflected) | — |
| `void-scroll-area` | — | none | — | a scrollable region with no role, name or tabindex: keyboard users cannot scroll it (axe scrollable-region-focusable when it overflows) |
| `void-segmented-control` | radiogroup | aria-label from the author | value (reflected) | — |
| `void-segmented-control-item` | radio | text content | aria-checked | — |
| `void-select` | inner | void-field label or aria-label / aria-labelledby on the host (moved onto it), on the native select written inside it | value (reflected)<br>native select value and :checked option | — |
| `void-sidebar` | navigation | fixed "Sidebar navigation" unless aria-label is set | collapsed (reflected) | no responsive behaviour and no aria-expanded/aria-controls link to a toggle: collapsing is a width change only |
| `void-skeleton` | presentation | none (aria-hidden) | — | the loading region gets no aria-busy; nothing announces loading |
| `void-slider` | inner | void-field label or aria-label / aria-labelledby on the host (moved onto it), on the inner range input | aria-valuenow on the inner range input<br>value (reflected) | — |
| `void-spinner` | status | label attribute (default "Loading") | — | — |
| `void-stat` | figure | none | trend (reflected) | role="figure" without a name; the label is plain text, not linked to the value |
| `void-status-dot` | status | status attribute ("Online", "Away", "Offline") | status (reflected) | — |
| `void-stepper` | navigation | fixed "Progress" | value (reflected)<br>aria-current="step" and data-state="completed\|active\|upcoming" on each step | — |
| `void-switch` | switch | text content | checked (reflected)<br>aria-checked | — |
| `void-table` | — | none; the native <table> inside carries the table, row and cell roles | striped, hoverable, compact, bordered (reflected, presentational) | no caption or name support; a wide table overflows unless the author wraps it (void-scroll-area) |
| `void-tabs` | inner | each void-tabs-trigger part is a role="tab" named by its text; each void-tabs-content part is a tabpanel labelled by its tab | value (reflected)<br>aria-selected and active on the void-tabs-trigger parts<br>active on the visible void-tabs-content part | the tablist has no accessible name unless the author gives the void-tabs-list part an aria-label |
| `void-tag` | — | text content | removable (reflected)<br>role="listitem" inside a void-list or a role="list" parent | — |
| `void-tags-input` | inner | void-field label or aria-label / aria-labelledby on the host (moved onto it), on the inner entry input | value (reflected, a JSON array of the tags) | — |
| `void-textarea` | inner | void-field label or aria-label / aria-labelledby on the host (moved onto it), on the inner textarea | value (reflected)<br>error (reflected) | — |
| `void-toast` | group | text content (its void-toast-title and void-toast-description parts); it is not a live region: the container announces it, assertively for error and warning | color (reflected)<br>a void-toast-close part makes it dismissible | no attribute says whether it is still showing; it is removed from the DOM after duration |
| `void-toast-container` | region | fixed "Notifications"; holds two hidden announcers (role="status" and role="alert") that speak each toast | — | — |
| `void-toggle` | button | text content | pressed (reflected)<br>aria-pressed<br>value (reflected, what the toggle stands for) | — |
| `void-toggle-group` | group | aria-label from the author | value (reflected, comma list when multiple; without one, taken from toggles written with pressed) | — |
| `void-tooltip` | inner | its void-tooltip-content part (role="tooltip"), linked to the trigger control by aria-describedby | open (reflected) | — |

## Value reflection

Every control with a `value` reflects it to the `value` attribute whenever it changes, whether the user changed it or a script set the property, and setting the attribute sets the property, so `[value="..."]` selectors, server-side assertions and an agent reading the DOM see the current value. A scalar is its string form; a list value (multiselect, checkbox group, tags input) is a JSON array (`value='["a","b"]'`); a boolean-like state keeps its boolean attribute (`checked`, `open`, `pressed`). `void-change` does not fire for an attribute or property set. A control that wraps a native input keeps that input and the form value in step, and the form reset target stays the value the control started with. The rule is in `evals/contract/value.mjs`; the test fails for a control that has a `value` and neither follows it nor is excluded below.

- Changed by a user step and by a property set, in Chromium (17): `void-action-input`, `void-checkbox-group`, `void-combobox`, `void-compose-input`, `void-input`, `void-multiselect`, `void-number-input`, `void-pagination`, `void-pin-input`, `void-radio-group`, `void-segmented-control`, `void-select`, `void-slider`, `void-tabs`, `void-tags-input`, `void-textarea`, `void-toggle-group`.
- Only a property and an attribute set, in Chromium (16): `void-calendar`, `void-checkbox`, `void-color-picker`, `void-date-picker`, `void-dropdown-menu-item`, `void-editable`, `void-gauge`, `void-menu-item`, `void-option`, `void-progress`, `void-radio`, `void-segmented-control-item`, `void-stat`, `void-stepper`, `void-switch`, `void-toggle`; their value is configuration or is set by script, not changed by the user.
- Withheld while it is a secret (3): `void-action-input`, `void-input`, `void-pin-input`. A `type="password"` field and a `mask`ed PIN input keep their text out of the attribute (readable by every script, devtools panel, DOM snapshot and session recorder); there the attribute stays the initial value.
- Excluded, `void-file-upload`: the value is a list of File objects the browser only lets a user choose: it has no string form, a file name is private to the page and would leak into the markup, and scripts cannot assign it. The void-change detail carries the files.

## Gaps (38)

- `void-accordion`: no group role or name; the items are only found by their trigger buttons
- `void-action-input`: host has no role; void-action is its only signal for the action
- `void-alert`: always role="alert", so a static, non-urgent notice is announced as urgent; no status variant
- `void-avatar`: without alt the host is role="img" with an empty aria-label: an unnamed image (axe image-alt / role-img-alt)
- `void-badge`: every badge is role="status", a live region: a table of status badges is a page of live regions, and a decorative badge cannot opt out
- `void-banner`: role="banner" is the page header landmark; a second banner, or one inside <main>, is invalid
- `void-bar-chart`: data is a property only (its shape is in the manifest and `voidable ref`); the drawn values are not exposed as text
- `void-breadcrumbs`: the landmark name is fixed English; there is no attribute to change it
- `void-button`: not form-associated: it submits and resets its closest form like a native button but is not in form.elements
- `void-calendar`: day buttons are named with a long date ("Tuesday, November 3, 2026") that depends on locale
- `void-card`: the void-card-title part is not a heading, so a card cannot be found by its title with getByRole("heading"); add a heading element inside it
- `void-carousel`: no accessible name
- `void-color-picker`: no role on the host
- `void-compose-input`: no role on the host; the send button has no stable name
- `void-date-picker`: the inner input is readonly: typing a date is impossible, so tests and users must page the calendar (a click on the field opens it with focus kept in the field; ArrowDown or the calendar button moves into it)
- `void-dialog`: the role="dialog" element is the native <dialog> in the shadow root, and the parts are slotted into it, not its DOM descendants: getByRole("dialog").getByRole(...) finds nothing inside; scope by the host instead (locator("void-dialog[open]").getByRole(...))
- `void-donut-chart`: data is a property only (its shape is in the manifest and `voidable ref`); the drawn values are not exposed as text
- `void-drawer`: as void-dialog: getByRole("dialog") cannot be used as a scope for the parts; scope by the host (locator("void-drawer[open]"))
- `void-editable`: no role on the host
- `void-error-fallback`: void-retry comes only from the built-in retry button; write your own listener for buttons in void-error-fallback-actions
- `void-file-upload`: files over max-size or not matching accept are dropped silently: no event, no error attribute, nothing to assert
- `void-file-upload`: no attribute reflects whether a file is chosen
- `void-hamburger`: the name is fixed and cannot say what it opens; aria-controls is not set
- `void-hover-card`: the card is a visual preview: the trigger gets no aria-expanded, and the void-hover-card-content part has no role
- `void-indicator`: the name does not include the count
- `void-line-chart`: data is a property only (its shape is in the manifest and `voidable ref`); the drawn values are not exposed as text
- `void-list-item`: interactive items stay role="listitem": "selected" has no ARIA equivalent
- `void-nav-bar`: role="navigation" on a top bar that usually holds search and account controls; a <nav> inside it makes a nested, unnamed landmark
- `void-option`: selected is the initial choice: the current choice is aria-selected, not the attribute
- `void-panel`: without a title part or an aria-label it is an unnamed role="region"
- `void-progress`: no accessible name
- `void-scroll-area`: a scrollable region with no role, name or tabindex: keyboard users cannot scroll it (axe scrollable-region-focusable when it overflows)
- `void-sidebar`: no responsive behaviour and no aria-expanded/aria-controls link to a toggle: collapsing is a width change only
- `void-skeleton`: the loading region gets no aria-busy; nothing announces loading
- `void-stat`: role="figure" without a name; the label is plain text, not linked to the value
- `void-table`: no caption or name support; a wide table overflows unless the author wraps it (void-scroll-area)
- `void-tabs`: the tablist has no accessible name unless the author gives the void-tabs-list part an aria-label
- `void-toast`: no attribute says whether it is still showing; it is removed from the DOM after duration
