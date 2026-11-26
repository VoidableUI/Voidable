import type { KeyMap } from '../keys.js';

/** Enter and Space press a button-like control (Space on release, as a native button does). */
export const activateKeys = { activate: ['Enter', 'Space'] } satisfies KeyMap;

/** Space alone presses it, as on a native checkbox or radio. */
export const pressKeys = { activate: ['Space'] } satisfies KeyMap;
