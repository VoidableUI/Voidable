import type { KeyMap } from '../keys.js';

export const numberInputKeys = { increment: ['ArrowUp'], decrement: ['ArrowDown'] } satisfies KeyMap;

export const pinInputKeys = {
  previous: ['ArrowInlineStart'],
  next: ['ArrowInlineEnd'],
  deleteBackward: ['Backspace'],
  deleteForward: ['Delete'],
} satisfies KeyMap;

export const tagsInputKeys = { add: ['Enter', ','], removeLast: ['Backspace'] } satisfies KeyMap;

export const composeInputKeys = { send: ['Enter'] } satisfies KeyMap;

/** The preview of an editable (not yet editing). */
export const editablePreviewKeys = { activate: ['Enter', 'Space'] } satisfies KeyMap;
/** The field of an editable (editing). */
export const editableFieldKeys = { submit: ['Enter'], cancel: ['Escape'] } satisfies KeyMap;
export const editableKeys = { ...editablePreviewKeys, ...editableFieldKeys } satisfies KeyMap;
