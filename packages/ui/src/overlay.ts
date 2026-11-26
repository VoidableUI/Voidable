import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { projectionApi } from './projection-api.js';

/**
 * The shared overlay model behind every Void UI component that opens something
 * on top of the page: dialog, drawer, popover, hover-card, dropdown-menu,
 * tooltip, the combobox / multiselect / date-picker panels and the toast
 * container.
 *
 * The platform does the heavy lifting:
 *
 * - **Modal** overlays (dialog, drawer) render a native `<dialog>` opened with
 *   `showModal()`: top layer, `::backdrop`, an inert page behind it (so Tab and
 *   assistive technology cannot reach it) and focus kept inside.
 * - **Non-modal** overlays render a `popover="manual"` element shown with
 *   `showPopover()`: top layer, so no `overflow`, `transform` or `z-index` of an
 *   ancestor can clip or bury it, and `display: none` (nothing visible,
 *   focusable or exposed) while closed.
 * - **Placement** uses CSS anchor positioning (`position-anchor`,
 *   `position-area`, `position-try-fallbacks`), where the browser supports it.
 *   Elsewhere, and whenever the CSS result would still overflow the viewport, a
 *   small JavaScript positioner places the overlay with flipping and clamping.
 *
 * What the platform does not decide is shared here, once per document:
 *
 * - **One stack.** Escape and outside pointer presses close only the topmost
 *   overlay, whatever the engine's own close-request rules are, and an overlay
 *   that is not closable (`hide-close`) swallows them. Overlays nest
 *   (a select inside a popover inside a dialog inside a drawer); closing one
 *   closes the overlays opened inside it.
 * - **Counted scroll lock** while any modal is open.
 * - **Focus**: moved in on open (modal always; non-modal when opened by the
 *   user), returned to the opener on close, with fallbacks when the opener was
 *   removed or hidden meanwhile.
 * - **Trigger ARIA**: `aria-haspopup`, `aria-expanded` and `aria-controls`.
 * - **Events**: `void-open` and `void-close` with `detail.reason`; `void-close`
 *   is cancelable when the user caused it. Like the native `toggle` and `close`
 *   events they do not bubble, so a tooltip or select closing inside a dialog is
 *   never mistaken for the dialog closing.
 * - **Morph resilience**: if the surface was taken out of the document and put
 *   back (a morph without `Element.moveBefore`), or rebuilt by recovery, an open
 *   overlay is shown again with focus kept where it was.
 *
 * Document listeners exist only while at least one overlay is open, and all
 * shared state lives on the document (not in module scope).
 */

export type OverlayKind = 'modal' | 'dialog' | 'menu' | 'listbox' | 'tooltip' | 'hover';
/** Why an overlay closed. All but `api` and `parent` come from the user and make `void-close` cancelable. */
export type OverlayCloseReason =
  | 'escape'
  | 'outside'
  | 'blur'
  | 'trigger'
  | 'close-button'
  | 'select'
  | 'hover'
  | 'form'
  | 'parent'
  | 'api';
/** Why an overlay opened. */
export type OverlayOpenReason = 'trigger' | 'keyboard' | 'hover' | 'focus' | 'api';
export type OverlaySide = 'top' | 'bottom' | 'left' | 'right';
export type OverlayAlign = 'start' | 'center' | 'end';

export interface OverlayCloseDetail {
  reason: OverlayCloseReason;
}
export interface OverlayOpenDetail {
  reason: OverlayOpenReason;
}

export interface OverlayOptions {
  kind: OverlayKind;
  /** The rendered `<dialog>` (modal) or `popover` element (everything else). */
  surface: () => HTMLElement | null | undefined;
  /** The component's open state (usually its `open` property). */
  isOpen: () => boolean;
  /** Changes the component's open state; the controller reacts in the next update. */
  setOpen: (open: boolean) => void;
  /** The element that opens the overlay: gets trigger ARIA, counts as inside, receives focus as a fallback. */
  trigger?: () => HTMLElement | null | undefined;
  /** `aria-haspopup` value written on the trigger. Omit to leave the trigger's ARIA alone. */
  haspopup?: 'dialog' | 'menu' | 'listbox';
  /** The element the overlay is placed against. Omit for overlays that are not anchored. */
  anchor?: () => Element | null | undefined;
  /**
   * Writes a style property on the host (the component's `setHostStyle`), used
   * when the anchor is the host itself so the anchor name survives morphs.
   */
  hostStyle?: (property: string, value: string | null) => void;
  placement?: () => { side: OverlaySide; align: OverlayAlign };
  /** Whether Escape, outside presses and the close button may close it (default: always). */
  closable?: () => boolean;
  /**
   * What receives focus when the overlay opens. Return `null` to use the default
   * for the kind, `false` to leave focus where it is.
   */
  initialFocus?: (reason: OverlayOpenReason) => HTMLElement | null | false;
  /**
   * Writes (`null` removes) an attribute the controller manages on an element
   * the author wrote (trigger ARIA on the trigger's control, placement
   * attributes on a content part). Components with explicit parts pass their
   * PartsController's `set`, so the attributes survive morphs. Default: plain
   * `setAttribute` / `removeAttribute`.
   */
  attr?: (el: Element, name: string, value: string | null) => void;
  /** Same as `attr` for inline style properties (anchor names, positioner coordinates). */
  style?: (el: HTMLElement, property: string, value: string | null) => void;
}

/** Same as a native `<dialog>`'s `cancel`: not cancelable for programmatic changes. */
const USER_REASONS = new Set<OverlayCloseReason>(['escape', 'outside', 'blur', 'trigger', 'close-button', 'select', 'hover']);
/** Overlays that come and go with the pointer or focus and never take outside presses. */
const TRANSIENT = new Set<OverlayKind>(['tooltip', 'hover']);

const TABBABLE =
  'a[href], area[href], button, input, select, textarea, iframe, summary, audio[controls], video[controls], [contenteditable]:not([contenteditable="false"]), [tabindex]';

/** Whether the element can receive focus by Tab right now. */
export function isTabbable(el: Element): el is HTMLElement {
  const h = el as HTMLElement;
  if (typeof h.focus !== 'function' || h.tabIndex < 0) return false;
  if ((h as HTMLButtonElement).disabled) return false;
  if (h.closest('[inert]')) return false;
  if (h.localName === 'input' && (h as HTMLInputElement).type === 'hidden') return false;
  return isRendered(h);
}

function isRendered(el: Element): boolean {
  if (el.closest('[hidden]')) return false;
  const check = (el as Element & { checkVisibility?: (o?: object) => boolean }).checkVisibility;
  if (typeof check === 'function') return check.call(el, { visibilityProperty: true });
  return true;
}

/** Tabbable elements inside `root`, in document order. */
export function tabbables(root: Element): HTMLElement[] {
  return Array.from(root.querySelectorAll(TABBABLE)).filter(isTabbable);
}

function canFocus(el: Element | null | undefined): boolean {
  if (!el || !el.isConnected || typeof (el as HTMLElement).focus !== 'function') return false;
  const h = el as HTMLElement;
  if ((h as HTMLButtonElement).disabled || h.closest('[inert]')) return false;
  if (h !== h.ownerDocument.body && h.tabIndex < 0 && !h.hasAttribute('tabindex')) return false;
  return isRendered(h);
}

function matchesSafe(el: Element, selector: string): boolean | null {
  try {
    return el.matches(selector);
  } catch {
    return null;
  }
}

const supportsPopover = (el: HTMLElement): boolean => typeof el.showPopover === 'function';

const plainAttr = (el: Element, name: string, value: string | null): void => {
  if (value === null) {
    if (el.hasAttribute(name)) el.removeAttribute(name);
  } else if (el.getAttribute(name) !== value) {
    el.setAttribute(name, value);
  }
};

const plainStyle = (el: HTMLElement, property: string, value: string | null): void => {
  if (value === null) el.style.removeProperty(property);
  else if (el.style.getPropertyValue(property) !== value) el.style.setProperty(property, value);
};

/** Whether the surface is currently shown the way the controller shows it. */
function isShown(surface: HTMLElement, modal: boolean): boolean {
  if (modal) {
    const dialog = surface as HTMLDialogElement;
    if (!dialog.open) return false;
    // Every engine with the Popover API also has :modal (it shipped first);
    // without either (test DOMs), an open dialog counts as shown.
    return supportsPopover(dialog) ? (matchesSafe(dialog, ':modal') ?? true) : true;
  }
  if (supportsPopover(surface)) return matchesSafe(surface, ':popover-open') ?? !surface.hidden;
  return !surface.hidden;
}

/** Overrides for feature detection, set by tests and probes on the document. */
const FORCE_KEY = Symbol.for('@voidable/ui:overlay-force-fallback');

/** CSS anchor positioning with flip fallbacks, as the positioner needs it. */
function supportsAnchoring(doc: Document): boolean {
  if ((doc as unknown as Record<symbol, unknown>)[FORCE_KEY]) return false;
  const css = doc.defaultView?.CSS;
  if (!css?.supports) return false;
  return (
    css.supports('anchor-name: --void-a') &&
    css.supports('position-area: block-end span-inline-end') &&
    css.supports('position-try-fallbacks: flip-block')
  );
}

/** A unique id for generated `id`s and anchor names (random: no module state, safe across library copies). */
function nextId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

// ── Per-document registry ───────────────────────────────────────────────────

const REGISTRY_KEY = Symbol.for('@voidable/ui:overlays');
type RegistryDocument = Document & { [REGISTRY_KEY]?: OverlayRegistry };

/** Saved inline styles of the root element while scroll is locked. */
interface ScrollLock {
  overflow: string;
  overflowPriority: string;
  gutter: string;
  gutterPriority: string;
}

class OverlayRegistry {
  readonly stack: OverlayController[] = [];
  private _locks = 0;
  private _saved: ScrollLock | null = null;
  private _listening = false;
  private _positioned = new Set<OverlayController>();
  private _frame = 0;
  private _resize: ResizeObserver | null = null;

  constructor(private readonly _doc: Document) {}

  static of(doc: Document): OverlayRegistry {
    const d = doc as RegistryDocument;
    return (d[REGISTRY_KEY] ??= new OverlayRegistry(doc));
  }

  push(c: OverlayController): void {
    this.remove(c, false);
    this.stack.push(c);
    this._listen();
  }

  remove(c: OverlayController, cleanup = true): void {
    const i = this.stack.indexOf(c);
    if (i >= 0) this.stack.splice(i, 1);
    this.unposition(c);
    if (cleanup && !this.stack.length) this._unlisten();
  }

  top(filter: (c: OverlayController) => boolean = () => true): OverlayController | undefined {
    for (let i = this.stack.length - 1; i >= 0; i--) if (filter(this.stack[i])) return this.stack[i];
    return undefined;
  }

  /** Overlays above `c` in the stack whose host is inside `c`'s host (opened inside it). */
  nestedIn(c: OverlayController): OverlayController[] {
    const i = this.stack.indexOf(c);
    if (i < 0) return [];
    return this.stack.slice(i + 1).filter(o => o !== c && c.host.contains(o.host));
  }

  get locked(): number {
    return this._locks;
  }

  lock(): void {
    if (this._locks++ > 0) return;
    const root = this._doc.documentElement;
    const win = this._doc.defaultView;
    const style = root.style;
    this._saved = {
      overflow: style.getPropertyValue('overflow'),
      overflowPriority: style.getPropertyPriority('overflow'),
      gutter: style.getPropertyValue('scrollbar-gutter'),
      gutterPriority: style.getPropertyPriority('scrollbar-gutter'),
    };
    // Keep the scrollbar's space so the page does not shift sideways.
    if (win && win.innerWidth > root.clientWidth) style.setProperty('scrollbar-gutter', 'stable');
    style.setProperty('overflow', 'hidden');
  }

  unlock(): void {
    if (this._locks === 0) return;
    if (--this._locks > 0) return;
    const style = this._doc.documentElement.style;
    const saved = this._saved;
    this._saved = null;
    style.removeProperty('overflow');
    style.removeProperty('scrollbar-gutter');
    if (saved?.overflow) style.setProperty('overflow', saved.overflow, saved.overflowPriority);
    if (saved?.gutter) style.setProperty('scrollbar-gutter', saved.gutter, saved.gutterPriority);
  }

  /** Keeps a JavaScript-positioned overlay placed while the page scrolls or resizes. */
  position(c: OverlayController): void {
    this._positioned.add(c);
    const win = this._doc.defaultView;
    if (win && typeof win.ResizeObserver === 'function') {
      this._resize ??= new win.ResizeObserver(() => this._schedule());
      const surface = c.surfaceElement;
      if (surface) this._resize.observe(surface);
      const anchor = c.anchorElement;
      if (anchor) this._resize.observe(anchor);
    }
  }

  unposition(c: OverlayController): void {
    if (!this._positioned.delete(c)) return;
    if (!this._positioned.size) {
      this._resize?.disconnect();
      this._resize = null;
    }
  }

  private _schedule = (): void => {
    if (this._frame || !this._positioned.size) return;
    const win = this._doc.defaultView;
    if (!win) return;
    this._frame = win.requestAnimationFrame(() => {
      this._frame = 0;
      for (const c of this._positioned) c.reposition();
    });
  };

  private _listen(): void {
    if (this._listening) return;
    this._listening = true;
    const doc = this._doc;
    doc.addEventListener('keydown', this._onKeydown);
    doc.addEventListener('pointerdown', this._onPointerdown, true);
    doc.addEventListener('focusin', this._onFocusin);
    doc.addEventListener('scroll', this._schedule, { capture: true, passive: true });
    doc.defaultView?.addEventListener('resize', this._schedule);
  }

  private _unlisten(): void {
    if (!this._listening) return;
    this._listening = false;
    const doc = this._doc;
    doc.removeEventListener('keydown', this._onKeydown);
    doc.removeEventListener('pointerdown', this._onPointerdown, true);
    doc.removeEventListener('focusin', this._onFocusin);
    doc.removeEventListener('scroll', this._schedule, { capture: true });
    doc.defaultView?.removeEventListener('resize', this._schedule);
    if (this._frame) doc.defaultView?.cancelAnimationFrame(this._frame);
    this._frame = 0;
    this._resize?.disconnect();
    this._resize = null;
    this._positioned.clear();
  }

  /** Escape closes the topmost overlay only; a non-closable one swallows it. */
  private _onKeydown = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape' || e.defaultPrevented || e.isComposing) return;
    const top = this.top();
    if (!top) return;
    // Handled here for every engine: the native dialog's own close request
    // (which may not be cancelable a second time) must not run as well.
    e.preventDefault();
    top.requestClose('escape');
  };

  /** A press outside the topmost (non-transient) overlay closes it, and only it. */
  private _onPointerdown = (e: PointerEvent): void => {
    if (e.button !== undefined && e.button > 0) return;
    const top = this.top(c => !TRANSIENT.has(c.kind));
    if (!top || top.containsEvent(e)) return;
    if (top.requestClose('outside') && top.kind === 'modal') {
      // The press landed on the backdrop: keep the browser from moving focus to
      // the (now closing) dialog, which would undo the return to the opener.
      const doc = this._doc;
      const stop = (m: Event) => m.preventDefault();
      doc.addEventListener('mousedown', stop, { capture: true, once: true });
      doc.defaultView?.setTimeout(() => doc.removeEventListener('mousedown', stop, { capture: true }), 0);
    }
  };

  /** Focus moving out of non-modal overlays closes them (down to the one that holds focus). */
  private _onFocusin = (e: FocusEvent): void => {
    const target = e.target as Node | null;
    if (!target || target === this._doc || target === this._doc.body) return;
    for (let i = this.stack.length - 1; i >= 0; i--) {
      const c = this.stack[i];
      // Tooltips and hover cards follow focus on their own (and may already
      // have opened for this very focus change).
      if (TRANSIENT.has(c.kind)) continue;
      // Inside it, or on an element around it (a click on non-focusable content
      // focuses the nearest focusable ancestor, such as the enclosing dialog).
      if (c.host.contains(target) || target.contains(c.host)) return;
      if (c.kind === 'modal') return;
      c.requestClose('blur');
    }
  };
}

/** The controller of the nearest overlay host around `node`, if any. */
const CONTROLLER_KEY = Symbol.for('@voidable/ui:overlay-controller');
type ControlledHost = HTMLElement & { [CONTROLLER_KEY]?: OverlayController };

function closestController(node: Node | null): OverlayController | undefined {
  for (let n: Node | null = node; n; n = n.parentNode) {
    const c = (n as ControlledHost)[CONTROLLER_KEY];
    if (c) return c;
  }
  return undefined;
}

function parseLength(value: string, el: Element): number {
  const v = value.trim();
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return 0;
  if (v.endsWith('rem')) return n * (parseFloat(getComputedStyle(el.ownerDocument.documentElement).fontSize) || 16);
  if (v.endsWith('em')) return n * (parseFloat(getComputedStyle(el).fontSize) || 16);
  return n;
}

/**
 * Places a fixed-position box of `size` next to `anchor` inside a viewport of
 * `vw` x `vh`, flipping to the opposite side and the opposite alignment when
 * the preferred one does not fit, and finally clamping it into the viewport.
 * Exported for tests.
 */
export function placeOverlay(
  anchor: { left: number; top: number; right: number; bottom: number },
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  side: OverlaySide,
  align: OverlayAlign,
  gap: number,
  rtl = false
): { x: number; y: number; side: OverlaySide; align: OverlayAlign } {
  const vertical = side === 'top' || side === 'bottom';
  const edge = gap;
  const along = (s: OverlaySide): number =>
    s === 'bottom' ? anchor.bottom + gap : s === 'top' ? anchor.top - gap - size.height : s === 'right' ? anchor.right + gap : anchor.left - gap - size.width;
  const fitsAlong = (s: OverlaySide, v: number): boolean =>
    s === 'bottom' || s === 'top' ? v >= edge && v + size.height <= viewport.height - edge : v >= edge && v + size.width <= viewport.width - edge;
  const opposite: Record<OverlaySide, OverlaySide> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
  let finalSide = side;
  let main = along(side);
  if (!fitsAlong(side, main)) {
    const flipped = along(opposite[side]);
    if (fitsAlong(opposite[side], flipped)) {
      finalSide = opposite[side];
      main = flipped;
    }
  }
  const physical = (a: OverlayAlign): OverlayAlign => (vertical && rtl ? (a === 'start' ? 'end' : a === 'end' ? 'start' : a) : a);
  const cross = (a: OverlayAlign): number => {
    const p = physical(a);
    if (vertical) {
      return p === 'start' ? anchor.left : p === 'end' ? anchor.right - size.width : (anchor.left + anchor.right) / 2 - size.width / 2;
    }
    return p === 'start' ? anchor.top : p === 'end' ? anchor.bottom - size.height : (anchor.top + anchor.bottom) / 2 - size.height / 2;
  };
  const limit = vertical ? viewport.width : viewport.height;
  const extent = vertical ? size.width : size.height;
  const fitsCross = (v: number): boolean => v >= edge && v + extent <= limit - edge;
  let finalAlign = align;
  let c = cross(align);
  if (!fitsCross(c) && align !== 'center') {
    const other: OverlayAlign = align === 'start' ? 'end' : 'start';
    if (fitsCross(cross(other))) {
      finalAlign = other;
      c = cross(other);
    }
  }
  const clamp = (v: number, size_: number, max: number): number => Math.max(edge, Math.min(v, max - size_ - edge));
  let x = vertical ? c : main;
  let y = vertical ? main : c;
  x = clamp(x, size.width, viewport.width);
  y = clamp(y, size.height, viewport.height);
  return { x: Math.round(x), y: Math.round(y), side: finalSide, align: finalAlign };
}

// ── Controller ──────────────────────────────────────────────────────────────

type Host = ReactiveControllerHost & HTMLElement;

/**
 * @internal Drives one overlay of a component. Create it in a field initializer
 * after the component's ProjectionController, so it runs after projection on
 * every update.
 */
export class OverlayController implements ReactiveController {
  readonly host: Host;
  readonly kind: OverlayKind;
  private readonly _o: OverlayOptions;
  private readonly _modal: boolean;
  /** Open as far as the controller is concerned: in the stack, shown, listeners attached. */
  private _active = false;
  private _surface: HTMLElement | null = null;
  private _opener: HTMLElement | null = null;
  private _openerId = '';
  private _openReason: OverlayOpenReason = 'api';
  /** Set when a close was announced (void-close dispatched) before the state changed. */
  private _closeReason: OverlayCloseReason | null = null;
  private _formClosing = false;
  private _ariaTrigger: HTMLElement | null = null;
  private _anchorName = '';
  private _anchorEl: Element | null = null;
  private _mode: 'anchor' | 'fixed' | null = null;
  private _locked = false;
  private _checkFrame = 0;
  private _reshowing = false;
  /** Focus was inside the surface at some point while open. */
  private _hadFocus = false;
  private readonly _attr: (el: Element, name: string, value: string | null) => void;
  private readonly _css: (el: HTMLElement, property: string, value: string | null) => void;

  constructor(host: ReactiveControllerHost & HTMLElement, options: OverlayOptions) {
    this.host = host;
    this.kind = options.kind;
    this._o = options;
    this._modal = options.kind === 'modal';
    this._attr = options.attr ?? plainAttr;
    this._css = options.style ?? plainStyle;
    (host as ControlledHost)[CONTROLLER_KEY] = this;
    host.addController(this);
  }

  /** Whether the overlay is open and shown. */
  get active(): boolean {
    return this._active;
  }

  get surfaceElement(): HTMLElement | null {
    return this._surface;
  }

  get anchorElement(): Element | null {
    return this._anchorEl;
  }

  private get _registry(): OverlayRegistry {
    return OverlayRegistry.of(this.host.ownerDocument);
  }

  // ── Requests from the component ──

  /** Opens because of the user (`trigger`, `keyboard`, `hover`, `focus`) or code (`api`). */
  requestOpen(reason: OverlayOpenReason = 'api'): void {
    if (this._o.isOpen()) return;
    this._openReason = reason;
    this._o.setOpen(true);
  }

  /**
   * Closes for `reason`, dispatching a `void-close` that the listener may cancel
   * (when the user caused it). Returns false if it stays open. A request while
   * the overlay is already closing is accepted without a second event.
   */
  requestClose(reason: OverlayCloseReason): boolean {
    if (!this._o.isOpen()) return true;
    if ((reason === 'escape' || reason === 'outside' || reason === 'close-button') && this._o.closable && !this._o.closable()) {
      return false;
    }
    const event = new CustomEvent<OverlayCloseDetail>('void-close', {
      bubbles: false,
      cancelable: USER_REASONS.has(reason),
      detail: { reason },
    });
    this.host.dispatchEvent(event);
    if (event.defaultPrevented) return false;
    this._closeReason = reason;
    this._o.setOpen(false);
    return true;
  }

  /** Toggles from the trigger. */
  toggle(reason: OverlayOpenReason = 'trigger'): void {
    if (this._o.isOpen()) this.requestClose('trigger');
    else this.requestOpen(reason);
  }

  /** Whether a pointer event happened inside the overlay (host, trigger or surface, not a modal's backdrop). */
  containsEvent(e: Event): boolean {
    const target = e.composedPath?.()[0] ?? e.target;
    if (!(target instanceof Node) || !this._withinHost(target)) return false;
    const surface = this._surface;
    if (this._modal && surface && target === surface && 'clientX' in e) {
      const r = surface.getBoundingClientRect();
      const { clientX: x, clientY: y } = e as MouseEvent;
      if (r.width && r.height && (x < r.left || x > r.right || y < r.top || y > r.bottom)) return false;
    }
    return true;
  }

  /** `node` is the host, inside it, or inside its shadow root (the internal `<dialog>` of a modal). */
  private _withinHost(node: Node): boolean {
    return this.host.contains(node) || !!this.host.shadowRoot?.contains(node);
  }

  /**
   * `node` is inside the surface. A surface in the host's shadow root (a modal's
   * internal `<dialog>`) shows the host's light-DOM children through its slot,
   * so everything in the host counts as inside it.
   */
  inSurface(node: Node | null | undefined): boolean {
    const surface = this._surface;
    if (!node || !surface) return false;
    if (surface.contains(node)) return true;
    return surface.getRootNode() === this.host.shadowRoot && this._withinHost(node);
  }

  /** Re-runs placement now (JavaScript positioner only). */
  reposition(): void {
    if (this._active && this._mode === 'fixed') this._placeFixed();
  }

  // ── Lifecycle ──

  hostConnected(): void {
    this._sync();
  }

  hostDisconnected(): void {
    // A move (reorder, morph) reconnects in the same task; only a real removal closes.
    queueMicrotask(() => {
      if (!this.host.isConnected && this._active) this._deactivate(true);
    });
  }

  hostUpdated(): void {
    this._sync();
  }

  private _sync(): void {
    const host = this.host;
    if (!host.isConnected) return;
    const surface = this._o.surface() ?? null;
    if (surface && surface !== this._surface) this._adopt(surface);
    const want = this._o.isOpen();
    if (want && surface) {
      if (!this._active) this._activate(surface);
      else if (!isShown(surface, this._modal)) this._reshow(surface);
      this._position();
    } else if (!want && this._active) {
      this._deactivate(true);
    } else if (!want && surface && isShown(surface, this._modal)) {
      this._hide(surface);
    }
    this._syncTriggerAria();
  }

  /** First sight of a (new) surface element: listeners for native closes and the closed state. */
  private _adopt(surface: HTMLElement): void {
    const previous = this._surface;
    if (previous) {
      previous.removeEventListener('cancel', this._onCancel);
      previous.removeEventListener('close', this._onNativeClose);
      previous.removeEventListener('submit', this._onSubmit);
      previous.removeEventListener('toggle', this._onToggle);
      previous.removeEventListener('focusin', this._onSurfaceFocus);
    }
    this._surface = surface;
    // Through the attribute hook, so a component with explicit parts owns the id
    // (it is carried into the server's markup across a morph).
    if (!surface.id) this._attr(surface, 'id', nextId(`${this.host.localName}-overlay`));
    surface.addEventListener('focusin', this._onSurfaceFocus);
    if (this._modal) {
      surface.addEventListener('cancel', this._onCancel);
      surface.addEventListener('close', this._onNativeClose);
      surface.addEventListener('submit', this._onSubmit);
    } else {
      if (!supportsPopover(surface)) {
        this._attr(surface, 'popover', null);
        if (!this._active) surface.hidden = true;
      }
      surface.addEventListener('toggle', this._onToggle);
    }
  }

  private _activate(surface: HTMLElement): void {
    const doc = this.host.ownerDocument;
    const active = doc.activeElement as HTMLElement | null;
    // Hover and tooltip overlays open without focus moving; focus returns to their trigger.
    this._opener = TRANSIENT.has(this.kind) ? (this._o.trigger?.() ?? null) : active && active !== doc.body ? active : null;
    this._openerId = this._opener?.id ?? '';
    this._active = true;
    this._hadFocus = false;
    this._registry.push(this);
    if (this._modal) {
      this._closeNonAncestors();
      this._registry.lock();
      this._locked = true;
    }
    this._show(surface);
    this._position();
    this._syncTriggerAria();
    const reason = this._openReason;
    this._openReason = 'api';
    this._focusInitial(surface, reason);
    this.host.dispatchEvent(
      new CustomEvent<OverlayOpenDetail>('void-open', { bubbles: false, detail: { reason } })
    );
  }

  /** A modal opening closes the non-modal overlays it is not inside, like `showModal()` does for popovers. */
  private _closeNonAncestors(): void {
    for (const c of [...this._registry.stack]) {
      if (c === this || c.kind === 'modal' || c.host.contains(this.host)) continue;
      c.requestClose('parent');
    }
  }

  private _show(surface: HTMLElement): void {
    if (this._modal) {
      const dialog = surface as HTMLDialogElement;
      // Open but no longer modal (it was taken out of the document and put back):
      // close silently and show it again as a modal.
      if (dialog.open && !isShown(dialog, true)) {
        this._reshowing = true;
        try {
          dialog.close();
        } finally {
          this._reshowing = false;
        }
      }
      if (!dialog.open && typeof dialog.showModal === 'function') {
        try {
          dialog.showModal();
        } catch {
          dialog.setAttribute('open', '');
        }
      }
      return;
    }
    if (supportsPopover(surface)) {
      try {
        if (!matchesSafe(surface, ':popover-open')) {
          surface.showPopover();
          this._watchFade(surface);
          // Shown again after a morph took it out of the document: the item
          // that had focus inside can take it back now.
          projectionApi.current?.restoreParkedFocus(surface.ownerDocument);
        }
      } catch {
        // Disconnected or not a popover any more; the next update tries again.
      }
    } else {
      surface.hidden = false;
    }
  }

  /**
   * Firefox: when anchor positioning picks a position-try fallback (a flipped
   * surface) while the entry fade runs, the surface keeps the fade's starting
   * opacity once it ends, invisible though placed correctly. Once the entry
   * transition is over, a surface that is open but still fully transparent
   * has its position resolved again, which restyles it to its real opacity.
   * Elsewhere the check finds opacity 1 and does nothing.
   */
  private _watchFade(surface: HTMLElement): void {
    const done = (e: Event): void => {
      if (e.target !== surface) return;
      surface.removeEventListener('transitionend', done);
      surface.removeEventListener('transitioncancel', done);
      if (!this._active || !matchesSafe(surface, ':popover-open')) return;
      const view = surface.ownerDocument.defaultView;
      if (!view || view.getComputedStyle(surface).opacity !== '0') return;
      const mode = surface.getAttribute('data-void-position');
      if (mode !== 'anchor') return;
      surface.removeAttribute('data-void-position');
      void surface.getBoundingClientRect();
      surface.setAttribute('data-void-position', mode);
    };
    surface.addEventListener('transitionend', done);
    surface.addEventListener('transitioncancel', done);
  }

  private _hide(surface: HTMLElement): void {
    if (this._modal) {
      const dialog = surface as HTMLDialogElement;
      if (dialog.open) dialog.close();
      return;
    }
    if (supportsPopover(surface)) {
      try {
        if (matchesSafe(surface, ':popover-open')) surface.hidePopover();
      } catch {
        // Already hidden.
      }
    } else {
      surface.hidden = true;
    }
  }

  /** The surface lost its shown state while open (taken out of the document by a morph, or rebuilt). */
  private _reshow(surface: HTMLElement): void {
    const doc = this.host.ownerDocument;
    const focused = doc.activeElement as HTMLElement | null;
    const keep = focused && this.inSurface(focused) ? focused : null;
    this._show(surface);
    if (keep && doc.activeElement !== keep && keep.isConnected) keep.focus({ preventScroll: true });
  }

  private _deactivate(restoreFocus: boolean): void {
    const surface = this._surface;
    const doc = this.host.ownerDocument;
    const focused = doc.activeElement as HTMLElement | null;
    // Overlays opened inside this one go first (a select inside a popover inside a dialog).
    for (const nested of this._registry.nestedIn(this).reverse()) nested._closeForParent();
    this._active = false;
    if (this._checkFrame) doc.defaultView?.cancelAnimationFrame(this._checkFrame);
    this._checkFrame = 0;
    if (surface) this._hide(surface);
    this._registry.remove(this);
    if (this._locked) {
      this._locked = false;
      this._registry.unlock();
    }
    this._syncTriggerAria();
    const reason = this._closeReason ?? (this._formClosing ? 'form' : 'api');
    const announced = this._closeReason !== null;
    this._closeReason = null;
    this._formClosing = false;
    if (restoreFocus && this._shouldRestoreFocus(reason, focused, surface)) this._restoreFocus();
    this._opener = null;
    this._mode = null;
    if (!announced && this.host.isConnected) {
      this.host.dispatchEvent(
        new CustomEvent<OverlayCloseDetail>('void-close', { bubbles: false, detail: { reason } })
      );
    }
  }

  /**
   * Focus goes back only when it would otherwise be lost or stranded: it is
   * inside the closing surface, on nothing, or on a removed element. Never when
   * the user moved it on (closing because focus left, the pointer left, or a
   * press outside a non-modal overlay landed somewhere else).
   */
  private _shouldRestoreFocus(reason: OverlayCloseReason, focused: HTMLElement | null, surface: HTMLElement | null): boolean {
    if (reason === 'blur' || reason === 'hover') return false;
    if (reason === 'outside' && !this._modal) return false;
    const doc = this.host.ownerDocument;
    if (focused && surface && this.inSurface(focused)) return true;
    // Lost (on nothing, or on a removed element) after having been inside.
    return this._hadFocus && (!focused || focused === doc.body || !focused.isConnected);
  }

  /** Closed because the overlay it was opened inside closed. */
  private _closeForParent(): void {
    if (!this._o.isOpen()) return;
    this._closeReason = 'parent';
    this.host.dispatchEvent(
      new CustomEvent<OverlayCloseDetail>('void-close', { bubbles: false, detail: { reason: 'parent' } })
    );
    this._o.setOpen(false);
    // Hide now rather than in the next update, so focus restore of the parent sees a closed child.
    if (this._active) this._deactivate(false);
  }

  // ── Focus ──

  private _focusInitial(surface: HTMLElement, reason: OverlayOpenReason): void {
    const custom = this._o.initialFocus?.(reason);
    if (custom === false) return;
    let target: HTMLElement | null = custom ?? null;
    if (!target) {
      if (this._modal) {
        target = this._defaultModalFocus(surface);
      } else if (this.kind === 'dialog' && reason !== 'api' && reason !== 'hover') {
        target =
          surface.querySelector<HTMLElement>('[autofocus]') ?? tabbables(surface)[0] ?? this._focusableSurface(surface);
      }
    }
    if (target && target.isConnected) target.focus({ preventScroll: !this._modal });
  }

  private _defaultModalFocus(surface: HTMLElement): HTMLElement {
    // A shadow-root surface shows the host's children: search those first.
    const shadow = surface.getRootNode() === this.host.shadowRoot;
    const roots: Element[] = shadow ? [this.host, surface] : [surface];
    for (const root of roots) {
      const auto = Array.from(root.querySelectorAll<HTMLElement>('[autofocus]')).find(el => canFocus(el));
      if (auto) return auto;
    }
    const body = shadow ? this.host : surface.querySelector('[data-void-projection]');
    const content = body ? tabbables(body) : [];
    if (content.length) return content[0];
    return tabbables(surface)[0] ?? this._focusableSurface(surface);
  }

  private _focusableSurface(surface: HTMLElement): HTMLElement {
    if (!surface.hasAttribute('tabindex')) this._attr(surface, 'tabindex', '-1');
    return surface;
  }

  private _restoreFocus(): void {
    const doc = this.host.ownerDocument;
    const target = this._focusReturnTarget();
    if (target) {
      target.focus({ preventScroll: true });
    } else if (doc.activeElement && doc.activeElement !== doc.body) {
      (doc.activeElement as HTMLElement).blur?.();
    }
  }

  /**
   * Where focus goes back to: the opener; else an element with the opener's id
   * (a morph replaced it); else, for an opener hidden inside a closed overlay,
   * that overlay's trigger; else this overlay's own trigger; else the topmost
   * overlay still open; else nowhere (the document).
   */
  private _focusReturnTarget(): HTMLElement | null {
    const doc = this.host.ownerDocument;
    const opener = this._opener;
    if (opener && canFocus(opener)) return opener;
    if (this._openerId) {
      const same = doc.getElementById(this._openerId);
      if (same && canFocus(same)) return same;
    }
    if (opener?.isConnected) {
      for (let c = closestController(opener); c; c = closestController(c.host.parentNode)) {
        if (c === this) continue;
        const t = c._o.trigger?.();
        if (t && canFocus(t)) return t;
        if (c._active && c._surface) return tabbables(c._surface)[0] ?? c._focusableSurface(c._surface);
      }
    }
    const own = this._o.trigger?.();
    if (own && canFocus(own)) return own;
    const below = this._registry.top(c => c !== this && !TRANSIENT.has(c.kind));
    if (below?._surface) return tabbables(below._surface)[0] ?? below._focusableSurface(below._surface);
    return null;
  }

  // ── Native events ──

  private _onCancel = (e: Event): void => {
    // Escape is routed through the stack (see OverlayRegistry); never let the
    // dialog close itself, which could bypass hide-close or void-close.
    e.preventDefault();
    if (this._registry.top() === this) this.requestClose('escape');
  };

  private _onSurfaceFocus = (): void => {
    if (this._active) this._hadFocus = true;
  };

  private _onSubmit = (e: Event): void => {
    const form = e.target as HTMLFormElement | null;
    const submitter = (e as SubmitEvent).submitter as HTMLButtonElement | null;
    const method = submitter?.getAttribute('formmethod') ?? form?.getAttribute('method');
    if (method?.toLowerCase() !== 'dialog') return;
    this._formClosing = true;
    // A form slotted into a shadow-root <dialog> (void-dialog's parts) has no
    // <dialog> ancestor in its own tree, so the browser does not close one for
    // it: do what it would, once the submit event has run its course.
    const surface = this._surface as HTMLDialogElement | null;
    if (!surface || !form || form.closest('dialog')) return;
    queueMicrotask(() => {
      if (e.defaultPrevented || !surface.open) {
        this._formClosing = false;
        return;
      }
      surface.close(submitter?.value ?? '');
    });
  };

  /** The native dialog closed without us (`method="dialog"` form, `dialog.close()` by other code). */
  private _onNativeClose = (): void => {
    const surface = this._surface as HTMLDialogElement | null;
    if (this._reshowing || !this._active || !surface || surface.open) return;
    this._o.setOpen(false);
  };

  /** Someone else hid the popover (`hidePopover()` by other code). */
  private _onToggle = (e: Event): void => {
    const surface = this._surface;
    if ((e as ToggleEvent).newState !== 'closed' || !this._active || !surface || !surface.isConnected) return;
    if (isShown(surface, false)) return;
    this._o.setOpen(false);
  };

  // ── Trigger ARIA ──

  private _syncTriggerAria(): void {
    if (!this._o.haspopup) return;
    const trigger = this._o.trigger?.() ?? null;
    const previous = this._ariaTrigger;
    if (previous && previous !== trigger) {
      for (const name of ['aria-haspopup', 'aria-expanded', 'aria-controls']) this._attr(previous, name, null);
    }
    this._ariaTrigger = trigger;
    if (!trigger) return;
    const set = (name: string, value: string) => this._attr(trigger, name, value);
    set('aria-haspopup', this._o.haspopup);
    set('aria-expanded', String(this._active));
    if (this._surface?.id) set('aria-controls', this._surface.id);
  }

  // ── Placement ──

  private _position(): void {
    const surface = this._surface;
    const anchor = this._o.anchor?.() ?? null;
    if (!surface || !anchor || !this._active) return;
    const { side, align } = this._o.placement?.() ?? { side: 'bottom', align: 'start' };
    this._attr(surface, 'data-void-side', side);
    this._attr(surface, 'data-void-align', align);
    this._linkAnchor(anchor, surface);
    // Select-like panels are at least as wide as their field.
    const width = `${Math.round(anchor.getBoundingClientRect().width)}px`;
    this._css(surface, '--void-overlay-anchor-width', width);
    const doc = this.host.ownerDocument;
    if (this._mode === null) this._mode = supportsAnchoring(doc) && supportsPopover(surface) ? 'anchor' : 'fixed';
    if (this._mode === 'anchor') {
      this._attr(surface, 'data-void-position', 'anchor');
      this._registry.unposition(this);
      // Flip fallbacks cover most edges; if the result still leaves the viewport
      // (too wide for either alignment), hand over to the JavaScript positioner.
      if (!this._checkFrame && doc.defaultView) {
        this._checkFrame = doc.defaultView.requestAnimationFrame(() => {
          this._checkFrame = 0;
          if (this._active && this._mode === 'anchor' && this._overflows(surface)) {
            this._mode = 'fixed';
            this._position();
          }
        });
      }
    } else {
      this._attr(surface, 'data-void-position', 'fixed');
      this._placeFixed();
      this._registry.position(this);
    }
  }

  private _overflows(surface: HTMLElement): boolean {
    const r = surface.getBoundingClientRect();
    const root = surface.ownerDocument.documentElement;
    const w = root.clientWidth;
    const h = root.clientHeight;
    return r.left < -0.5 || r.top < -0.5 || r.right > w + 0.5 || r.bottom > h + 0.5;
  }

  private _linkAnchor(anchor: Element, surface: HTMLElement): void {
    if (!this._anchorName) this._anchorName = `--${nextId('void-anchor')}`;
    const name = this._anchorName;
    if (this._anchorEl && this._anchorEl !== anchor) this._clearAnchor(this._anchorEl);
    this._anchorEl = anchor;
    if (anchor === this.host && this._o.hostStyle) this._o.hostStyle('anchor-name', name);
    else if ((anchor as HTMLElement).style) this._css(anchor as HTMLElement, 'anchor-name', name);
    this._css(surface, 'position-anchor', name);
  }

  private _clearAnchor(el: Element): void {
    if (el === this.host && this._o.hostStyle) this._o.hostStyle('anchor-name', null);
    else if ((el as HTMLElement).style) this._css(el as HTMLElement, 'anchor-name', null);
  }

  private _placeFixed(): void {
    const surface = this._surface;
    const anchor = this._anchorEl;
    if (!surface || !anchor) return;
    const { side, align } = this._o.placement?.() ?? { side: 'bottom', align: 'start' };
    const root = surface.ownerDocument.documentElement;
    const style = getComputedStyle(surface);
    const gap = parseLength(style.getPropertyValue('--void-overlay-gap'), surface);
    const rtl = getComputedStyle(anchor).direction === 'rtl';
    const a = anchor.getBoundingClientRect();
    const placed = placeOverlay(
      a,
      { width: surface.offsetWidth, height: surface.offsetHeight },
      { width: root.clientWidth, height: root.clientHeight },
      side,
      align,
      gap,
      rtl
    );
    this._css(surface, '--void-overlay-x', `${placed.x}px`);
    this._css(surface, '--void-overlay-y', `${placed.y}px`);
    this._attr(surface, 'data-void-placed', placed.side);
  }
}

/** @internal Test hook: forces the JavaScript positioner in `doc` (as if anchor positioning were missing). */
export function forceOverlayFallback(doc: Document, force: boolean): void {
  (doc as unknown as Record<symbol, unknown>)[FORCE_KEY] = force || undefined;
}

/** @internal Test hook: the open overlays of `doc`, bottom to top, and the scroll-lock count. */
export function overlayState(doc: Document): { stack: HTMLElement[]; locks: number } {
  const r = (doc as RegistryDocument)[REGISTRY_KEY];
  return { stack: r ? r.stack.map(c => c.host) : [], locks: r ? r.locked : 0 };
}
