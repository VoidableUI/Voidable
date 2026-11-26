import type { KeyMap } from '../keys.js';

/** A group whose items are chosen by moving among them (segmented control, radios, toggle group): both axes. */
export const choiceKeys = {
  next: ['ArrowInlineEnd', 'ArrowDown'],
  previous: ['ArrowInlineStart', 'ArrowUp'],
} satisfies KeyMap;

/** A toggle group moves along its own axis only: the reading direction when horizontal. */
export const toggleGroupKeys = { next: ['ArrowInlineEnd'], previous: ['ArrowInlineStart'] } satisfies KeyMap;
/** What a vertical toggle group starts with. */
export const toggleGroupVerticalKeys = { next: ['ArrowDown'], previous: ['ArrowUp'] } satisfies KeyMap;

/** A radio also checks on Space. */
export const radioKeys = { ...choiceKeys, activate: ['Space'] } satisfies KeyMap;
