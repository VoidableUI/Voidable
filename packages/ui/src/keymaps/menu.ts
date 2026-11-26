import type { KeyMap } from '../keys.js';

export const menuKeys = {
  next: ['ArrowDown'],
  previous: ['ArrowUp'],
  first: ['Home'],
  last: ['End'],
  typeahead: ['Printable'],
  close: ['Escape'],
} satisfies KeyMap;

/** On the trigger of a dropdown menu. */
export const dropdownTriggerKeys = { open: ['ArrowDown'], openLast: ['ArrowUp'], activate: ['Enter', 'Space'] } satisfies KeyMap;

/** Inside a dropdown menu's panel. */
export const dropdownPanelKeys = { ...menuKeys, leave: ['Tab', 'Shift+Tab'] } satisfies KeyMap;

export const dropdownMenuKeys = { ...dropdownTriggerKeys, ...dropdownPanelKeys } satisfies KeyMap;
