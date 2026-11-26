import type { KeyMap } from '../keys.js';

/**
 * Selecting every row shown is a shortcut, so it has no default key (shortcuts are opt-in); an application enables
 * it with `keys='{"selectAll":["Control+a","Meta+a"]}'`. The table's other keys are the keys of its controls
 * (Space on a checkbox, Enter on a sort button, Shift + Space for a range) and are the browser's, not actions.
 */
export const tableKeys = { selectAll: [] } satisfies KeyMap;
