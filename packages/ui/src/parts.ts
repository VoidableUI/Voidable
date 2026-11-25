import type { ReactiveController, ReactiveControllerHost } from 'lit';

/**
 * Explicit parts (#52): every region of a component is an element the author
 * writes (`<void-popover-trigger>`, `<void-popover-content>`), and the author's
 * markup is the final DOM. The component never moves, wraps or clones its
 * children; it finds them, adds behaviour, and writes the ARIA and state
 * attributes that wire them together.
 *
 * Parts are CSS-only: undefined `void-*` tags styled by the theme, costing no
 * JavaScript. The parent does all the work, so it does not matter whether a part
 * exists before the parent upgrades, arrives later (streamed HTML, a framework
 * render), is reordered by a keyed list, or is replaced by a server morph.
 *
 * This controller is that work, shared by every parent:
 *
 * - **Finding parts.** {@link all} and {@link one} look parts up in the DOM when
 *   asked: a part belongs to the nearest enclosing element of the parent's tag,
 *   so the same component nested inside itself keeps its own parts, and a
 *   `<form>` (or any other non-part element) between parent and part is fine.
 *   Nothing is cached, so a lookup is never stale.
 * - **Noticing changes.** One MutationObserver per connected parent (childList
 *   over its subtree, plus the attributes it owns) calls `onChange` once per
 *   microtask when a part was added, removed or moved, or when something removed
 *   an attribute the parent wrote. It does no layout work and nothing on a
 *   timer; mutations that touch no part (typing, a list re-rendered inside a
 *   body) are filtered by tag name.
 * - **Owned attributes.** The attributes the parent writes onto parts and onto
 *   the controls inside them (`id`, `role`, `aria-*`, `popover`, `tabindex`,
 *   state flags, overlay placement) are recorded per element:
 *   - {@link set} *controls* an attribute: the parent decides its value, and it
 *     follows the parent's state (`aria-selected`, `active`, `tabindex`);
 *   - {@link provide} only fills an attribute that is absent and never
 *     overwrites what the author or the server wrote (`id`, `role` for a title);
 *   - {@link token} adds one token to a list attribute (`aria-describedby`)
 *     and leaves the author's other tokens alone.
 *   When an element stops being a part (removed, or moved out of the parent),
 *   what the parent wrote on it is taken off again.
 * - **Morphs.** The adapters call the parent's `voidBeforeMorph(incoming)`, which
 *   copies every owned attribute and style property onto the matching element of
 *   the server's markup (same tag and position among its same-tag siblings, or
 *   same server id) before the morph compares them, so the morph keeps them: an
 *   open popover stays in the top layer, generated ids keep morphers pairing the
 *   same nodes, and nothing is moved, parked or rebuilt.
 *
 * Generated ids use a random suffix (no module state, safe across copies of the
 * library) and are created only when an element has none.
 */

/** Instance key of the objects `VoidElement.voidBeforeMorph` hands the incoming element to. */
export const MORPH_PARTICIPANTS: unique symbol = Symbol.for('@voidable/ui:morph-participants');

export interface MorphParticipant {
  voidBeforeMorph(incoming: Element): void;
  /** Whether `incoming` is a copy of the live element rather than server markup. */
  isCopy?(incoming: Element): boolean;
}

type Host = ReactiveControllerHost & HTMLElement & { [MORPH_PARTICIPANTS]?: MorphParticipant[] };

export interface PartsOptions {
  /** Every part tag of the component, at either level. */
  tags: readonly string[];
  /**
   * Re-wires the parts (looks them up and writes their attributes). Called when
   * the parent connects and, coalesced to one call per microtask, whenever a
   * part is added, removed or moved, or an owned attribute was changed by
   * someone else. Must be idempotent: it runs again on its own writes' echo.
   */
  onChange: () => void;
}

/** How the parent owns one attribute of one element. */
interface Owned {
  value: string | null;
  /** `set`: the parent's value always; `provide`: only filled when absent; `token`: one token in a list. */
  mode: 'set' | 'provide' | 'token';
  /** The sync pass that last wrote it (0: written outside a sync, never swept). */
  pass: number;
}

const rand = (): string => Math.random().toString(36).slice(2, 10);

/** A unique id: `prefix-xxxxxxxx`. */
export function partId(prefix: string): string {
  return `${prefix}-${rand()}`;
}

const tokens = (v: string | null): string[] => (v ?? '').split(/\s+/).filter(Boolean);

export class PartsController implements ReactiveController, MorphParticipant {
  readonly host: Host;
  private readonly _tags: ReadonlySet<string>;
  private readonly _selector: string;
  private readonly _onChange: () => void;
  private _observer: MutationObserver | null = null;
  private _queued = false;
  /** Owned attributes per element (an element may be a part or a control inside one). */
  private readonly _attrs = new Map<Element, Map<string, Owned>>();
  /** Owned inline style properties per element. */
  private readonly _styles = new Map<Element, Map<string, string>>();
  /** Attribute names the observer watches: every name ever owned. */
  private readonly _names = new Set<string>();
  private _syncing = false;
  /** Counts sync passes, so a pass can sweep what the previous one wrote and this one did not. */
  private _pass = 0;

  constructor(host: ReactiveControllerHost & HTMLElement, options: PartsOptions) {
    this.host = host as Host;
    this._tags = new Set(options.tags);
    this._selector = options.tags.join(',');
    this._onChange = options.onChange;
    (this.host[MORPH_PARTICIPANTS] ??= []).push(this);
    host.addController(this);
  }

  // ── Lookup ──

  /** Whether `el` is this parent's part (or inside one): its nearest parent of this tag is this host. */
  owns(el: Element): boolean {
    if (!el.isConnected || !this.host.contains(el)) return false;
    const tag = this.host.localName;
    for (let p = el.parentElement; p; p = p.parentElement) {
      if (p === this.host) return true;
      if (p.localName === tag) return false;
    }
    return false;
  }

  /** This parent's parts of `tag`, in document order. */
  all<T extends HTMLElement = HTMLElement>(tag: string): T[] {
    const out: T[] = [];
    for (const el of Array.from(this.host.querySelectorAll<T>(tag))) if (this.owns(el)) out.push(el);
    return out;
  }

  /** This parent's first part of `tag`. */
  one<T extends HTMLElement = HTMLElement>(tag: string): T | null {
    for (const el of Array.from(this.host.querySelectorAll<T>(tag))) if (this.owns(el)) return el;
    return null;
  }

  /** Parts of `tag` inside `part` (a level-2 lookup: triggers inside a tab list). */
  within<T extends HTMLElement = HTMLElement>(part: Element | null, tag: string): T[] {
    if (!part) return [];
    return this.all<T>(tag).filter(el => part.contains(el));
  }

  // ── Owned attributes ──

  private _own(el: Element, name: string, owned: Omit<Owned, 'pass'>): void {
    let map = this._attrs.get(el);
    if (!map) this._attrs.set(el, (map = new Map()));
    map.set(name, { ...owned, pass: this._syncing ? this._pass : (map.get(name)?.pass ?? 0) });
    if (!this._names.has(name)) {
      this._names.add(name);
      if (this._observer) this._observe();
    }
  }

  /**
   * Controls `name` on `el`: writes `value` (`true` for an empty value), or
   * removes it for `null` / `false` / `undefined`.
   */
  set(el: Element, name: string, value: string | boolean | null | undefined): void {
    const next = value === true ? '' : value === false || value === null || value === undefined ? null : String(value);
    this._own(el, name, { value: next, mode: 'set' });
    if (next === null) {
      if (el.hasAttribute(name)) el.removeAttribute(name);
    } else if (el.getAttribute(name) !== next) {
      el.setAttribute(name, next);
    }
  }

  /**
   * Fills `name` on `el` with `value` when the element has no such attribute;
   * an attribute the author or the server wrote is left alone. Returns the
   * attribute's value afterwards.
   */
  provide(el: Element, name: string, value: string): string {
    const current = el.getAttribute(name);
    const owned = this._attrs.get(el)?.get(name);
    if (current !== null && !(owned?.mode === 'provide' && owned.value === current)) {
      // Someone else's value: not ours (any more).
      if (owned) this._attrs.get(el)!.delete(name);
      return current;
    }
    if (current !== null) {
      this._own(el, name, owned!);
      return current;
    }
    this._own(el, name, { value, mode: 'provide' });
    el.setAttribute(name, value);
    return value;
  }

  /** The element's id, generating `prefix-xxxxxxxx` when it has none (an author or server id is never replaced). */
  id(el: Element, prefix: string): string {
    const owned = this._attrs.get(el)?.get('id');
    if (el.id && el.id === owned?.value) {
      // One this parent wrote (here or through the overlay): re-claimed, so a sync keeps it.
      this._own(el, 'id', { value: el.id, mode: 'provide' });
      return el.id;
    }
    // An id someone else wrote (the author, the server) is never replaced.
    if (el.id) return el.id;
    return this.provide(el, 'id', partId(prefix));
  }

  /** Adds (`on`) or removes `token` in the list attribute `name` of `el`, keeping every other token. */
  token(el: Element, name: string, token: string, on = true): void {
    const key = `${name} ${token}`;
    const list = tokens(el.getAttribute(name));
    const has = list.includes(token);
    if (on) {
      this._own(el, key, { value: token, mode: 'token' });
      if (!has) el.setAttribute(name, [...list, token].join(' '));
    } else {
      this._attrs.get(el)?.delete(key);
      if (has) {
        const rest = list.filter(t => t !== token);
        if (rest.length) el.setAttribute(name, rest.join(' '));
        else el.removeAttribute(name);
      }
    }
  }

  /** Controls an inline style property on `el` (`null` removes it). */
  style(el: HTMLElement, property: string, value: string | null): void {
    let map = this._styles.get(el);
    if (value === null || value === '') {
      map?.delete(property);
      el.style.removeProperty(property);
      return;
    }
    if (!map) this._styles.set(el, (map = new Map()));
    map.set(property, value);
    if (el.style.getPropertyValue(property) !== value) el.style.setProperty(property, value);
  }

  /** Takes one owned attribute (or token) back off `el`, leaving a value someone else wrote since. */
  private _drop(el: Element, key: string, owned: Owned): void {
    if (owned.mode === 'token') {
      const name = key.slice(0, key.indexOf(' '));
      const list = tokens(el.getAttribute(name));
      if (!list.includes(owned.value!)) return;
      const rest = list.filter(t => t !== owned.value);
      if (rest.length) el.setAttribute(name, rest.join(' '));
      else el.removeAttribute(name);
    } else if (owned.value !== null && el.getAttribute(key) === owned.value) {
      el.removeAttribute(key);
    }
  }

  /** Takes off everything this parent wrote on `el`. */
  release(el: Element): void {
    const attrs = this._attrs.get(el);
    if (attrs) {
      for (const [key, owned] of attrs) this._drop(el, key, owned);
      this._attrs.delete(el);
    }
    const styles = this._styles.get(el);
    if (styles) {
      for (const [property, value] of styles) {
        if ((el as HTMLElement).style?.getPropertyValue(property) === value) (el as HTMLElement).style.removeProperty(property);
      }
      this._styles.delete(el);
    }
  }

  // ── Lifecycle ──

  hostConnected(): void {
    this._observer ??= new MutationObserver(this._onMutations);
    this._observe();
    this.sync();
  }

  hostDisconnected(): void {
    this._observer?.disconnect();
  }

  /** Re-wires now (normally it happens on its own). */
  sync(): void {
    if (this._syncing) return;
    this._syncing = true;
    const pass = ++this._pass;
    try {
      this._onChange();
      // What an earlier pass wired and this one did not (a token pointing at a
      // content part that is gone, the role of a part that changed kind) goes.
      for (const [el, attrs] of this._attrs) {
        for (const [key, owned] of attrs) {
          if (owned.pass !== 0 && owned.pass !== pass) {
            this._drop(el, key, owned);
            attrs.delete(key);
          }
        }
      }
      // What the parent wrote on elements that are no longer its parts goes.
      for (const el of [...this._attrs.keys(), ...this._styles.keys()]) {
        if (!this.owns(el) && el !== this.host) this.release(el);
      }
    } finally {
      this._syncing = false;
    }
    // Our own writes produce records too; they are only an echo.
    this._observer?.takeRecords();
  }

  /** Re-wires in a microtask (several requests in one task make one call). */
  requestSync(): void {
    if (this._queued) return;
    this._queued = true;
    queueMicrotask(() => {
      this._queued = false;
      if (this.host.isConnected) this.sync();
    });
  }

  private _observe(): void {
    const observer = this._observer;
    if (!observer || !this.host.isConnected) return;
    // A fresh registration: observing the same node again should replace the
    // options, but not every DOM does (happy-dom keeps the first filter). Keep
    // what was pending; outside a sync it is someone else's change.
    const pending = observer.takeRecords();
    observer.disconnect();
    if (pending.length && !this._syncing) queueMicrotask(() => this._onMutations(pending));
    observer.observe(this.host, {
      childList: true,
      subtree: true,
      ...(this._names.size ? { attributes: true, attributeFilter: [...this._names].filter(n => !n.includes(' ')).concat(this._tokenNames()) } : {}),
    });
  }

  private _tokenNames(): string[] {
    const out = new Set<string>();
    for (const n of this._names) if (n.includes(' ')) out.add(n.slice(0, n.indexOf(' ')));
    return [...out];
  }

  private _onMutations = (records: MutationRecord[]): void => {
    for (const r of records) {
      if (r.type === 'attributes') {
        if (this._lostOwned(r.target as Element, r.attributeName!)) return this.requestSync();
        continue;
      }
      // A trigger part wraps the control the parent wires (aria-expanded,
      // aria-describedby): a control swapped inside it is a change too.
      const target = r.target as Element;
      if (target.localName?.endsWith('-trigger') && this._tags.has(target.localName)) return this.requestSync();
      for (const list of [r.addedNodes, r.removedNodes]) {
        for (let i = 0; i < list.length; i++) {
          const n = list[i]!;
          if (n.nodeType !== 1) continue;
          const el = n as Element;
          if (this._tags.has(el.localName) || this._attrs.has(el) || (el.firstElementChild && el.querySelector(this._selector))) {
            return this.requestSync();
          }
        }
      }
    }
  };

  /** An owned attribute of `el` no longer has the value the parent wrote. */
  private _lostOwned(el: Element, name: string): boolean {
    const map = this._attrs.get(el);
    if (!map) return false;
    const owned = map.get(name);
    if (owned) {
      const now = el.getAttribute(name);
      if (owned.mode === 'provide') return now === null;
      return now !== owned.value;
    }
    for (const [key, o] of map) {
      if (o.mode === 'token' && key.startsWith(`${name} `) && !tokens(el.getAttribute(name)).includes(o.value!)) return true;
    }
    return false;
  }

  // ── Morphs ──

  /**
   * Copies every owned attribute and style property onto the element of the
   * server's markup (`incoming`, the server's version of the host) that the
   * morph will pair with each owned element, so the morph keeps them. An
   * attribute the server sends is kept as the server sends it, except a
   * controlled (`set`) one, which follows the live element: it is state the
   * parent derives from its own reflected attributes.
   */
  /**
   * Whether `incoming` is a copy of the live element (`cloneNode`, LiveView's
   * clone of a locked element) rather than server markup: one of its parts
   * already carries an attribute this parent filled in because the author left
   * it out (a generated id, a role), which server markup does not have. Call it
   * before `voidBeforeMorph`, which writes those attributes onto the incoming
   * element.
   */
  isCopy(incoming: Element): boolean {
    for (const [el, attrs] of this._attrs) {
      if (!this.owns(el)) continue;
      let target: Element | null | undefined;
      for (const [name, owned] of attrs) {
        if (owned.mode !== 'provide' || owned.value === null) continue;
        target ??= this._counterpart(el, incoming);
        if (!target) break;
        if (target.getAttribute(name) === owned.value) return true;
      }
    }
    return false;
  }

  voidBeforeMorph(incoming: Element): void {
    if (!this._attrs.size && !this._styles.size) return;
    const elements = new Set([...this._attrs.keys(), ...this._styles.keys()]);
    for (const el of elements) {
      if (!this.owns(el)) continue;
      const target = this._counterpart(el, incoming);
      if (!target) continue;
      const attrs = this._attrs.get(el);
      if (attrs) {
        for (const [key, owned] of attrs) {
          if (owned.mode === 'token') {
            const name = key.slice(0, key.indexOf(' '));
            const list = tokens(target.getAttribute(name));
            if (!list.includes(owned.value!)) target.setAttribute(name, [...list, owned.value!].join(' '));
          } else if (owned.mode === 'provide') {
            if (!target.hasAttribute(key) && owned.value !== null && el.getAttribute(key) === owned.value) target.setAttribute(key, owned.value);
          } else if (owned.value === null) {
            if (target.hasAttribute(key)) target.removeAttribute(key);
          } else if (target.getAttribute(key) !== owned.value) {
            target.setAttribute(key, owned.value);
          }
        }
      }
      const styles = this._styles.get(el);
      if (styles && 'style' in target) {
        const style = (target as HTMLElement).style;
        for (const [property, value] of styles) if (!style.getPropertyValue(property)) style.setProperty(property, value);
      }
    }
  }

  /**
   * The element of `incoming` a morph pairs with `el`: the one with the same
   * server id, else the one at the same path (tag and index among same-tag
   * siblings at each level), which is how morphers pair elements without ids.
   */
  private _counterpart(el: Element, incoming: Element): Element | null {
    const generated = this._attrs.get(el)?.get('id');
    if (el.id && !(generated?.mode === 'provide' && generated.value === el.id)) {
      try {
        const byId = incoming.querySelector(`#${CSS.escape(el.id)}`);
        if (byId) return byId;
      } catch {
        // No CSS.escape (test DOMs): fall back to the path.
      }
    }
    const path: Array<[string, number]> = [];
    for (let n: Element | null = el; n && n !== this.host; n = n.parentElement) {
      let i = 0;
      for (let s = n.previousElementSibling; s; s = s.previousElementSibling) if (s.localName === n.localName) i++;
      path.unshift([n.localName, i]);
    }
    let cur: Element | null = incoming;
    for (const [tag, index] of path) {
      let found: Element | null = null;
      let i = 0;
      for (let c: Element | null = cur!.firstElementChild; c; c = c.nextElementSibling) {
        if (c.localName !== tag) continue;
        if (i++ === index) {
          found = c;
          break;
        }
      }
      if (!found) return null;
      cur = found;
    }
    return cur;
  }
}

/**
 * The control inside an overlay trigger part: the first element child of
 * `<void-popover-trigger>` (a `<void-button>`, a `<button>`, a link), which gets
 * the trigger ARIA. Null when the trigger holds no element.
 */
export function triggerControl(trigger: Element | null): HTMLElement | null {
  return (trigger?.firstElementChild as HTMLElement | null) ?? null;
}

/**
 * Gives `host` an open shadow root holding `markup` (static, trusted), once,
 * and returns it: the internal structure of a component that needs a native
 * element of its own around the author's children (the `<dialog>` of a modal)
 * or a control the author does not write (a close button). The author's
 * children stay light-DOM children of the host, unmoved, and are shown through
 * the `<slot>` in `markup`; the theme styles the internal elements through
 * `::part()`. Morphers and frameworks never see a shadow root, so it survives
 * them by construction.
 */
export function attachChrome(host: HTMLElement, markup: string): ShadowRoot {
  const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
  if (!root.firstChild) root.innerHTML = markup;
  return root;
}
