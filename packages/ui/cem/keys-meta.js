// What each key action (src/keymaps/) does, and the keys that are not actions. The defaults come from the maps
// in src/keymaps/, which the components read too; this file adds only the words.
//
// `cem/keys.js` checks it against the maps (an action with no description, a description for an action that does
// not exist, an `essential` action that is not in the map, an element that is not in the manifest all fail the
// build) and writes the result into the manifest as `voidKeys`, which the docs keyboard tables, `voidable ref`,
// `reference.md` and `voidable check` read.
//
//   intro      The pattern the element follows and anything a reader needs before the table.
//   actions    action name -> what it does (markdown).
//   essential  Actions whose removal can leave the control unusable from the keyboard. `voidable check` warns when
//              an element's `keys` leaves one with no key.
//   browser    [keys, what it does] rows for keys the browser owns (a native control the element wraps) or that
//              follow from focus, not from this library. They cannot be remapped.
//   from       Show another element's actions on this one (the keys sit on the item, the page documents the group).
//   note       Where the keys are set when it is not on the element itself.

/** @type {Record<string, { intro?: string, actions?: Record<string, string>, essential?: string[], browser?: [string, string][], from?: string, note?: string }>} */
export const keysMeta = {
  'void-button': {
    actions: { activate: 'Presses the button: a real `click`, on key down for Enter and on release for Space, as a native button does.' },
    essential: ['activate'],
    browser: [['Tab, Shift + Tab', 'Move focus to and from the button.']],
  },
  'void-switch': {
    actions: { activate: 'Turns the switch on or off.' },
    essential: ['activate'],
  },
  'void-checkbox': {
    actions: { activate: 'Checks or unchecks the box.' },
    essential: ['activate'],
  },
  'void-toggle': {
    actions: { activate: 'Presses the toggle.' },
    essential: ['activate'],
  },
  'void-hamburger': {
    actions: { activate: 'Opens or closes the navigation it controls.' },
    essential: ['activate'],
  },
  'void-carousel-previous': {
    actions: { activate: 'Goes to the previous slide.' },
    essential: ['activate'],
  },
  'void-carousel-next': {
    actions: { activate: 'Goes to the next slide.' },
    essential: ['activate'],
  },
  'void-collapsible': {
    intro: 'The trigger is a button (`role="button"`, a tab stop).',
    actions: { activate: 'Opens or closes the section (with the focus on the trigger).' },
    essential: ['activate'],
  },
  'void-accordion-item': {
    intro: 'The trigger is a button (`role="button"`, a tab stop). Set `keys` on each `<void-accordion-item>`, or for all of them with `configureKeys("void-accordion-item", …)`.',
    actions: { activate: 'Opens or closes the item (with the focus on its trigger).' },
    essential: ['activate'],
  },
  'void-file-upload': {
    actions: { activate: 'Opens the file chooser (with the focus on the drop zone).' },
    essential: ['activate'],
  },
  'void-tabs': {
    intro: 'Pattern: [tabs with manual activation](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/examples/tabs-manual/) (default) or [automatic activation](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/examples/tabs-automatic/) with `activation="auto"`. The tab list is one tab stop (roving tabindex): the selected tab, or the first enabled tab while none is selected. Each tab controls its panel and each panel is labelled by its tab; the visible panel is itself a tab stop. Mark a `<void-tabs-trigger disabled>` to disable its tab.',
    actions: {
      next: 'Moves focus to the next tab (wraps, skips disabled tabs). With `activation="auto"` the tab is selected too. In right-to-left pages the default is Left Arrow.',
      previous: 'Moves focus to the previous tab (wraps). With `activation="auto"` the tab is selected too.',
      first: 'Moves focus to the first tab (selects it with `activation="auto"`).',
      last: 'Moves focus to the last tab (selects it with `activation="auto"`).',
      activate: 'Selects the focused tab (manual activation).',
    },
    essential: ['activate'],
    browser: [['Tab', 'Enters the tab list on its tab stop, then moves to the visible panel.']],
  },
  'void-table': {
    intro: 'Pattern: the [sortable table](https://www.w3.org/WAI/ARIA/apg/patterns/table/examples/sortable-table/) and a table with a checkbox in each row, not a `grid`: there is no cell navigation, every control is in the tab order. A sortable header is a real `<button>` inside the `<th>`, which carries `aria-sort`. Selection is the row checkboxes and a select-all checkbox in the header.',
    actions: {
      selectAll: 'Selects every row shown (after filtering), skipping disabled ones. It has no default key, because the page may use Control + A for something else and because select-all-text is how people copy a table: bind it with `keys=\'{"selectAll":["Control+a","Meta+a"]}\'`. It acts only from inside the body, only when `selectable` allows many rows, and never from a text field.',
    },
    browser: [
      ['Tab, Shift + Tab', 'Move between the sort buttons, the filter field, the select-all and row checkboxes, and the controls in the rows.'],
      ['Enter, Space (on a sort button)', 'Sorts by the column: ascending, then descending, then not sorted. Focus stays on the button; the new state is announced ("Sorted by Name, ascending").'],
      ['Space (on a row or select-all checkbox)', 'Toggles it. Select-all acts on the rows shown (after filtering) and skips disabled ones; its state is checked, mixed or unchecked.'],
      ['Shift + click, Shift + Space (on a row checkbox)', 'Selects (or clears) every row shown between the last row toggled and this one, as one change.'],
    ],
  },
  'void-radio': {
    intro: 'Pattern: [radio group](https://www.w3.org/WAI/ARIA/apg/patterns/radio/). One tab stop: the checked radio, or the first enabled one while none is checked. Selection follows focus, so each arrow key fires `void-change`. `<void-radio>` elements outside a group that share a `name` in the same form (or document) work the same way.',
    actions: {
      next: 'Checks the next enabled radio of the group (wraps) and moves focus to it. In right-to-left pages the default inline key is Left Arrow (Down Arrow does not swap).',
      previous: 'Checks the previous enabled radio of the group (wraps) and moves focus to it.',
      activate: 'Checks the focused radio if it is not checked.',
    },
    browser: [
      ['Tab', 'Moves into the group on the checked radio, or the first enabled one while none is checked, and out of it on the next press.'],
      ['Shift + Tab', 'Moves into the group on the checked radio, or the last enabled one while none is checked (as native radios do).'],
    ],
    note: 'Set `keys` on each `<void-radio>`, or for the whole page with `configureKeys("void-radio", …)`.',
  },
  'void-radio-group': { from: 'void-radio' },
  'void-segmented-control': {
    intro: 'Pattern: [radio group](https://www.w3.org/WAI/ARIA/apg/patterns/radio/). `role="radiogroup"` with `role="radio"` items and `aria-checked` from the first paint. One tab stop: the checked item, or the first enabled item while none is checked. Selection follows focus, so each arrow key fires `void-change`.',
    actions: {
      next: 'Selects the next item (wraps). With nothing selected, the first. In right-to-left pages the default inline key is Left Arrow (Down Arrow does not swap).',
      previous: 'Selects the previous item (wraps). With nothing selected, the last.',
    },
    browser: [['Tab, Shift + Tab', 'Move into and out of the group.']],
  },
  'void-segmented-control-item': {
    actions: { activate: 'Selects the focused item.' },
    essential: ['activate'],
  },
  'void-toggle-group': {
    intro: 'Arrow keys move focus between the toggles; they do not press them. A vertical group (`orientation="vertical"`) starts with Down Arrow and Up Arrow instead.',
    actions: {
      next: 'Moves focus to the next toggle, wrapping at the ends. In right-to-left pages the horizontal default is Left Arrow.',
      previous: 'Moves focus to the previous toggle, wrapping at the ends.',
    },
  },
  'void-menu': {
    intro: 'Pattern: [menu](https://www.w3.org/WAI/ARIA/apg/patterns/menu/). The `<void-menu-content>` of `<void-menu>` is the `menu` and its items are `menuitem`s (groups are `group`s). The items are one tab stop, and the tab stop follows focus. Keys are handled on the menu, so arrow keys keep working in every other control on the page.',
    actions: {
      next: 'Moves focus to the next item (wraps). From a search field, goes to the first item.',
      previous: 'Moves focus to the previous item (wraps). From a search field, goes to the last item; from the first item with a `<void-menu-search>`, returns to the search field.',
      first: 'Moves focus to the first item.',
      last: 'Moves focus to the last item.',
      typeahead: 'Jumps to the next item that starts with the typed text (not in a `<void-menu-search>`, where typing filters).',
      close: 'Closes the menu.',
    },
  },
  'void-menu-item': {
    actions: { activate: 'Activates the item (`void-select`).' },
    essential: ['activate'],
  },
  'void-dropdown-menu': {
    intro: 'Pattern: [menu button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/). The trigger gets `aria-haspopup="menu"`, `aria-expanded` and `aria-controls`; the panel is a `menu` labelled by the trigger, shown in the top layer. A press outside it also closes it. Items take focus from the keyboard handling, not from Tab.',
    actions: {
      open: 'On the trigger: opens the menu and focuses the first item.',
      openLast: 'On the trigger: opens the menu and focuses the last item.',
      activate: 'On the trigger: opens the menu and focuses the first item (a second press closes it). A `<void-button>` or any other non-native trigger is supported.',
      next: 'In the menu: moves to the next item (wraps, skips disabled items).',
      previous: 'In the menu: moves to the previous item (wraps, skips disabled items).',
      first: 'In the menu: moves to the first item.',
      last: 'In the menu: moves to the last item.',
      typeahead: 'In the menu: jumps to the next item that starts with the typed text.',
      leave: 'In the menu: closes it and moves focus on to the next element; focus does not return to the trigger.',
      close: 'Closes the menu and returns focus to the trigger.',
    },
  },
  'void-dropdown-menu-item': {
    actions: { activate: 'Activates the item (`void-select`), closes the menu and returns focus to the trigger. An item with `keep-open` fires `void-select` and leaves the menu open.' },
    essential: ['activate'],
  },
  'void-nav-menu': {
    intro: 'Pattern: [menubar](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/). Each entry is a button or a link; hovering opens its panel too. A vertical menu (`orientation="vertical"`) starts with Down Arrow and Up Arrow instead.',
    actions: {
      next: 'Moves focus to the next entry, wrapping at the ends. In right-to-left pages the horizontal default is Left Arrow.',
      previous: 'Moves focus to the previous entry, wrapping at the ends.',
      close: 'Closes the open panel and returns focus to its entry.',
    },
    browser: [['Enter, Space', 'On a button entry, opens or closes its panel; on a link, follows it.']],
  },
  'void-carousel': {
    intro: 'With focus inside the carousel. A vertical carousel (`orientation="vertical"`) starts with Down Arrow and Up Arrow instead.',
    actions: {
      next: 'Goes to the next slide. In right-to-left pages the horizontal default is Left Arrow.',
      previous: 'Goes to the previous slide.',
    },
  },
  'void-combobox': {
    intro: 'Pattern: [combobox with listbox popup](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) (editable, list autocomplete, manual selection). The native `<input>` is the `combobox` and keeps DOM focus; the highlighted option is exposed with `aria-activedescendant`. `aria-expanded` and `open` track the list.',
    actions: {
      next: 'Opens the list, or highlights the next option (wraps). Opening starts on the chosen option, else the first.',
      previous: 'Opens the list on the chosen option, else the last, or highlights the previous option (wraps).',
      open: 'Opens the list without highlighting an option.',
      activate: 'Chooses the highlighted option and closes the list. With no option highlighted the list closes and the key is left alone, so a surrounding form submits.',
      close: 'Closes the list; focus stays in the field (a second Escape reaches an enclosing dialog).',
    },
    essential: ['activate'],
    browser: [
      ['Left Arrow, Right Arrow, Home, End', 'Move the text cursor; the highlight leaves the list.'],
      ['Tab', 'Closes the list and moves on without choosing.'],
      ['Characters', 'Filter the options; nothing is highlighted until you arrow to it.'],
    ],
  },
  'void-multiselect': {
    intro: 'Pattern: [select-only combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/) with a [multiselectable listbox](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/) popup. The trigger is the `combobox` (focusable, `aria-haspopup="listbox"`, `aria-expanded`); the list is `aria-multiselectable` and the list stays open while options are toggled. The remove buttons on the selected pills are for the pointer; from the keyboard, toggle the option in the list. While the list is closed, each movement key opens it where it would have gone.',
    actions: {
      next: 'Highlights the next option; stops at the ends. Closed: opens the list on the first selected option, else the first.',
      previous: 'Highlights the previous option; stops at the ends. Closed: opens the list on the first option.',
      first: 'Highlights the first option. Closed: opens the list there.',
      last: 'Highlights the last option. Closed: opens the list there.',
      nextPage: 'Moves the highlight ten options on.',
      previousPage: 'Moves the highlight ten options back.',
      activate: 'Toggles the highlighted option; the list stays open. Closed: opens the list on the first selected option, else the first.',
      typeahead: 'Jumps to the next option that starts with the typed text. Closed: opens the list there.',
      close: 'Closes the list (a second Escape reaches an enclosing dialog).',
    },
    essential: ['activate'],
    browser: [['Tab', 'Closes the list and moves on.']],
  },
  'void-calendar': {
    intro: 'The focused day moves with the arrow keys and the selection follows Enter or Space.',
    actions: {
      previousDay: 'Moves focus to the previous day. In right-to-left pages the default is Right Arrow.',
      nextDay: 'Moves focus to the next day. In right-to-left pages the default is Left Arrow.',
      previousWeek: 'Moves focus to the same weekday in the previous week.',
      nextWeek: 'Moves focus to the same weekday in the next week.',
      startOfWeek: 'Moves focus to the first day of the week (the week starts on `first-day`, else on the locale\'s first day).',
      endOfWeek: 'Moves focus to the last day of the week.',
      previousMonth: 'Moves focus to the same day in the previous month.',
      nextMonth: 'Moves focus to the same day in the next month.',
      previousYear: 'Moves focus to the same day in the previous year.',
      nextYear: 'Moves focus to the same day in the next year.',
      activate: 'Chooses the focused day.',
    },
    essential: ['activate'],
  },
  'void-date-picker': {
    intro: 'The read-only input is the `combobox` and the calendar opens as a non-modal `dialog` in the top layer. Focus moves to the calendar\'s selected (or current) day when it opens. The calendar inside is a `<void-calendar>` with its own keys (see Calendar).',
    actions: {
      activate: 'On the input: opens or closes the calendar; opening focuses the selected day, else today. With typed text, Enter takes the text instead.',
      open: 'On the input: opens the calendar, or moves into it when it is already open.',
      close: 'Closes the calendar and returns focus to the input.',
    },
    browser: [['Tab', 'Moving focus out of the calendar closes it.']],
  },
  'void-number-input': {
    actions: {
      increment: 'Increases the value by `step` (by 1 when `step="any"`).',
      decrement: 'Decreases the value by `step` (by 1 when `step="any"`).',
    },
    browser: [['Digits, minus sign, Backspace, Delete, Left Arrow, Right Arrow', 'Edit the text, in the native field.']],
  },
  'void-pin-input': {
    intro: 'Each digit has its own cell; focus moves between cells as you type.',
    actions: {
      previous: 'Moves to the previous cell. In right-to-left pages the default is Right Arrow.',
      next: 'Moves to the next cell. In right-to-left pages the default is Left Arrow.',
      deleteBackward: 'Clears the cell; in an empty cell, moves to the previous cell and clears it.',
      deleteForward: 'Clears the cell.',
    },
  },
  'void-tags-input': {
    intro: 'Keys in the text field.',
    actions: {
      add: 'Adds the typed text as a tag.',
      removeLast: 'In an empty field, removes the last tag.',
    },
    browser: [['Characters, Left Arrow, Right Arrow, Backspace', 'Edit the text, in the native field.']],
  },
  'void-compose-input': {
    actions: { send: 'Sends the message (`void-submit`). Shift + Enter, which is not bound, adds a new line.' },
    essential: ['send'],
    browser: [['Characters, Enter with Shift, arrows', 'Edit the text, in the native field.']],
  },
  'void-editable': {
    intro: 'Shows text that becomes a field. The preview is a button; the field is native.',
    actions: {
      activate: 'On the preview: starts editing.',
      submit: 'In the field: commits the text (with `submit-mode` `enter` or `both`).',
      cancel: 'In the field: discards the edit and shows the preview again.',
    },
    essential: ['activate'],
  },
  'void-dialog': {
    intro: 'A modal: a native `<dialog>` opened with `showModal()`. The page behind it is inert, so Tab and assistive technology cannot leave it, and scrolling is locked.',
    actions: { close: 'Closes the dialog (`void-close` with `reason` `escape`) and returns focus to the element that opened it, unless `hide-close` or a listener calls `preventDefault()` on `void-close`. With another overlay open inside it, only that overlay closes.' },
    essential: ['close'],
    browser: [
      ['Tab, Shift + Tab', 'Move between the focusable elements inside the dialog, then on to the browser\'s own interface and back in; the page behind it cannot be reached.'],
      ['Enter, Space (on the close button)', 'Closes the dialog and returns focus to the opener.'],
    ],
  },
  'void-drawer': {
    intro: 'A modal like the dialog: a native `<dialog>` opened with `showModal()`, with the page behind it inert.',
    actions: { close: 'Closes the drawer (`void-close` with `reason` `escape`) and returns focus to the element that opened it, unless `hide-close` or a listener calls `preventDefault()` on `void-close`.' },
    essential: ['close'],
    browser: [
      ['Tab, Shift + Tab', 'Move between the focusable elements inside the drawer, then on to the browser\'s own interface and back in; the page behind it cannot be reached.'],
      ['Enter, Space (on the close button)', 'Closes the drawer and returns focus to the opener.'],
    ],
  },
  'void-popover': {
    intro: 'A non-modal dialog in the top layer. The trigger gets `aria-haspopup="dialog"`, `aria-expanded` and `aria-controls`. Focus is not trapped.',
    actions: { close: 'Closes the popover and returns focus to the trigger.' },
    browser: [
      ['Enter, Space (on the trigger)', 'Toggle the popover (with `trigger="click"`); opening it moves focus to its first focusable element.'],
      ['Tab, Shift + Tab', 'Move through the popover\'s content; moving focus out of the popover closes it.'],
    ],
  },
  'void-hover-card': {
    intro: 'Supplementary: it opens on hover or keyboard focus of the trigger and never takes focus itself.',
    actions: { close: 'Closes the card; focus stays on the trigger and does not reopen it.' },
    browser: [
      ['Tab (onto the trigger)', 'Opens the card at once, without the `open-delay`.'],
      ['Tab (into the card)', 'Reach links and controls inside the open card; the card closes after `close-delay` once focus has left both trigger and card.'],
    ],
  },
  'void-tooltip': {
    intro: 'Pattern: [tooltip](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/). The trigger is described by the bubble with `aria-describedby`; the bubble never takes focus.',
    actions: { close: 'Hides the tooltip without moving focus.' },
    browser: [
      ['Tab (onto the trigger)', 'Shows the tooltip at once, without the `delay` (keyboard focus only, not a click).'],
      ['Tab (off the trigger)', 'Hides the tooltip.'],
    ],
  },
};
