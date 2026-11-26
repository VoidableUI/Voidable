// What each built-in string (src/messages.ts) is for, which components write it and what replaces it.
//
// `cem/messages.js` checks this file against the English catalogue and the component sources (a key with no
// entry, an entry with no key, a component that writes a string the entry does not list all fail the build),
// then writes the result into the manifest as `voidMessages`, which the reference, `voidable ref`, `voidable
// check` and the Translation guide read.
//
// `override` is what an author writes to replace the message for one element, in any language:
//   { attribute: 'placeholder' }                  an attribute of the component
//   { attribute: 'aria-label', on: 'void-x-part' } an attribute of one of its parts
//   { part: 'void-menu-empty' }                   a part the author writes
//   null                                           nothing on the element: change it with registerMessages()

const FORM_CONTROLS = [
  'void-calendar', 'void-color-picker', 'void-combobox', 'void-date-picker', 'void-editable', 'void-file-upload',
  'void-multiselect', 'void-number-input', 'void-pin-input', 'void-segmented-control', 'void-switch',
  'void-tags-input', 'void-toggle-group',
];
const name = { attribute: 'aria-label' };
const placeholder = { attribute: 'placeholder' };

/** @type {Record<string, { tags: string[], purpose: string, override: null | { attribute?: string, on?: string, part?: string } }>} */
export const messageMeta = {
  close: { tags: ['void-dialog', 'void-drawer'], purpose: 'Name of the close button of a dialog or drawer.', override: null },
  dismiss: { tags: ['void-toast'], purpose: 'Name of the close button that `toast()` writes into a toast it builds.', override: null },
  remove: { tags: ['void-tag'], purpose: 'Name of the remove button of a removable tag.', override: null },
  removeItem: { tags: ['void-multiselect', 'void-tags-input', 'void-file-upload'], purpose: 'Name of the button that removes one chosen option, tag or file.', override: null },
  valueMissing: { tags: FORM_CONTROLS, purpose: 'Validation message of a required control with no value.', override: null },
  'checkboxGroup.required': { tags: ['void-checkbox-group'], purpose: 'Validation message of a required checkbox group with nothing checked.', override: null },
  'breadcrumbs.label': { tags: ['void-breadcrumbs'], purpose: 'Name of the breadcrumb landmark.', override: name },
  'calendar.label': { tags: ['void-calendar'], purpose: 'Name of the calendar group.', override: name },
  'calendar.previousMonth': { tags: ['void-calendar', 'void-date-picker'], purpose: 'Name of the previous-month button.', override: null },
  'calendar.nextMonth': { tags: ['void-calendar', 'void-date-picker'], purpose: 'Name of the next-month button.', override: null },
  'calendar.chooseMonth': { tags: ['void-calendar', 'void-date-picker'], purpose: 'Name of the button, showing the month and year, that opens the month picker.', override: null },
  'calendar.chooseYear': { tags: ['void-calendar', 'void-date-picker'], purpose: 'Name of the button, showing the year, that opens the year picker.', override: null },
  'calendar.previousYear': { tags: ['void-calendar', 'void-date-picker'], purpose: 'Name of the previous-year button of the month picker.', override: null },
  'calendar.nextYear': { tags: ['void-calendar', 'void-date-picker'], purpose: 'Name of the next-year button of the month picker.', override: null },
  'calendar.previousYears': { tags: ['void-calendar', 'void-date-picker'], purpose: 'Name of the button for the previous twelve years of the year picker.', override: null },
  'calendar.nextYears': { tags: ['void-calendar', 'void-date-picker'], purpose: 'Name of the button for the next twelve years of the year picker.', override: null },
  'datePicker.placeholder': { tags: ['void-date-picker'], purpose: 'Hint of the empty field, which is also its name when no label names it.', override: placeholder },
  'datePicker.toggle': { tags: ['void-date-picker'], purpose: 'Name of the button that opens and closes the calendar.', override: null },
  'datePicker.dialog': { tags: ['void-date-picker'], purpose: 'Name of the calendar popup.', override: null },
  'datePicker.invalid': { tags: ['void-date-picker'], purpose: 'Error for typed text that is not a date. `format` is the field\'s `format`.', override: null },
  'datePicker.tooEarly': { tags: ['void-date-picker'], purpose: 'Error for a typed date before `min`. `date` is `min` in the field\'s `format`.', override: null },
  'datePicker.tooLate': { tags: ['void-date-picker'], purpose: 'Error for a typed date after `max`. `date` is `max` in the field\'s `format`.', override: null },
  'carousel.slide': { tags: ['void-carousel'], purpose: 'Name of one slide: its place among the others (`index`, `count`).', override: { attribute: 'aria-label', on: 'void-carousel-item' } },
  'carousel.goTo': { tags: ['void-carousel'], purpose: 'Name of one slide indicator dot.', override: null },
  'carousel.indicators': { tags: ['void-carousel'], purpose: 'Name of the group of slide indicator dots.', override: { attribute: 'aria-label', on: 'void-carousel-indicators' } },
  'chart.bar': { tags: ['void-bar-chart'], purpose: 'Name of a bar chart and caption of its data table.', override: name },
  'chart.line': { tags: ['void-line-chart'], purpose: 'Name of a line chart and caption of its data table.', override: name },
  'chart.donut': { tags: ['void-donut-chart'], purpose: 'Name of a donut chart and caption of its data table.', override: name },
  'chart.gauge': { tags: ['void-gauge'], purpose: 'Name of a gauge and caption of its data table.', override: name },
  'chart.label': { tags: ['void-bar-chart', 'void-line-chart'], purpose: 'Header of the first column of the data table (the labels).', override: null },
  'chart.segment': { tags: ['void-donut-chart', 'void-gauge'], purpose: 'Header of the first column of the data table of segments.', override: null },
  'chart.value': { tags: ['void-donut-chart', 'void-gauge'], purpose: 'Header of the value column of the data table.', override: null },
  'chart.share': { tags: ['void-donut-chart', 'void-gauge'], purpose: 'Header of the share column (the percentage of the whole) of the data table.', override: null },
  'chart.minimum': { tags: ['void-gauge'], purpose: 'Header of the minimum column of a gauge\'s data table.', override: null },
  'chart.maximum': { tags: ['void-gauge'], purpose: 'Header of the maximum column of a gauge\'s data table.', override: null },
  'colorPicker.label': { tags: ['void-color-picker'], purpose: 'Name of the compact picker\'s popup.', override: null },
  'composeInput.placeholder': { tags: ['void-compose-input'], purpose: 'Hint of the empty message box.', override: placeholder },
  'composeInput.send': { tags: ['void-compose-input'], purpose: 'Name of the send button.', override: null },
  'combobox.placeholder': { tags: ['void-combobox'], purpose: 'Hint of the empty search field, which is also its name when no label names it.', override: placeholder },
  'combobox.empty': { tags: ['void-combobox'], purpose: 'Text drawn while nothing matches what was typed.', override: null },
  'actionInput.action': { tags: ['void-action-input'], purpose: 'Name and tooltip of the button.', override: { attribute: 'action-label' } },
  'editable.placeholder': { tags: ['void-editable'], purpose: 'Text shown while the value is empty and the field is not being edited.', override: placeholder },
  'errorFallback.heading': { tags: ['void-error-fallback'], purpose: 'Headline of the built-in default.', override: { attribute: 'heading' } },
  'errorFallback.retry': { tags: ['void-error-fallback'], purpose: 'Text of the built-in retry button.', override: { attribute: 'retry-label' } },
  'fileUpload.prompt': { tags: ['void-file-upload'], purpose: 'Text of the drop zone. `browse` is the word `fileUpload.browse`, which the component draws as the link.', override: null },
  'fileUpload.browse': { tags: ['void-file-upload'], purpose: 'The word in the drop zone that opens the file chooser.', override: null },
  'fileUpload.rejectType': { tags: ['void-file-upload'], purpose: 'Error for a file whose type `accept` does not allow.', override: null },
  'fileUpload.rejectSize': { tags: ['void-file-upload'], purpose: 'Error for a file over `max-size`. `limit` is the limit written in bytes for the locale.', override: null },
  'fileUpload.rejectCount': { tags: ['void-file-upload'], purpose: 'Error for a file beyond the one a zone without `multiple` takes.', override: null },
  'hamburger.open': { tags: ['void-hamburger'], purpose: 'Name of the button while the menu it opens is closed.', override: name },
  'hamburger.close': { tags: ['void-hamburger'], purpose: 'Name of the button while the menu it opens is open.', override: name },
  'indicator.label': { tags: ['void-indicator'], purpose: 'Name of an indicator with no count.', override: name },
  'indicator.count': { tags: ['void-indicator'], purpose: 'Name of an indicator with a count. Has plural forms.', override: name },
  'menu.label': { tags: ['void-menu'], purpose: 'Name of the menu list.', override: { attribute: 'aria-label' } },
  'menu.empty': { tags: ['void-menu'], purpose: 'Text drawn while a search matches no item and the author wrote no empty part.', override: { part: 'void-menu-empty' } },
  'multiselect.placeholder': { tags: ['void-multiselect'], purpose: 'Text of the trigger while nothing is chosen, which is also its name when no label names it.', override: placeholder },
  'multiselect.selected': { tags: ['void-multiselect'], purpose: 'Description of the trigger when options are chosen: how many. Has plural forms.', override: null },
  'numberInput.label': { tags: ['void-number-input'], purpose: 'Name of the field when no label names it.', override: { attribute: 'label' } },
  'numberInput.decrement': { tags: ['void-number-input'], purpose: 'Name of the decrement button.', override: null },
  'numberInput.increment': { tags: ['void-number-input'], purpose: 'Name of the increment button.', override: null },
  'pagination.label': { tags: ['void-pagination'], purpose: 'Name of the pagination landmark.', override: null },
  'pagination.previous': { tags: ['void-pagination'], purpose: 'Name of the previous-page button.', override: null },
  'pagination.next': { tags: ['void-pagination'], purpose: 'Name of the next-page button.', override: null },
  'pinInput.label': { tags: ['void-pin-input'], purpose: 'Name of the group of cells.', override: name },
  'pinInput.digit': { tags: ['void-pin-input'], purpose: 'Name of one cell: its place among the others (`index`, `count`).', override: null },
  'sidebar.label': { tags: ['void-sidebar'], purpose: 'Name of the sidebar navigation landmark.', override: name },
  'spinner.label': { tags: ['void-spinner'], purpose: 'Name of the spinner and the text a screen reader announces.', override: { attribute: 'label' } },
  'statusDot.online': { tags: ['void-status-dot'], purpose: 'Name of a status dot whose `status` is `online`.', override: name },
  'statusDot.away': { tags: ['void-status-dot'], purpose: 'Name of a status dot whose `status` is `away`.', override: name },
  'statusDot.offline': { tags: ['void-status-dot'], purpose: 'Name of a status dot whose `status` is `offline`.', override: name },
  'stepper.label': { tags: ['void-stepper'], purpose: 'Name of the stepper landmark.', override: name },
  'table.selectAll': { tags: ['void-table'], purpose: 'Name of the header checkbox of a selectable table (the native or `void-checkbox` one in a header cell).', override: { attribute: 'aria-label', on: 'void-checkbox' } },
  'table.selectAllShown': { tags: ['void-table'], purpose: 'Name of the header checkbox while a filter hides rows: how many rows it selects. Has plural forms.', override: { attribute: 'aria-label', on: 'void-checkbox' } },
  'table.rowsShown': { tags: ['void-table'], purpose: 'Announcement after a filter changes the rows shown: `shown` of `total`. Has plural forms.', override: null },
  'table.rows': { tags: ['void-table'], purpose: 'Announcement of the number of rows (a manual table, or a table with a result part but no filter). Has plural forms.', override: null },
  'table.selected': { tags: ['void-table'], purpose: 'Announcement after the selection changes: how many rows are selected.', override: null },
  'table.noneSelected': { tags: ['void-table'], purpose: 'Announcement when the selection is emptied.', override: null },
  'table.allSelected': { tags: ['void-table'], purpose: 'Announcement after select-all across pages (`total-rows`): every row is selected. Has plural forms.', override: null },
  'table.sortedAscending': { tags: ['void-table'], purpose: 'Announcement after a column is sorted ascending. `column` is the header\'s `data-label` or text.', override: null },
  'table.sortedDescending': { tags: ['void-table'], purpose: 'Announcement after a column is sorted descending. `column` is the header\'s `data-label` or text.', override: null },
  'table.sortCleared': { tags: ['void-table'], purpose: 'Announcement after sorting is removed from a column.', override: null },
  'tagsInput.placeholder': { tags: ['void-tags-input'], purpose: 'Hint of the entry field while there are no tags.', override: placeholder },
  'toast.region': { tags: ['void-toast-container'], purpose: 'Name of the region that holds the toasts.', override: name },
};

/** Values the English functions are shown with in the docs and the reference. */
export const sampleParams = {
  name: 'report.pdf',
  limit: '5 MB',
  browse: 'browse',
  format: 'MM/DD/YYYY',
  date: '01/15/2025',
  index: 2,
  count: 5,
  column: 'Name',
  shown: 3,
  total: 12,
};
