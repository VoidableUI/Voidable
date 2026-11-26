import { LitElement, ReactiveElement, type PropertyDeclaration, type PropertyValues } from 'lit';
import { PROJECTION_KEY, projectionApi } from './projection-api.js';
import type { ProjectionController } from './projection.js';

/** Per-class cache of reflected property defaults (attribute name -> property and default value). */
const REFLECTED_DEFAULTS = Symbol('voidReflectedDefaults');
/** Marks the pristine instance built to read a class's defaults; it never renders. */
const DEFAULTS_PROBE = Symbol('voidDefaultsProbe');

type ReflectedDefaults = Map<string, { prop: PropertyKey; value: unknown; custom: boolean; options: PropertyDeclaration }>;
/** Old value passed to requestUpdate to force a reflection of an unchanged property. */
const REFLECT_AGAIN = Symbol('voidReflectAgain');
type VoidClass = typeof VoidElement & { [REFLECTED_DEFAULTS]?: ReflectedDefaults };

/**
 * The default value of every reflected property of `ctor`, keyed by attribute
 * name, read from one pristine instance of the class (built once, never
 * connected or rendered). Lit only records defaults for `useDefault`
 * properties, and Void UI reflects its defaults so state stays readable in the
 * DOM, so they are read here instead.
 */
function reflectedDefaults(el: VoidElement): ReflectedDefaults {
  const ctor = el.constructor as VoidClass;
  if (Object.prototype.hasOwnProperty.call(ctor, REFLECTED_DEFAULTS)) return ctor[REFLECTED_DEFAULTS]!;
  const map: ReflectedDefaults = new Map();
  ctor[REFLECTED_DEFAULTS] = map;
  let probe: Record<PropertyKey, unknown> | null = null;
  try {
    if (customElements.get(el.localName) === ctor) {
      probe = Object.assign(new (ctor as unknown as new () => VoidElement)(), { [DEFAULTS_PROBE]: true }) as unknown as Record<PropertyKey, unknown>;
    }
  } catch {
    probe = null;
  }
  if (!probe) return map;
  for (const [prop, options] of ctor.elementProperties) {
    if (!options.reflect || options.attribute === false) continue;
    const attr = typeof options.attribute === 'string' ? options.attribute : String(prop).toLowerCase();
    // A custom converter decides what an absent attribute means; only Lit's default conversion
    // is treated as "not set, use the default".
    const custom = typeof options.converter === 'function' || !!options.converter?.fromAttribute;
    map.set(attr, { prop, value: probe[prop], custom, options });
  }
  return map;
}

/**
 * What the morph rule needs to know about a class, derived once per class from
 * its own property declarations: every attribute that backs a property, and
 * whether the property reflects (only reflected attributes are state the
 * component writes onto its own host).
 */
interface MorphMeta {
  /** Attribute name -> true when the property reflects. */
  attrs: Map<string, boolean>;
  /** Declared client state (see VoidElement.clientState): property -> attribute that discards it. */
  drafts: Array<[PropertyKey, string | null]>;
  /** The class overrides VoidElement's `morphedCallback`. */
  hook: boolean;
  /** Attributes the user edits through a focused inner control (see VoidElement.editState). */
  edits: readonly string[];
}

const MORPH_META = Symbol('voidMorphMeta');
type MetaClass = typeof VoidElement & { [MORPH_META]?: MorphMeta };

function morphMeta(el: VoidElement): MorphMeta {
  const ctor = el.constructor as MetaClass;
  if (Object.prototype.hasOwnProperty.call(ctor, MORPH_META)) return ctor[MORPH_META]!;
  const attrs = new Map<string, boolean>();
  for (const [prop, options] of ctor.elementProperties) {
    if (options.attribute === false) continue;
    const attr = typeof options.attribute === 'string' ? options.attribute : String(prop).toLowerCase();
    attrs.set(attr, !!options.reflect);
  }
  const drafts = Object.entries(ctor.clientState ?? {}) as Array<[PropertyKey, string | null]>;
  const proto = el as unknown as { morphedCallback: unknown };
  const hook = proto.morphedCallback !== (VoidElement.prototype as unknown as { morphedCallback: unknown }).morphedCallback;
  const meta: MorphMeta = { attrs, drafts, hook, edits: ctor.editState ?? [] };
  ctor[MORPH_META] = meta;
  return meta;
}

/** Restorations of one owned attribute allowed within REPAIR_WINDOW ms before the component gives up on it. */
const REPAIR_LIMIT = 10;
const REPAIR_WINDOW = 1000;
/** Set by `@voidable/ui/dev` when it is loaded (an app imports it in development only). */
const DEV_KEY = Symbol.for('voidable.dev');
/** Same key as parts.ts's MORPH_PARTICIPANTS (a registered symbol, so base needs no import of parts.ts). */
const MORPH_PARTICIPANTS: unique symbol = Symbol.for('@voidable/ui:morph-participants');
type DevHook = { report?: (warning: { kind: string; tag: string; subject: string; message: string; element?: Element }) => void };

/**
 * Base class of every Void UI component: a Light-DOM LitElement whose rendered
 * structure and host attributes survive server-driven DOM morphs, clones and
 * framework reconciliation.
 *
 * - **Confined chrome.** A component that renders (overrides `render()`) gets a
 *   {@link ProjectionController} with no regions: Lit renders between two comment
 *   markers, the rendered nodes ("chrome") are tracked by identity, a clone or
 *   `outerHTML` round trip of a rendered host renders one set of chrome, and if a
 *   morph or `innerHTML` removes or recycles the chrome the component re-renders
 *   it. Components that host consumer children declare their own controller with
 *   regions, which replaces the default one.
 * - **Owned host attributes.** Attributes a component manages on its own host
 *   (`role`, `tabindex`, `aria-*`, state flags) are written with
 *   {@link setHostAttribute}, and custom properties on its own `style` with
 *   {@link setHostStyle}. They are recorded, carried onto the incoming element by
 *   {@link voidBeforeMorph}, and put back (in a microtask) if anything else removes
 *   them, a bounded number of times: a script that keeps removing one wins.
 * - **Server versus client state.** For every reflected property the element
 *   remembers what the server last rendered. In a morph, an attribute the server
 *   changed since then wins; every other reflected attribute keeps the client's
 *   value (the toggle the user pressed, the dialog the user opened, the collapsed
 *   sidebar). A removed reflected attribute resets its property to the class
 *   default. State that no reflected attribute carries is declared with
 *   {@link VoidElement.clientState}; groups re-apply state they keep in their
 *   children in {@link morphedCallback}.
 */
/** Incoming elements whose state rule a host has applied, so a repeated call with the same one is a no-op. */
const reconciled = new WeakMap<Element, Element>();

export class VoidElement extends LitElement {
  /** @internal The element's projection controller (see ProjectionController). */
  declare [PROJECTION_KEY]?: ProjectionController;
  /** @internal Controllers that carry what they wrote on parts into the server's markup (see parts.ts). */
  declare [MORPH_PARTICIPANTS]?: Array<{ voidBeforeMorph(incoming: Element): void; isCopy?(incoming: Element): boolean }>;

  /** Owned host attributes: last value this component wrote (null = it removed it). */
  #ownAttrs: Map<string, string | null> | null = null;
  /** Owned custom properties on the host's inline style. */
  #ownStyle: Map<string, string> | null = null;
  #repairQueued = false;
  #inUpdate = false;
  /** Restorations per owned attribute: [count, window start]; count is Infinity once given up. */
  #repairs: Map<string, [number, number]> | null = null;
  /**
   * What the server last rendered for the attributes behind this element's
   * properties (only those present; null for none, undefined until first
   * connected). Each morph compares the incoming markup with it.
   */
  #server: Map<string, string> | null | undefined = undefined;
  /** The server's last markup of this element (outerHTML), for voidUnchanged. */
  #serverHTML: string | undefined = undefined;
  #morphQueued = false;
  #serverChanged: Set<string> | null = null;

  /**
   * Client state that no reflected attribute carries and the server never
   * renders, such as text typed but not committed yet: property name -> the
   * attribute whose change by the server discards it (the property is set to
   * `null` so the server's value shows), or `null` to keep it whatever the
   * server sends. Morphs leave these properties alone otherwise; the component
   * renders them in place of the committed value while they are set.
   *
   * ```ts
   * static override clientState = { _pendingText: 'value' };
   * ```
   */
  static clientState?: Record<string, string | null>;

  /**
   * Attributes whose value the user is editing while focus is inside the
   * element (the text of an input): a morph that arrives then never applies
   * the server's value of these, as a browser never rewrites what a user typed
   * into a native field from its `value` attribute. The server's value still
   * becomes the baseline, and the next morph after focus has left applies a
   * server change as usual. This is what keeps every keystroke when each one
   * round-trips to the server and comes back a few keys behind (Livewire's
   * `$wire.set` on `void-input`, LiveView's `phx-change` echo).
   *
   * ```ts
   * static override editState = ['value'];
   * ```
   */
  static editState?: readonly string[];

  /**
   * Where `aria-label` and `aria-labelledby` written on the host go, for a
   * component whose host is not the control (a `void-select` renders a native
   * `<select>`): a selector for the element(s) inside that are named. The
   * host's attributes are moved onto them (a name on an element with no role
   * is ignored and invalid), so `<void-select aria-label="Country">` names the
   * select as `<void-field label="Country">` does. An `aria-labelledby` that
   * `void-field` (or the author) wrote on the inner control itself is left
   * alone. Set the attribute again to change the name, set it to an empty
   * string to remove it; a morph to server markup without it removes it too.
   *
   * ```ts
   * static override labelTarget = 'select';
   * ```
   */
  static labelTarget?: string;

  static override get observedAttributes(): string[] {
    const names = super.observedAttributes;
    return (this as typeof VoidElement).labelTarget ? [...names, 'aria-label', 'aria-labelledby'] : names;
  }

  /** The host's moved `aria-label` / `aria-labelledby`, and what was last written onto the inner control. */
  #hostLabel: { 'aria-label': string | null; 'aria-labelledby': string | null; written: Map<Element, Record<string, string | null>> } | null = null;

  #takeHostLabel(name: 'aria-label' | 'aria-labelledby', value: string): void {
    if (!this.#hostLabel) {
      this.#hostLabel = { 'aria-label': null, 'aria-labelledby': null, written: new Map() };
      this.addController({ hostUpdated: () => this.#applyHostLabel() });
    }
    this.#hostLabel[name] = value || null;
    this.removeAttribute(name);
    this.#applyHostLabel();
  }

  #applyHostLabel(): void {
    const state = this.#hostLabel;
    const selector = (this.constructor as typeof VoidElement).labelTarget;
    if (!state || !selector) return;
    const targets = Array.from(this.querySelectorAll(selector));
    for (const [el, written] of state.written) {
      if (targets.includes(el)) continue;
      state.written.delete(el);
      for (const [name, value] of Object.entries(written)) if (value !== null && el.getAttribute(name) === value) el.removeAttribute(name);
    }
    for (const el of targets) {
      let written = state.written.get(el);
      if (!written) state.written.set(el, (written = { 'aria-label': null, 'aria-labelledby': null }));
      for (const name of ['aria-label', 'aria-labelledby'] as const) {
        const want = state[name];
        const current = el.getAttribute(name);
        // Someone else (void-field) labelled the control itself: theirs stays.
        if (name === 'aria-labelledby' && current !== null && current !== written[name]) continue;
        if (want === null) {
          if (written[name] !== null && current === written[name] && current !== null) {
            el.removeAttribute(name);
          }
          written[name] = null;
        } else {
          if (current !== want) el.setAttribute(name, want);
          written[name] = want;
        }
      }
    }
  }

  createRenderRoot(): this {
    return this;
  }

  override connectedCallback(): void {
    if (this.#server === undefined) {
      // The attributes present when the element first connects are the server's
      // (or the author's) markup: the baseline the first morph compares against.
      this.#server = this.#readServer(this);
      // And the whole server markup, for voidUnchanged (serialising every
      // element's subtree costs about a millisecond for a page of thousands).
      // The document parser connects an element before its children: then
      // this does not match, the first morph runs in full and records it.
      this.#serverHTML = this.outerHTML;
      // A component that renders and declared no controller of its own (with
      // regions, in a field initializer) gets the region-less default, created
      // here rather than in the constructor so components with their own never
      // build two. Components without a template (Lit's default render returns
      // noChange) never render chrome and need none.
      if (!this[PROJECTION_KEY] && (this as unknown as { render: unknown }).render !== (LitElement.prototype as unknown as { render: unknown }).render) {
        projectionApi.current?.create(this);
      }
    }
    super.connectedCallback();
  }

  /**
   * Moved within the document with `Element.moveBefore` (how projection parks
   * and restores nodes around a morph): nothing to tear down or set up, so the
   * browser runs this instead of disconnectedCallback plus connectedCallback.
   * @internal
   */
  connectedMoveCallback(): void {}

  /**
   * Reports a problem with this element through `@voidable/ui/dev` when it is loaded (a console warning,
   * or a thrown `VoidDevError` in a test suite that asked for that); silent otherwise. Never throws on
   * its own.
   */
  protected reportDev(kind: string, subject: string, message: string): void {
    const dev = (globalThis as Record<symbol, unknown>)[DEV_KEY] as DevHook | undefined;
    dev?.report?.({ kind, tag: this.localName, subject, message, element: this });
  }

  /** The property-backed attributes `el` carries, or null for none. */
  #readServer(el: Element): Map<string, string> | null {
    if (!el.hasAttributes()) return null;
    const { attrs } = morphMeta(this);
    const list = el.attributes;
    let map: Map<string, string> | null = null;
    for (let i = 0; i < list.length; i++) {
      const a = list[i]!;
      if (attrs.has(a.name)) (map ??= new Map()).set(a.name, a.value);
    }
    return map;
  }

  protected override shouldUpdate(changed: PropertyValues): boolean {
    return !(this as Record<PropertyKey, unknown>)[DEFAULTS_PROBE] && super.shouldUpdate(changed);
  }

  protected override update(changed: PropertyValues): void {
    this.#inUpdate = true;
    try {
      // A component without a template (Lit's default render) renders nothing:
      // skip Lit's render, which would still put its marker comment into the
      // host, where a morph sees an extra child and removes it, and the next
      // update then throws "ChildPart has no parentNode" (tab panels under
      // Livewire).
      if ((this as unknown as { render: unknown }).render === (LitElement.prototype as unknown as { render: unknown }).render) {
        ReactiveElement.prototype['update'].call(this, changed);
      } else {
        super.update(changed);
      }
    } finally {
      this.#inUpdate = false;
    }
  }

  // ── Owned host attributes ─────────────────────────────────────────────────

  /**
   * Sets (a string, or `true` for an empty value) or removes (`null`, `false`,
   * `undefined`) an attribute this component manages on its own host, such as
   * `role`, `tabindex` or `aria-checked`. Use it instead of `this.setAttribute`
   * for every host attribute that is not a reflected property: the value is
   * remembered, survives morphs whose server markup does not carry it, and is
   * restored if something else removes it. A different value written by someone
   * else (server markup that sets the attribute) is left alone.
   */
  protected setHostAttribute(name: string, value: string | boolean | null | undefined): void {
    const next = value === true ? '' : value === false || value === null || value === undefined ? null : String(value);
    const own = (this.#ownAttrs ??= new Map());
    // A new value of its own re-arms restoring an attribute the component gave up on.
    if (this.#repairs && own.get(name) !== next) this.#repairs.delete(name);
    own.set(name, next);
    if (next === null) {
      if (this.hasAttribute(name)) super.removeAttribute(name);
    } else if (this.getAttribute(name) !== next) {
      super.setAttribute(name, next);
    }
  }

  /**
   * Sets (or, with `null` / `undefined` / `''`, removes) a CSS custom property on
   * the host's inline style that this component manages, with the same morph
   * guarantees as {@link setHostAttribute}.
   */
  protected setHostStyle(property: string, value: string | null | undefined): void {
    if (value === null || value === undefined || value === '') {
      this.#ownStyle?.delete(property);
      this.style.removeProperty(property);
    } else {
      (this.#ownStyle ??= new Map()).set(property, value);
      if (this.style.getPropertyValue(property) !== value) this.style.setProperty(property, value);
    }
  }

  override removeAttribute(name: string): void {
    super.removeAttribute(name);
    this.#lost(name);
  }

  override removeAttributeNS(namespace: string | null, name: string): void {
    super.removeAttributeNS(namespace, name);
    if (!namespace) this.#lost(name);
  }

  override toggleAttribute(name: string, force?: boolean): boolean {
    const present = super.toggleAttribute(name, force);
    if (!present) this.#lost(name);
    return present;
  }

  override setAttribute(name: string, value: string): void {
    super.setAttribute(name, value);
    if (name === 'style' && this.#ownStyle?.size) this.#queueRepair();
  }

  /** Something other than the component removed `name`; put owned values back. */
  #lost(name: string): void {
    if (name === 'style' ? this.#ownStyle?.size : this.#ownAttrs?.get(name) != null) this.#queueRepair();
  }

  #queueRepair(): void {
    if (this.#repairQueued) return;
    this.#repairQueued = true;
    // Never synchronously: morph libraries iterate the attribute list while removing.
    queueMicrotask(() => {
      this.#repairQueued = false;
      this.#repairHostAttributes();
    });
  }

  #repairHostAttributes(): void {
    if (this.#ownAttrs) {
      for (const [name, value] of this.#ownAttrs) {
        if (value !== null && !this.hasAttribute(name) && this.#mayRepair(name)) super.setAttribute(name, value);
      }
    }
    if (this.#ownStyle) {
      let allowed: boolean | undefined;
      for (const [property, value] of this.#ownStyle) {
        if (this.style.getPropertyValue(property) === value) continue;
        if (!(allowed ??= this.#mayRepair('style'))) break;
        this.style.setProperty(property, value);
      }
    }
  }

  /**
   * Bounds restoring: when something removes an owned attribute every time it
   * comes back (a page script fighting the component), it wins after
   * REPAIR_LIMIT rounds within REPAIR_WINDOW ms instead of an endless
   * removal/restore loop. Reported through `@voidable/ui/dev` when it is loaded.
   */
  #mayRepair(name: string): boolean {
    const now = Date.now();
    const repairs = (this.#repairs ??= new Map());
    let entry = repairs.get(name);
    if (entry && entry[0] === Infinity) return false;
    if (!entry || now - entry[1] > REPAIR_WINDOW) repairs.set(name, (entry = [0, now]));
    if (++entry[0] <= REPAIR_LIMIT) return true;
    entry[0] = Infinity;
    const dev = (globalThis as Record<symbol, unknown>)[DEV_KEY] as DevHook | undefined;
    dev?.report?.({
      kind: 'attribute-fight',
      tag: this.localName,
      subject: name,
      message:
        `<${this.localName}> ${name}: something keeps removing this attribute, which the component manages; ` +
        `after ${REPAIR_LIMIT} restorations within ${REPAIR_WINDOW} ms it is no longer put back. ` +
        `Find the script that removes it (a MutationObserver, a sanitiser) and leave the attribute alone.`,
      element: this,
    });
    return false;
  }

  override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    if ((name === 'aria-label' || name === 'aria-labelledby') && (this.constructor as typeof VoidElement).labelTarget) {
      if (value !== null) this.#takeHostLabel(name, value);
      return;
    }
    super.attributeChangedCallback(name, old, value);
    // A reflected attribute removed from outside (a morph to server markup that
    // omits it, `removeAttribute`): the property returns to its default, as it
    // would for a freshly rendered element (a boolean that defaults to true stays
    // true), rather than to whatever the converter makes of null. Lit's own
    // reflection (during update) is left alone.
    if (value !== null || old === null || this.#inUpdate) return;
    const entry = reflectedDefaults(this).get(name);
    if (!entry) return;
    const self = this as unknown as Record<PropertyKey, unknown>;
    if (!entry.custom && entry.value !== undefined && self[entry.prop] !== entry.value) {
      self[entry.prop] = entry.value;
      return;
    }
    // The property kept a value that reflects as an attribute (the default, or
    // what a custom converter makes of null): write the attribute back, so the
    // host reads the same as a freshly rendered one.
    const { options } = entry;
    const current = self[entry.prop];
    const converter = typeof options.converter === 'object' ? options.converter : undefined;
    const reflected = converter?.toAttribute
      ? converter.toAttribute(current, options.type)
      : options.type === Boolean
        ? current ? '' : null
        : current ?? null;
    if (reflected !== null && reflected !== undefined) this.requestUpdate(entry.prop, REFLECT_AGAIN);
  }

  // ── Projection-aware child operations ─────────────────────────────────────

  // Frameworks that render children into a host keep calling these on the host
  // with nodes they consider its children. When such a node has been projected
  // into a container (see ProjectionController), forward the call to the node's
  // real parent instead of throwing NotFoundError.

  override insertBefore<T extends Node>(node: T, child: Node | null): T {
    const projection = this[PROJECTION_KEY];
    if (projection && child && child.parentNode !== this && (projection.isProjected(child) || projection.isWrapEnd(child))) {
      return projection.insertBefore(node, child);
    }
    if (projection && !child && projection.append(node)) return node;
    return super.insertBefore(node, child);
  }

  override removeChild<T extends Node>(child: T): T {
    const projection = this[PROJECTION_KEY];
    if (projection && child.parentNode !== this && projection.isProjected(child)) {
      return child.parentNode!.removeChild(child);
    }
    return super.removeChild(child);
  }

  override replaceChild<T extends Node>(node: Node, child: T): T {
    const projection = this[PROJECTION_KEY];
    if (projection && child.parentNode !== this && projection.isProjected(child)) {
      projection.insertBefore(node, child);
      return child.parentNode!.removeChild(child);
    }
    return super.replaceChild(node, child);
  }

  // Setting textContent or calling replaceChildren on a rendered host replaces the
  // consumer's content only (React and Vue set textContent for text-only children,
  // Solid clears with textContent = ''); the rendered chrome stays. Reading
  // textContent is unchanged.

  override get textContent(): string {
    return super.textContent ?? '';
  }

  override set textContent(value: string | null) {
    const projection = this[PROJECTION_KEY];
    const text = value === null || value === undefined ? '' : String(value);
    const nodes = text ? [this.ownerDocument.createTextNode(text)] : [];
    if (!projection || !projection.replaceContent(nodes)) {
      super.textContent = value;
    }
  }

  override replaceChildren(...nodes: (Node | string)[]): void {
    const projection = this[PROJECTION_KEY];
    if (projection) {
      const flat: Node[] = [];
      for (const n of nodes) {
        if (typeof n === 'string') flat.push(this.ownerDocument.createTextNode(n));
        else if (n.nodeType === Node.DOCUMENT_FRAGMENT_NODE) flat.push(...Array.from(n.childNodes));
        else flat.push(n);
      }
      // Validate before touching existing content, as the DOM spec does.
      for (const n of flat) {
        if (n.nodeType === Node.DOCUMENT_NODE || n.nodeType === Node.DOCUMENT_TYPE_NODE || n.contains(this)) {
          throw new DOMException(
            `Failed to execute 'replaceChildren' on '${this.localName}': the new child cannot be inserted here.`,
            'HierarchyRequestError'
          );
        }
      }
      if (projection.replaceContent(flat)) return;
    }
    super.replaceChildren(...nodes);
  }

  // ── Morph hooks ───────────────────────────────────────────────────────────

  /**
   * Supported pre-morph hook for server-driven DOM morphing (Turbo / idiomorph,
   * Livewire / Alpine morph, LiveView / morphdom). The Void UI adapters call it on
   * every `void-*` element right before the morph compares it with the server's
   * version (`turbo:before-morph-element`, Livewire's `morph.updating`, LiveView's
   * `dom.onBeforeElUpdated`); call it yourself when driving a morph by hand.
   *
   * - `incoming` is the server's version of this element, when the morpher
   *   exposes it. For every reflected property, an attribute the server changed
   *   since its last render (compared with what this element recorded) is left
   *   as the server sends it, so the server wins; every other reflected
   *   attribute is made to match the live element, so the morph keeps the
   *   client's state (a toggle the user pressed, a dialog the user opened, the
   *   defaults Lit reflected). Attributes the component manages on its host
   *   (`role`, `tabindex`, `aria-*` set with {@link setHostAttribute}, owned
   *   style custom properties) are copied onto it where the server markup does
   *   not set them. {@link VoidElement.clientState} the server overrode is
   *   discarded, and {@link morphedCallback} runs once the morph has finished.
   *   The adapters call this hook only for the server's version of an element.
   *   `incoming` may also be a detached copy of a rendered element (LiveView
   *   morphs the live element to a clone it patched while the element was
   *   locked): its copied chrome is dropped, its consumer content lifted back
   *   onto it, and it is treated as carrying no server change.
   * - The rendered chrome is taken out of the element and parked, and consumer
   *   children are moved out of the rendered wrappers back onto the element in
   *   their original order, so the element looks like its server markup and the
   *   morph diffs like with like. Nothing is destroyed: on re-projection the same
   *   nodes go back, so native inputs keep their identity, typed text, focus and
   *   selection (where `Element.moveBefore` exists, parked nodes wait in one hidden
   *   `<void-projection-park>` under `<html>` and stay connected; elsewhere focus
   *   is restored after the move). Properties are untouched.
   *
   * The element re-projects on its own in a microtask, so the morph must run
   * synchronously after this call (Turbo, idiomorph, morphdom and Livewire all
   * do); otherwise call {@link voidAfterMorph} once it has finished.
   *
   * Re-entrant: a second call before the element has re-projected (two morphs
   * in one task, as LiveView runs a patch and the patch that undoes a lock)
   * applies the state rule to the new `incoming` and leaves the element parked.
   *
   * Returns true if the element is parked (now or by an earlier call that has
   * not re-projected yet), false if it has nothing to park (the component
   * renders nothing of its own or has not rendered yet). Safe to call on any
   * element, any number of times.
   */
  voidBeforeMorph(incoming?: Element | null): boolean {
    if (incoming && incoming !== this) {
      // morphdom can hand over a server element that has already connected and
      // rendered (it inserted a new subtree, then swapped a keyed live element
      // back in): put it back into its server shape too, so the morph compares
      // server markup on both sides.
      if (incoming instanceof VoidElement) incoming[PROJECTION_KEY]?.unproject();
      // Or a detached copy of a rendered element (LiveView patches a clone of
      // a locked element, then morphs the live element to that clone): lift
      // its consumer content out of the copied chrome and drop the chrome.
      // Explicit parts have no chrome: a copy shows itself by the ids its parts' controller generated.
      const copy = !!projectionApi.current?.strip(incoming) || (this[MORPH_PARTICIPANTS] ?? []).some(p => p.isCopy?.(incoming));
      // The server stopped naming the host: the moved name goes as well.
      const label = this.#hostLabel;
      if (label) {
        for (const name of ['aria-label', 'aria-labelledby'] as const) {
          if (label[name] !== null && !incoming.hasAttribute(name)) label[name] = null;
        }
        this.#applyHostLabel();
      }
      // The same incoming element twice (two adapters or listeners on one
      // morph, as `VoidTurbo.start()` called twice): the second call must not
      // compare it with the baseline the first one recorded from it, which
      // would read every server change as "unchanged" and undo it.
      if (reconciled.get(incoming) !== this) {
        reconciled.set(incoming, this);
        // Explicit parts (parts.ts): what the component wrote on its parts goes onto theirs.
        for (const p of this[MORPH_PARTICIPANTS] ?? []) p.voidBeforeMorph(incoming);
        this.#reconcileIncoming(incoming, copy);
      }
      this.#carryOwnedAttributes(incoming);
    }
    // This element is itself such a copy, being morphed while detached.
    if (!this.isConnected) projectionApi.current?.strip(this);
    const projection = this[PROJECTION_KEY];
    if (!projection) return false;
    // Re-entrant: a second morph before re-projection (LiveView applies a
    // patch and the patch that undoes a lock in one task) finds the element
    // still in its server shape, which is what it needs.
    return projection.parked || projection.unproject();
  }

  /**
   * Supported check for adapters whose morpher can leave an element out (Turbo:
   * cancelling `turbo:before-morph-element`; Livewire: `skip()`): returns true
   * when `incoming`, the server's version of this element, is identical
   * (attributes and content) to the server's previous render of it. Under the
   * state rule such a morph would change nothing the server controls and keep
   * everything else, so the element and its subtree can be skipped, which
   * makes a morph of an unchanged page close to free. Otherwise it records
   * `incoming` as the server's markup and returns false; call
   * {@link voidBeforeMorph} next. Call it before anything modifies `incoming`.
   */
  voidUnchanged(incoming: Element): boolean {
    const html = incoming.outerHTML;
    if (html === this.#serverHTML && !this[PROJECTION_KEY]?.parked) return true;
    this.#serverHTML = html;
    return false;
  }

  /**
   * Re-projects after {@link voidBeforeMorph} without waiting for the scheduled
   * update. Resolves once the element has rendered. A no-op for elements that are
   * not parked.
   */
  voidAfterMorph(): Promise<boolean> {
    return this[PROJECTION_KEY]?.reproject() ?? this.updateComplete;
  }

  /**
   * The server-baseline-versus-incoming rule, for every reflected property of
   * the class: an attribute the server changed since its last render is left as
   * the server sends it (the server wins); every other reflected attribute is
   * made to match the live element, so the morph leaves the client's state
   * alone. The incoming values become the new baseline. Touches only the
   * attributes the two elements carry, so an element whose server markup did
   * not change costs a few attribute reads.
   */
  #reconcileIncoming(incoming: Element, copy = false): void {
    const meta = morphMeta(this);
    const before = this.#server ?? null;
    // A rendered incoming element carries what it reflected itself; what it
    // recorded on connecting (or from the server markup it was morphed to) is
    // the server's markup. A copy of a rendered element that never saw server
    // markup carries client state only: it changes nothing the server owns.
    const now =
      incoming instanceof VoidElement && incoming.#server !== undefined
        ? incoming.#server
        : copy
          ? before
          : this.#readServer(incoming);
    let changed: Set<string> | null = null;
    if (before) for (const [name, value] of before) if (now?.get(name) !== value) (changed ??= new Set()).add(name);
    if (now) for (const [name, value] of now) if (before?.get(name) !== value) (changed ??= new Set()).add(name);
    // The new baseline is what the server sent, before the client's values are copied in.
    if (changed) this.#server = now;
    if (changed && meta.edits.length && this.#editing()) {
      // The user is typing here: the server's value of what they edit waits.
      for (const name of meta.edits) {
        if (!changed.delete(name)) continue;
        const live = this.getAttribute(name);
        if (live === null) incoming.removeAttribute(name);
        else if (incoming.getAttribute(name) !== live) incoming.setAttribute(name, live);
      }
      if (!changed.size) changed = null;
    }
    // Reflected attributes of the live element that the incoming markup must carry too...
    const list = this.attributes;
    for (let i = 0; i < list.length; i++) {
      const a = list[i]!;
      if (meta.attrs.get(a.name) !== true || changed?.has(a.name)) continue;
      if (incoming.getAttribute(a.name) !== a.value) incoming.setAttribute(a.name, a.value);
    }
    // ...and ones the server still renders that the client removed (a dialog the user closed),
    // or that a rendered incoming element reflected itself.
    if (incoming instanceof VoidElement) {
      const theirs = incoming.attributes;
      for (let i = theirs.length - 1; i >= 0; i--) {
        const name = theirs[i]!.name;
        if (meta.attrs.get(name) === true && !now?.has(name) && !this.hasAttribute(name)) incoming.removeAttribute(name);
      }
    }
    if (now) {
      for (const name of now.keys()) {
        if (meta.attrs.get(name) === true && !changed?.has(name) && !this.hasAttribute(name)) incoming.removeAttribute(name);
      }
    }
    if (changed && meta.drafts.length) {
      const self = this as unknown as Record<PropertyKey, unknown>;
      for (const [prop, attr] of meta.drafts) {
        if (attr !== null && changed.has(attr) && self[prop] != null) {
          self[prop] = null;
          this.requestUpdate();
        }
      }
    }
    if (changed) for (const name of changed) (this.#serverChanged ??= new Set()).add(name);
    if ((meta.hook || this.#serverChanged) && !this.#morphQueued) {
      this.#morphQueued = true;
      // After the (synchronous) morph and the updates it caused.
      queueMicrotask(() => {
        void this.updateComplete.then(() => {
          this.#morphQueued = false;
          const names = this.#serverChanged;
          this.#serverChanged = null;
          if (!this.isConnected) return;
          if (names) this.serverChangedCallback(names);
          if (meta.hook) this.morphedCallback();
        });
      });
    }
  }

  /** Focus is inside this element, or parked from inside it by a morph. */
  #editing(): boolean {
    const active = this.ownerDocument.activeElement;
    return (!!active && active !== this && this.contains(active)) || !!projectionApi.current?.isFocusParked(this);
  }

  /**
   * Called after a server-driven morph that changed some of this element's
   * property-backed attributes (`names`), once the element has applied them.
   * Form controls take the server's new value as their reset default here, as
   * a native input's defaultValue follows its value attribute.
   */
  protected serverChangedCallback(names: ReadonlySet<string>): void {
    void names;
  }

  /**
   * Called once a server-driven morph of this element has finished, after the
   * updates it caused. Components whose state lives in their children (a group
   * that marks its pressed toggle or checked item) re-apply it here: the morph
   * may have replaced children or added ones that do not carry it yet.
   */
  protected morphedCallback(): void {}

  #carryOwnedAttributes(incoming: Element): void {
    if (this.#ownAttrs) {
      // Attributes a rendered incoming element wrote on itself are not the server's.
      const theirs = incoming instanceof VoidElement ? incoming.#ownAttrs : null;
      for (const [name, value] of this.#ownAttrs) {
        if (value === null) continue;
        const sent = incoming.getAttribute(name);
        if (sent === null || (theirs?.has(name) && theirs.get(name) === sent)) {
          if (sent !== value) incoming.setAttribute(name, value);
        }
      }
    }
    if (this.#ownStyle?.size && 'style' in incoming) {
      const style = (incoming as HTMLElement).style;
      for (const [property, value] of this.#ownStyle) {
        if (!style.getPropertyValue(property)) style.setProperty(property, value);
      }
    }
  }
}
