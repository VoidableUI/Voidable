import type { KeyMap } from '../keys.js';

export const tabsKeys = {
  next: ['ArrowInlineEnd'],
  previous: ['ArrowInlineStart'],
  first: ['Home'],
  last: ['End'],
  activate: ['Enter', 'Space'],
} satisfies KeyMap;
