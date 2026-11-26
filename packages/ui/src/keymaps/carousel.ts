import type { KeyMap } from '../keys.js';

export const carouselKeys = { next: ['ArrowInlineEnd'], previous: ['ArrowInlineStart'] } satisfies KeyMap;
/** What a vertical carousel starts with. */
export const carouselVerticalKeys = { next: ['ArrowDown'], previous: ['ArrowUp'] } satisfies KeyMap;
