/**
 * Keyboard helpers shared by the composite widgets (combobox, multiselect,
 * tabs, menus, segmented control). Internal: not part of the public API.
 */

/**
 * Index of the next entry from `from` in `step` direction (1 or -1) that is not
 * disabled, wrapping at the ends; `from` may be -1 (nothing current). Returns -1
 * when every entry is disabled or the list is empty.
 */
export function stepEnabled(disabled: readonly boolean[], from: number, step: 1 | -1, wrap = true): number {
  const n = disabled.length;
  if (!n) return -1;
  let i = from;
  for (let k = 0; k < n; k++) {
    i += step;
    if (i < 0 || i >= n) {
      if (!wrap) return -1;
      i = (i + n) % n;
    }
    if (!disabled[i]) return i;
  }
  return -1;
}

/** Index of the first (`step` 1) or last (`step` -1) entry that is not disabled, or -1. */
export function edgeEnabled(disabled: readonly boolean[], step: 1 | -1): number {
  return stepEnabled(disabled, step === 1 ? -1 : disabled.length, step, false);
}

/** True for a key press that types a character (no Ctrl, Meta or Alt). */
export function isPrintable(e: KeyboardEvent): boolean {
  return e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
}

/**
 * Type-ahead search: characters typed within `timeout` ms of each other form
 * one search string. The same character repeated cycles through the entries
 * starting with it.
 */
export class Typeahead {
  #buffer = '';
  #timer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly timeout = 500) {}

  /**
   * Feeds a typed character. Returns the index of the matching entry (searching
   * on from `current`, wrapping, skipping disabled entries) or -1.
   */
  match(char: string, labels: readonly string[], disabled: readonly boolean[], current: number): number {
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => { this.#buffer = ''; }, this.timeout);
    this.#buffer += char.toLowerCase();
    const cycling = this.#buffer.length > 1 && [...this.#buffer].every(c => c === this.#buffer[0]);
    const needle = cycling ? this.#buffer[0]! : this.#buffer;
    // A growing string keeps the current entry if it still matches; a new or repeated character moves on.
    const start = cycling || this.#buffer.length === 1 ? current + 1 : Math.max(current, 0);
    const n = labels.length;
    for (let k = 0; k < n; k++) {
      const i = (((start + k) % n) + n) % n;
      if (!disabled[i] && labels[i]!.trim().toLowerCase().startsWith(needle)) return i;
    }
    return -1;
  }

  reset(): void {
    clearTimeout(this.#timer);
    this.#buffer = '';
  }
}

/** True when `el` renders right-to-left (`dir`, `lang`-derived direction or CSS `direction`). */
export function isRtl(el: Element): boolean {
  try {
    if (el.matches(':dir(rtl)')) return true;
  } catch { /* an engine without :dir() */ }
  return getComputedStyle(el).direction === 'rtl';
}

/**
 * The keys that move along the inline axis for `el`: `next` is ArrowRight in
 * left-to-right and ArrowLeft in right-to-left; `prev` is the opposite.
 */
export function inlineKeys(el: Element): { next: 'ArrowLeft' | 'ArrowRight'; prev: 'ArrowLeft' | 'ArrowRight' } {
  return isRtl(el) ? { next: 'ArrowLeft', prev: 'ArrowRight' } : { next: 'ArrowRight', prev: 'ArrowLeft' };
}

let nextId = 0;
/** A document-unique id for ARIA relationships. */
export function uid(prefix: string): string {
  return `${prefix}-${++nextId}`;
}
