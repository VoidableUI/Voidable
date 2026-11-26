import type { KeyMap } from '../keys.js';

/** Every overlay (dialog, drawer, popover, tooltip, hover card, the pickers' lists) closes on Escape. */
export const overlayKeys = { close: ['Escape'] } satisfies KeyMap;
