import type { KeyMap } from '../keys.js';

export const comboboxKeys = {
  next: ['ArrowDown'],
  previous: ['ArrowUp'],
  open: ['Alt+ArrowDown'],
  activate: ['Enter'],
  close: ['Escape', 'Alt+ArrowUp'],
} satisfies KeyMap;

export const multiselectKeys = {
  next: ['ArrowDown'],
  previous: ['ArrowUp'],
  first: ['Home'],
  last: ['End'],
  nextPage: ['PageDown'],
  previousPage: ['PageUp'],
  activate: ['Enter', 'Space'],
  typeahead: ['Printable'],
  close: ['Escape', 'Alt+ArrowUp'],
} satisfies KeyMap;

export const calendarKeys = {
  previousDay: ['ArrowInlineStart'],
  nextDay: ['ArrowInlineEnd'],
  previousWeek: ['ArrowUp'],
  nextWeek: ['ArrowDown'],
  startOfWeek: ['Home'],
  endOfWeek: ['End'],
  previousMonth: ['PageUp'],
  nextMonth: ['PageDown'],
  previousYear: ['Shift+PageUp'],
  nextYear: ['Shift+PageDown'],
  activate: ['Enter', 'Space'],
} satisfies KeyMap;

export const datePickerKeys = { activate: ['Enter', 'Space'], open: ['ArrowDown'], close: ['Escape'] } satisfies KeyMap;
