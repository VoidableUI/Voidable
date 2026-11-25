import { LitElement, type PropertyDeclaration, type PropertyValues } from 'lit';
import { PROJECTION_KEY, ProjectionController } from './projection.js';

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
    // A custom converter decides what an absent attribute means (gauge's
    // tick-min: removing it turns the tick off); only Lit's default conversion
    // is treated as "not set, use the default".
    const custom = typeof options.converter === 'function' || !!options.converter?.fromAttribute;
    map.set(attr, { prop, value: probe[prop], custom, options });
  }
  return map;
}

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
 *   them. Attributes of reflected properties are not owned: they follow the server
 *   (a removed reflected attribute resets its property to the class default).
 */
export class VoidElement extends LitElement {
  /** @internal The element's projection controller (see ProjectionController). */
  declare [PROJECTION_KEY]?: ProjectionController;

  /** Owned host attributes: last value this component wrote (null = it removed it). */
  #ownAttrs: Map<string, string | null> | null = null;
  /** Owned custom properties on the host's inline style. */
  #ownStyle: Map<string, string> | null = null;
  #repairQueued = false;
  #inUpdate = false;

  constructor() {
    super();
    // Components without a template of their own (Lit's default render returns
    // noChange) never render chrome and need no markers.
    const ownRender = (this as unknown as { render: unknown }).render;
    if (ownRender !== (LitElement.prototype as unknown as { render: unknown }).render) new ProjectionController(this);
  }

  createRenderRoot(): this {
    return this;
  }

  protected override shouldUpdate(changed: PropertyValues): boolean {
    return !(this as Record<PropertyKey, unknown>)[DEFAULTS_PROBE] && super.shouldUpdate(changed);
  }

  protected override update(changed: PropertyValues): void {
    this.#inUpdate = true;
    try {
      super.update(changed);
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
    (this.#ownAttrs ??= new Map()).set(name, next);
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
        if (value !== null && !this.hasAttribute(name)) super.setAttribute(name, value);
      }
    }
    if (this.#ownStyle) {
      for (const [property, value] of this.#ownStyle) {
        if (this.style.getPropertyValue(property) !== value) this.style.setProperty(property, value);
      }
    }
  }

  override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
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
    if (projection && child && child.parentNode !== this && projection.isProjected(child)) {
      return projection.insertBefore(node, child);
    }
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
   *   exposes it. Attributes the component manages on its host (`role`,
   *   `tabindex`, `aria-*` set with {@link setHostAttribute}, owned style custom
   *   properties) and reflected properties still at their default are copied onto
   *   it where the server markup does not set them, so the morph leaves them
   *   alone. Anything the server markup does set follows the server.
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
   * Returns true if chrome was parked, false if there was none (the component
   * renders nothing of its own, has not rendered yet, or is already parked). Safe
   * to call on any element, any number of times.
   */
  voidBeforeMorph(incoming?: Element | null): boolean {
    if (incoming && incoming !== this) this.#carryOwnedAttributes(incoming);
    return this[PROJECTION_KEY]?.unproject() ?? false;
  }

  /**
   * Re-projects after {@link voidBeforeMorph} without waiting for the scheduled
   * update. Resolves once the element has rendered. A no-op for elements that are
   * not parked.
   */
  voidAfterMorph(): Promise<boolean> {
    return this[PROJECTION_KEY]?.reproject() ?? this.updateComplete;
  }

  #carryOwnedAttributes(incoming: Element): void {
    if (this.#ownAttrs) {
      for (const [name, value] of this.#ownAttrs) {
        if (value !== null && !incoming.hasAttribute(name)) incoming.setAttribute(name, value);
      }
    }
    if (this.#ownStyle?.size && 'style' in incoming) {
      const style = (incoming as HTMLElement).style;
      for (const [property, value] of this.#ownStyle) {
        if (!style.getPropertyValue(property)) style.setProperty(property, value);
      }
    }
    const self = this as unknown as Record<PropertyKey, unknown>;
    for (const [attr, { prop, value }] of reflectedDefaults(this)) {
      if (incoming.hasAttribute(attr) || self[prop] !== value) continue;
      const current = this.getAttribute(attr);
      if (current !== null) incoming.setAttribute(attr, current);
    }
  }
}
