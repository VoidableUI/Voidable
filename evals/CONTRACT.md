# Selector and state contract

<!-- Generated from evals/contract/contract.mjs by `mise run evals -- contract`. Edit that file, not this one. -->

How to find every Voidable element and read its state the way a user, an agent driving a browser, or a test does: by role, accessible name, attributes and `void-*` events, without calling component JavaScript. `evals/test/contract.test.mjs` checks this table against the Custom Elements Manifest (every element listed; every handle marked "reflected" is a reflected attribute) and in Chromium (every host role; one interaction per interactive element changes the listed attributes and fires its event). The agent evals write their checks against these handles.

**Role** is the ARIA role on the element itself; "inner" means only a rendered descendant has one. **Gaps** are places where a test cannot find the element or observe its state reliably today. They are findings for the library, not workarounds.

| Element | Role | Name from | State handles | Gaps |
|---|---|---|---|---|
| `void-accordion` | — | none | — | no group role or name; the items are only found by their heading buttons |
| `void-accordion-item` | inner | heading attribute, on the rendered button | open (reflected)<br>aria-expanded on the rendered heading button | — |
| `void-action-input` | inner | void-field label (on the inner input); the action button uses action-label | value (property only: the attribute is the initial value and is not updated) | the current value is not reflected to an attribute: [value=...] selectors and attribute assertions see the initial value only<br>host has no role; void-action is its only signal for the action |
| `void-alert` | alert | text content | color (reflected) | always role="alert", so a static, non-urgent notice is announced as urgent; no status variant |
| `void-avatar` | img | alt attribute | — | without alt the host is role="img" with an empty aria-label: an unnamed image (axe image-alt / role-img-alt) |
| `void-badge` | status | text content | color (reflected) | every badge is role="status", a live region: a table of status badges is a page of live regions, and a decorative badge cannot opt out |
| `void-banner` | banner | text content | dismissable (reflected) | role="banner" is the page header landmark; a second banner, or one inside <main>, is invalid |
| `void-bar-chart` | img | aria-label attribute | — | data is a property only (its shape is in the manifest and `voidable ref`); the drawn values are not exposed as text |
| `void-breadcrumbs` | navigation | fixed "Breadcrumb" | — | — |
| `void-button` | button | text content or aria-label | disabled (reflected)<br>aria-disabled | — |
| `void-calendar` | group | fixed "Calendar"; the grid is named "<Month> <Year>" | value (reflected, YYYY-MM-DD)<br>aria-selected on the day cell | day buttons are named with a long date ("Tuesday, November 3, 2026") that depends on locale |
| `void-card` | — | none | — | heading is rendered as text, not a heading element, so a card cannot be found by its title with getByRole("heading") |
| `void-carousel` | region | none (aria-roledescription="carousel") | active (reflected) | no accessible name |
| `void-carousel-slide` | group | none (aria-roledescription="slide") | — | — |
| `void-checkbox` | checkbox | text content | checked (reflected)<br>aria-checked ("mixed" when indeterminate) | — |
| `void-checkbox-group` | group | label attribute (aria-label) | disabled (reflected) | the selected values are a property only (value: string[]); read them from the child checkboxes |
| `void-collapsible` | inner | heading attribute, on the rendered button | open (reflected)<br>aria-expanded on the rendered button | — |
| `void-color-picker` | — | none | value (reflected)<br>open (reflected) | no role or accessible name on the host |
| `void-combobox` | inner | void-field label, on the inner role="combobox" input (aria-label falls back to the placeholder) | open (reflected)<br>aria-expanded on the inner combobox<br>role="option" with data-selected on the rendered options<br>value (property only: the attribute is the initial value and is not updated) | the current value is not reflected to an attribute: [value=...] selectors and attribute assertions see the initial value only<br>aria-selected on the rendered options marks the keyboard-active option, not the chosen one; the choice is only in data-selected<br>the void-option children are not the options a user sees: the list renders its own role="option" copies |
| `void-compose-input` | — | none (inner textarea) | value (property only: the attribute is the initial value and is not updated) | the current value is not reflected to an attribute: [value=...] selectors and attribute assertions see the initial value only<br>no role or name on the host; the send button has no stable name |
| `void-date-picker` | combobox | void-field label, on the inner input | value (reflected, YYYY-MM-DD)<br>open (reflected)<br>aria-expanded | the inner input is readonly: typing a date is impossible, so tests and users must page the calendar<br>the inner input carries aria-expanded without a role (axe aria-allowed-attr) |
| `void-dialog` | dialog | heading attribute (aria-label) | open (reflected)<br>aria-modal="true" | role="dialog" stays on the host while closed (hidden content only)<br>focus is not returned to the opener on close; tests that check focus return need the app to do it |
| `void-divider` | separator | label attribute | aria-orientation | — |
| `void-donut-chart` | img | aria-label attribute | — | data is a property only (its shape is in the manifest and `voidable ref`); the drawn values are not exposed as text |
| `void-drawer` | dialog | heading attribute (aria-label) | open (reflected)<br>aria-modal="true" | opening does not move focus into the drawer, and Escape is only handled while focus is inside it (void-dialog listens on the document)<br>focus is not returned to the opener on close |
| `void-dropdown-menu` | inner | the trigger element | open (reflected)<br>aria-haspopup="menu" and aria-expanded on the trigger<br>role="menu" panel<br>role="menuitem" items | the menu panel has no accessible name |
| `void-dropdown-menu-item` | menuitem | text content | disabled (reflected)<br>aria-disabled<br>destructive (reflected) | void-select carries the item element, not a value; identify items by text |
| `void-editable` | — | none (inner input while editing) | value (reflected)<br>editing (reflected) | no role or accessible name on the host in display mode |
| `void-error-fallback` | alert | heading attribute | — | — |
| `void-field` | — | its label names the control inside (aria-labelledby, and for= on native controls) | error (reflected) -> aria-invalid and aria-describedby on the control | — |
| `void-file-upload` | inner | void-field label is not applied to the file input; the drop zone is a button named "Drop files here or browse" | the chosen file names as text | files over max-size or not matching accept are dropped silently: no event, no error attribute, nothing to assert<br>no attribute reflects whether a file is chosen |
| `void-gauge` | img | aria-label attribute | value (property only: the attribute is the initial value and is not updated) | the current value is not reflected to an attribute: [value=...] selectors and attribute assertions see the initial value only |
| `void-hamburger` | button | fixed "Menu" / "Close menu" | active (reflected)<br>aria-expanded | the name is fixed and cannot say what it opens; aria-controls is not set |
| `void-hover-card` | inner | the trigger element | open (reflected)<br>aria-expanded on the trigger | — |
| `void-indicator` | status | fixed "notification" | count (reflected) | the name does not include the count |
| `void-input` | inner | void-field label, on the inner input | value (attribute; the live value is the inner input value)<br>error (reflected) -> aria-invalid on the inner input<br>disabled (reflected) | — |
| `void-line-chart` | img | aria-label attribute | — | data is a property only (its shape is in the manifest and `voidable ref`); the drawn values are not exposed as text |
| `void-list` | list | none | — | — |
| `void-list-item` | listitem | text content | selected (reflected)<br>disabled (reflected) | interactive items stay role="listitem": "selected" has no ARIA equivalent |
| `void-menu` | inner | none | open (reflected)<br>role="menu" rendered inside | the menu has no accessible name |
| `void-menu-group` | group | label attribute | — | — |
| `void-menu-item` | menuitem | text content | disabled (reflected)<br>aria-disabled | — |
| `void-multiselect` | inner | void-field label, on the inner combobox | open (reflected)<br>aria-expanded on the inner combobox<br>role="option" + aria-selected on rendered options | the selected values are a property only (value: string[]), not reflected (#23) |
| `void-nav-bar` | navigation | none | — | role="navigation" on a top bar that usually holds search and account controls; a <nav> inside it makes a nested, unnamed landmark |
| `void-nav-menu` | menubar | none | — | — |
| `void-nav-menu-item` | none | text content, on the rendered menuitem | open (reflected)<br>active (reflected)<br>aria-expanded on the trigger | — |
| `void-number-input` | — | void-field label or aria-label, on the inner spinbutton | value (reflected)<br>aria-valuenow on the inner spinbutton | — |
| `void-option` | — | text content | selected (reflected) | not the element users interact with (see void-combobox) |
| `void-pagination` | inner | the rendered nav is named "Pagination"; buttons by page number, "Previous page", "Next page" | value (attribute)<br>aria-current="page" on the current page button or link | value is not reflected after a click: read aria-current instead |
| `void-panel` | region | label attribute (aria-label) | — | without label it is an unnamed role="region" |
| `void-pin-input` | group | fixed "PIN input" | value (property only: the attribute is the initial value and is not updated) | the current value is not reflected to an attribute: [value=...] selectors and attribute assertions see the initial value only |
| `void-popover` | — | the trigger element | open (reflected) | the trigger gets no aria-expanded or aria-haspopup; the content has no role |
| `void-progress` | progressbar | none | aria-valuenow<br>aria-valuemin<br>aria-valuemax<br>value (reflected) | no accessible name |
| `void-radio` | radio | text content | checked (reflected)<br>aria-checked | — |
| `void-radio-group` | radiogroup | label attribute (aria-label) | value (property only: the attribute is the initial value and is not updated) | the current value is not reflected to an attribute: [value=...] selectors and attribute assertions see the initial value only |
| `void-scroll-area` | — | none | — | a scrollable region with no role, name or tabindex: keyboard users cannot scroll it (axe scrollable-region-focusable when it overflows) |
| `void-segmented-control` | radiogroup | aria-label from the author | value (reflected) | — |
| `void-segmented-control-item` | radio | text content | aria-checked | — |
| `void-select` | inner | void-field label, on the native select | value (property only: the attribute is the initial value and is not updated)<br>native select value | the current value is not reflected to an attribute: [value=...] selectors and attribute assertions see the initial value only |
| `void-sidebar` | navigation | fixed "Sidebar navigation" unless aria-label is set | collapsed (reflected) | no responsive behaviour and no aria-expanded/aria-controls link to a toggle: collapsing is a width change only |
| `void-skeleton` | presentation | none (aria-hidden) | — | the loading region gets no aria-busy; nothing announces loading |
| `void-slider` | — | void-field label or aria-label, on the inner slider | aria-valuenow on the inner slider<br>value (property only: the attribute is the initial value and is not updated) | the current value is not reflected to an attribute: [value=...] selectors and attribute assertions see the initial value only |
| `void-spinner` | status | label attribute (default "Loading") | — | — |
| `void-stat` | figure | none | trend (reflected) | role="figure" without a name; the label is plain text, not linked to the value |
| `void-status-dot` | status | status attribute ("Online", "Away", "Offline") | status (reflected) | — |
| `void-stepper` | navigation | fixed "Progress" | value (reflected)<br>aria-current="step" and data-state="completed\|active\|upcoming" on each step | — |
| `void-switch` | switch | text content | checked (reflected)<br>aria-checked | — |
| `void-tab-panel` | tabpanel | aria-labelledby its tab | active (reflected) | — |
| `void-table` | — | none; the native <table> inside carries the table, row and cell roles | striped, hoverable, compact, bordered (reflected, presentational) | no caption or name support; a wide table overflows unless the author wraps it (void-scroll-area) |
| `void-tabs` | inner | each void-tab-panel label becomes a role="tab" button | value (property only: the attribute is the initial value and is not updated)<br>aria-selected on the tabs<br>active on each void-tab-panel (reflected there) | the current value is not reflected to an attribute: [value=...] selectors and attribute assertions see the initial value only<br>the tablist has no accessible name |
| `void-tag` | listitem | text content | removable (reflected) | role="listitem" outside any list unless the author adds one |
| `void-tags-input` | — | void-field label or aria-label, on the inner text input | — | the tags are a property (value: TagValue[]), not reflected |
| `void-textarea` | — | void-field label, on the inner textarea | value (attribute)<br>error (reflected) | — |
| `void-toast` | status | text content (role="alert" for error and warning) | color (reflected) | no attribute says whether it is still showing; it is removed from the DOM after duration |
| `void-toast-container` | region | fixed "Notifications" (aria-live="polite") | — | — |
| `void-toggle` | button | text content | pressed (reflected)<br>aria-pressed | — |
| `void-toggle-group` | group | none | value (reflected, comma list when multiple) | — |
| `void-tooltip` | inner | the tooltip text (role="tooltip"), linked to the trigger by aria-describedby | — | — |

## Gaps (57)

- `void-accordion`: no group role or name; the items are only found by their heading buttons
- `void-action-input`: the current value is not reflected to an attribute: [value=...] selectors and attribute assertions see the initial value only
- `void-action-input`: host has no role; void-action is its only signal for the action
- `void-alert`: always role="alert", so a static, non-urgent notice is announced as urgent; no status variant
- `void-avatar`: without alt the host is role="img" with an empty aria-label: an unnamed image (axe image-alt / role-img-alt)
- `void-badge`: every badge is role="status", a live region: a table of status badges is a page of live regions, and a decorative badge cannot opt out
- `void-banner`: role="banner" is the page header landmark; a second banner, or one inside <main>, is invalid
- `void-bar-chart`: data is a property only (its shape is in the manifest and `voidable ref`); the drawn values are not exposed as text
- `void-calendar`: day buttons are named with a long date ("Tuesday, November 3, 2026") that depends on locale
- `void-card`: heading is rendered as text, not a heading element, so a card cannot be found by its title with getByRole("heading")
- `void-carousel`: no accessible name
- `void-checkbox-group`: the selected values are a property only (value: string[]); read them from the child checkboxes
- `void-color-picker`: no role or accessible name on the host
- `void-combobox`: the current value is not reflected to an attribute: [value=...] selectors and attribute assertions see the initial value only
- `void-combobox`: aria-selected on the rendered options marks the keyboard-active option, not the chosen one; the choice is only in data-selected
- `void-combobox`: the void-option children are not the options a user sees: the list renders its own role="option" copies
- `void-compose-input`: the current value is not reflected to an attribute: [value=...] selectors and attribute assertions see the initial value only
- `void-compose-input`: no role or name on the host; the send button has no stable name
- `void-date-picker`: the inner input is readonly: typing a date is impossible, so tests and users must page the calendar
- `void-date-picker`: the inner input carries aria-expanded without a role (axe aria-allowed-attr)
- `void-dialog`: role="dialog" stays on the host while closed (hidden content only)
- `void-dialog`: focus is not returned to the opener on close; tests that check focus return need the app to do it
- `void-donut-chart`: data is a property only (its shape is in the manifest and `voidable ref`); the drawn values are not exposed as text
- `void-drawer`: opening does not move focus into the drawer, and Escape is only handled while focus is inside it (void-dialog listens on the document)
- `void-drawer`: focus is not returned to the opener on close
- `void-dropdown-menu`: the menu panel has no accessible name
- `void-dropdown-menu-item`: void-select carries the item element, not a value; identify items by text
- `void-editable`: no role or accessible name on the host in display mode
- `void-file-upload`: files over max-size or not matching accept are dropped silently: no event, no error attribute, nothing to assert
- `void-file-upload`: no attribute reflects whether a file is chosen
- `void-gauge`: the current value is not reflected to an attribute: [value=...] selectors and attribute assertions see the initial value only
- `void-hamburger`: the name is fixed and cannot say what it opens; aria-controls is not set
- `void-indicator`: the name does not include the count
- `void-line-chart`: data is a property only (its shape is in the manifest and `voidable ref`); the drawn values are not exposed as text
- `void-list-item`: interactive items stay role="listitem": "selected" has no ARIA equivalent
- `void-menu`: the menu has no accessible name
- `void-multiselect`: the selected values are a property only (value: string[]), not reflected (#23)
- `void-nav-bar`: role="navigation" on a top bar that usually holds search and account controls; a <nav> inside it makes a nested, unnamed landmark
- `void-option`: not the element users interact with (see void-combobox)
- `void-pagination`: value is not reflected after a click: read aria-current instead
- `void-panel`: without label it is an unnamed role="region"
- `void-pin-input`: the current value is not reflected to an attribute: [value=...] selectors and attribute assertions see the initial value only
- `void-popover`: the trigger gets no aria-expanded or aria-haspopup; the content has no role
- `void-progress`: no accessible name
- `void-radio-group`: the current value is not reflected to an attribute: [value=...] selectors and attribute assertions see the initial value only
- `void-scroll-area`: a scrollable region with no role, name or tabindex: keyboard users cannot scroll it (axe scrollable-region-focusable when it overflows)
- `void-select`: the current value is not reflected to an attribute: [value=...] selectors and attribute assertions see the initial value only
- `void-sidebar`: no responsive behaviour and no aria-expanded/aria-controls link to a toggle: collapsing is a width change only
- `void-skeleton`: the loading region gets no aria-busy; nothing announces loading
- `void-slider`: the current value is not reflected to an attribute: [value=...] selectors and attribute assertions see the initial value only
- `void-stat`: role="figure" without a name; the label is plain text, not linked to the value
- `void-table`: no caption or name support; a wide table overflows unless the author wraps it (void-scroll-area)
- `void-tabs`: the current value is not reflected to an attribute: [value=...] selectors and attribute assertions see the initial value only
- `void-tabs`: the tablist has no accessible name
- `void-tag`: role="listitem" outside any list unless the author adds one
- `void-tags-input`: the tags are a property (value: TagValue[]), not reflected
- `void-toast`: no attribute says whether it is still showing; it is removed from the DOM after duration
