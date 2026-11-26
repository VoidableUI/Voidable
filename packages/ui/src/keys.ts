/**
 * Key actions (#90): every key a component handles is the default binding of a named action, and a handler asks
 * `actionFor(el, event)` which action (if any) the event is.
 *
 * A binding is a key name as `KeyboardEvent.key` spells it, with modifiers in front: `"ArrowRight"`,
 * `"Shift+Tab"`, `"Control+a"`, `"Meta+k"`. `"Space"` is the space bar. A single character matches either case
 * unless `Shift` is named; Control, Alt and Meta must match exactly, and so must Shift for every other key.
 * `"Printable"` stands for any character key (type-ahead). Two default-only names follow reading direction:
 * `"ArrowInlineEnd"` is ArrowRight (ArrowLeft in right-to-left text) and `"ArrowInlineStart"` the opposite. A key an
 * application writes is taken literally: it does not mirror.
 *
 * Overrides, most specific first: the element's `keys` property or attribute, `configureKeys(tag, …)`, then
 * `configureKeys('*', …)`, then the component's default. An action bound to `[]` or `null` is off. The registry is
 * kept on `globalThis` so that two copies of the library share it. Nothing here runs until a key is pressed.
 */

/** A component's actions: name -> default bindings. */
export type KeyMap = Readonly<Record<string, readonly string[]>>;

/** What an application may bind: an action name -> one binding, a list of them, or `null` (off). */
export type KeyOverrides = Record<string, string | readonly string[] | null>;

const REGISTRY = Symbol.for('voidable.keys');
type Registry = Record<string, KeyOverrides>;
type Keyed = HTMLElement & { keys?: KeyOverrides | null };

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

/** The `keys` attribute: JSON. Anything else is no override (`voidable check` and `@voidable/ui/dev` report it). */
export const keysConverter = {
  fromAttribute(value: string | null): KeyOverrides | null {
    try {
      const keys: unknown = value && JSON.parse(value);
      return keys && typeof keys === 'object' && !Array.isArray(keys) ? (keys as KeyOverrides) : null;
    } catch {
      return null;
    }
  },
};

/** How well `spec` matches the event: 0 not at all, 0.5 for `Printable`, else 1 plus the number of modifiers it names. */
function score(spec: string, e: KeyboardEvent, el: Element): number {
  const cut = spec.length > 1 ? spec.lastIndexOf('+', spec.length - 2) : -1;
  let key = spec.slice(cut + 1);
  const mods = cut < 0 ? '' : spec.slice(0, cut);
  const named = (...names: string[]) => names.some((n) => mods.split('+').includes(n));
  const ctrl = named('Control', 'Ctrl');
  const alt = named('Alt');
  const meta = named('Meta');
  const shift = named('Shift');
  if (e.ctrlKey !== ctrl || e.altKey !== alt || e.metaKey !== meta) return 0;
  const n = (ctrl ? 1 : 0) + (alt ? 1 : 0) + (meta ? 1 : 0) + (shift ? 1 : 0);
  if (key === 'Printable') return e.key.length === 1 && !shift && !ctrl && !alt && !meta ? 0.5 : 0;
  if (key === 'Space') key = ' ';
  else if (key === 'ArrowInlineEnd') key = inlineKeys(el).next;
  else if (key === 'ArrowInlineStart') key = inlineKeys(el).prev;
  if (key.length === 1 && e.key.length === 1) {
    // A character: the case does not matter, and Shift only has to be down when it is named.
    if (shift && !e.shiftKey) return 0;
    return key.toLowerCase() === e.key.toLowerCase() ? 1 + n : 0;
  }
  return e.shiftKey === shift && key === e.key ? 1 + n : 0;
}

/**
 * The action of `map` (default: the `keyMap` of `el`'s class) that `e` is, or `undefined`. An event that is
 * already `defaultPrevented`, or that is part of an IME composition, is no action: this is how a capture-phase
 * `keydown` listener switches a key off. The best match wins (`Shift+Tab` over `Tab`).
 */
export function actionFor(el: HTMLElement, e: KeyboardEvent, map?: KeyMap): string | undefined {
  map ??= (el.constructor as { keyMap?: KeyMap }).keyMap;
  if (!map || e.defaultPrevented || e.isComposing) return undefined;
  // A framework that writes the property rather than the attribute may hand over the JSON text (React 19 does).
  const raw = (el as Keyed).keys as unknown;
  const own = typeof raw === 'string' ? keysConverter.fromAttribute(raw) : (raw as KeyOverrides | null);
  const registry = (globalThis as { [REGISTRY]?: Registry })[REGISTRY];
  const levels = [own, registry?.[el.localName], registry?.['*']];
  let best: string | undefined;
  let top = 0;
  for (const action in map) {
    let bound: string | readonly string[] | null | undefined = map[action];
    for (const level of levels) {
      if (level && action in level) {
        bound = level[action];
        break;
      }
    }
    for (const spec of typeof bound === 'string' ? [bound] : bound ?? []) {
      const s = score(spec, e, el);
      if (s > top) {
        top = s;
        best = action;
      }
    }
  }
  return best;
}

/**
 * Binds actions for every `<tag>` on the page (`configureKeys('void-tabs', { next: ['ArrowRight', 'l'] })`), or
 * for an action name in every component (`configureKeys('*', { close: ['Escape'] })`). A later call for the same
 * tag replaces the earlier one; `null` clears it. An element's own `keys` wins over both; `[]` or `null` turns an
 * action off. An action name the component does not have is a warning when `@voidable/ui/dev` is loaded.
 */
export function configureKeys(tag: string, overrides: KeyOverrides | null): void {
  const host = globalThis as { [REGISTRY]?: Registry };
  const registry = (host[REGISTRY] ??= {});
  if (overrides) registry[tag] = overrides;
  else delete registry[tag];
  // The development entry (if loaded) reports an action name the tag does not have.
  if (overrides && tag !== '*') {
    (globalThis as { [k: symbol]: { keys?: (tag: string, o: object) => void } | undefined })[Symbol.for('voidable.dev')]?.keys?.(tag, overrides);
  }
}
