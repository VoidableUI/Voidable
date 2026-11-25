import type { LitElement, ReactiveController } from 'lit';

/**
 * Where a projection region puts its nodes.
 *
 * - `'before'`: stay a direct child of the host, before the Lit-rendered content.
 * - `'after'`: stay a direct child of the host, after the Lit-rendered content.
 * - a function: return a container element that the host's own template
 *   renders (looked up after each render, e.g. `() => this.querySelector(':scope > .x-body')`).
 */
export type ProjectionTarget = 'before' | 'after' | (() => Element | null | undefined);

/** What a region's `accepts` is told about the node being routed. */
export interface ProjectionContext {
  /**
   * True until the first consumer element has been projected since the controller
   * (re)initialised. Covers both children present at connect and children the
   * parser appends after an early upgrade.
   */
  initial: boolean;
  /**
   * Where the consumer put the node: `'before'` if it sits on the host ahead of the
   * Lit-rendered content (e.g. `host.prepend(x)`, or a framework inserting next to
   * a trigger), `'after'` if it was appended, `'insert'` if it was inserted next to
   * a node that had already been projected into a container.
   */
  zone: 'before' | 'after' | 'insert';
}

/** A named destination for consumer children: the light-DOM equivalent of a named slot. */
export interface ProjectionRegion {
  /** Region name, used with {@link ProjectionController.nodes}. */
  name: string;
  /** Where the region's nodes live. */
  target: ProjectionTarget;
  /**
   * Whether a consumer node belongs to this region. Regions are tried in order and
   * the first one that accepts a node wins; a region without `accepts` takes
   * everything that reaches it. A node no region accepts stays where the consumer
   * put it, after the Lit-rendered content.
   */
  accepts?: (node: Node, context: ProjectionContext) => boolean;
  /**
   * Development-only hint: if, after projection, this region holds no element while
   * another region does, warn once per host with the message this returns (return
   * null to stay quiet). Silent in production builds (when Lit's development build
   * is not in use).
   */
  required?: () => string | null;
  /**
   * Gives each node of a container region a wrapper element of its own (for
   * example an `<li>` per item of a list): called once per node, the wrapper is
   * kept for that node while it stays in the region and removed once it leaves.
   * Wrappers belong to the component (it may set attributes on them) and are
   * parked and restored with the container. Only for function targets.
   */
  wrap?: (node: Node) => Element;
}

export interface ProjectionOptions {
  /** Destinations for consumer children. Empty (the default) for components that only render chrome. */
  regions?: ProjectionRegion[];
  /**
   * Where the rendered chrome sits among consumer nodes that no region takes:
   * `'start'` (before them) or `'end'` (after them, where Lit puts a plain
   * render). Defaults to `'start'` with regions and `'end'` without.
   */
  placement?: 'start' | 'end';
  /**
   * Called when the set or order of consumer nodes in any region changes after the
   * first render (children added, removed or reordered by the consumer), and after
   * the controller re-projected following recovery or `unproject()` (see the class
   * docs). Not called for the initial projection. Typical use: `() => this.requestUpdate()`.
   */
  onChange?: () => void;
}

/** @internal Instance key under which a host's controller is stored (read by VoidElement's DOM overrides). */
export const PROJECTION_KEY = '__voidProjection';

/** Comment data of the markers that bound Lit's part. Also used to recognise stale markers in clones. */
const START_DATA = 'void-projection';
const END_DATA = '/void-projection';
/** Set on each region container, with the region name, so a clone of a rendered host can find them. */
const CONTAINER_ATTR = 'data-void-projection';
/** Set on each top-level element Lit renders, so stale chrome can be recognised after a clone or morph. */
const CHROME_ATTR = 'data-void-chrome';
/** Set on each per-node wrapper of a `wrap` region. */
const WRAP_ATTR = 'data-void-wrap';

type ProjectionHost = LitElement & { [PROJECTION_KEY]?: ProjectionController };
type MovableParent = Node & { moveBefore?: (node: Node, child: Node | null) => void };

/**
 * One hidden holder per document for chrome parked during a morph, kept on the
 * document (not in module scope) and removed again once it is empty.
 */
const PARK_KEY = Symbol.for('@voidable/ui:projection-park');
type ParkDocument = Document & { [PARK_KEY]?: HTMLElement };

function sharedPark(doc: Document): HTMLElement {
  const d = doc as ParkDocument;
  let park = d[PARK_KEY];
  if (!park || park.parentNode !== doc.documentElement) {
    park = doc.createElement('void-projection-park');
    park.hidden = true;
    doc.documentElement.appendChild(park);
    d[PARK_KEY] = park;
  }
  return park;
}

function releasePark(park: Element): void {
  if (park.firstChild) return;
  const doc = park.ownerDocument as ParkDocument;
  if (doc[PARK_KEY] === park) delete doc[PARK_KEY];
  park.remove();
}

/** What unproject() took out of the host. */
interface Parked {
  nodes: Node[];
  /** The shared park element, or null when the nodes wait in a fragment. */
  park: Element | null;
  fragment: DocumentFragment | null;
  /** The consumer node that followed the chrome, to put it back in the same place. */
  anchor: Node | null;
  /** Restores focus to a parked element where the nodes could not stay connected. */
  focus: (() => void) | null;
  /** Scroll offsets of scrolled chrome elements, put back after the nodes return. */
  scroll: Array<[Element, number, number]>;
}

const isElement = (n: Node): n is Element => n.nodeType === Node.ELEMENT_NODE;
const isComment = (n: Node): n is Comment => n.nodeType === Node.COMMENT_NODE;
const isStaleLooking = (n: Node): boolean =>
  (isComment(n) && (n.data === START_DATA || n.data === END_DATA)) ||
  (isElement(n) && n.hasAttribute(CHROME_ATTR));
const isAnchor = (n: Node): boolean =>
  isComment(n) || (n.nodeType === Node.TEXT_NODE && !(n.textContent ?? '').trim());

/**
 * Moves `node` into `parent` before `ref`, preserving focus and other element
 * state where the platform allows: `Element.moveBefore` (Chromium 133+) moves a
 * connected node without removing it from the document; elsewhere the node is
 * re-inserted and the focused element (and its text selection) is restored.
 * Bypasses VoidElement's own `insertBefore` override.
 */
function moveNode(parent: Node, node: Node, ref: Node | null): void {
  if (node.parentNode === parent && node.nextSibling === ref && node !== ref) return;
  const movable = parent as MovableParent;
  if (typeof movable.moveBefore === 'function' && node.isConnected && parent.isConnected && !isSelectPart(parent, node)) {
    try {
      movable.moveBefore(node, ref);
      return;
    } catch {
      // Different roots, or a node type moveBefore does not take: insert instead.
    }
  }
  const restore = captureFocus(node);
  Node.prototype.insertBefore.call(parent, node, ref);
  restore?.();
}

/**
 * Options carry no focus or element state worth preserving, and moving them with
 * `moveBefore` into or out of a `<select>` crashed the Chromium 155 renderer in
 * testing; use a plain insert for them.
 */
function isSelectPart(parent: Node, node: Node): boolean {
  const name = (n: Node) => (isElement(n) ? n.localName : '');
  return ['select', 'optgroup', 'datalist'].includes(name(parent)) || ['option', 'optgroup'].includes(name(node));
}

/** If the focused element is inside `node`, returns a function that refocuses it after a move. */
function captureFocus(node: Node): (() => void) | null {
  const doc = node.ownerDocument;
  const active = doc?.activeElement as HTMLElement | null | undefined;
  if (!doc || !active || active === doc.body || !node.contains(active)) return null;
  const field = active as Partial<HTMLInputElement>;
  let range: [number, number, 'forward' | 'backward' | 'none'] | null = null;
  try {
    if (typeof field.selectionStart === 'number' && typeof field.selectionEnd === 'number') {
      range = [field.selectionStart, field.selectionEnd, field.selectionDirection ?? 'none'];
    }
  } catch {
    range = null;
  }
  return () => {
    if (!active.isConnected || doc.activeElement === active) return;
    active.focus({ preventScroll: true });
    if (range) {
      try {
        field.setSelectionRange?.(range[0], range[1], range[2]);
      } catch {
        // Input types without selection support.
      }
    }
  };
}

/**
 * @internal Experimental: the API may change before it is made public.
 *
 * Light-DOM content projection for {@link VoidElement} components.
 *
 * Every VoidElement that renders gets one with no regions from the base class:
 * its chrome is confined between the markers (placed after the consumer content),
 * tracked, parked around morphs, recovered and cleaned up in clones as described
 * below, and consumer children simply stay on the host. Components that also host
 * consumer children in rendered containers (text, elements, framework-managed
 * nodes) declare their own, with regions, instead of snapshotting `childNodes` in
 * `connectedCallback`; it replaces the default one. Construct it in a field
 * initializer so it exists before the first connect:
 *
 * ```ts
 * protected readonly _projection = new ProjectionController(this, {
 *   regions: [{ name: 'body', target: () => this.querySelector(':scope .x-body') }],
 * });
 * ```
 *
 * ## Contract between Lit and consumer nodes
 *
 * Lit and the consumer share the host element, so the two must never own the same
 * positions:
 *
 * 1. On connect the controller inserts two comment markers into the host and points
 *    the host's `renderOptions.renderBefore` at the second one. Lit's root part
 *    therefore lives strictly between the markers; nothing Lit does (including
 *    clearing its part when the top-level template changes) can touch a node before
 *    the first marker or after the second. Consumer nodes only ever live outside the
 *    markers or inside region containers.
 * 2. A region container must be a static element of the host's template: rendered
 *    on every render path (never behind a condition or `nothing`) and with no Lit
 *    child bindings inside it. Lit never adds, removes or reorders children of an
 *    element that has no child parts, so consumer nodes moved inside are safe.
 *    Hide closed overlays with `hidden` / an attribute instead of not rendering.
 * 3. Consumer nodes are moved exactly once, never cloned, so identity, listeners
 *    and framework references survive (moves use `moveBefore` where available, so
 *    focus survives too). Nodes the consumer adds later land outside the markers and
 *    are routed by a MutationObserver, keeping their position relative to the
 *    region's other nodes; removals and reorders inside containers are observed
 *    too. This also covers elements upgraded before the parser appended their
 *    children.
 * 4. Disconnecting stops observing; nothing is torn down or rebuilt, so moving the
 *    element in the DOM or reconnecting it never duplicates wrappers.
 * 5. `VoidElement` redirects `insertBefore` / `removeChild` / `replaceChild` calls
 *    on the host whose reference node has been projected into a container, and
 *    makes the `textContent` setter and `replaceChildren` replace only consumer
 *    content, so frameworks that keep treating the host as the parent of their
 *    children (React, Solid, Vue) keep working.
 * 6. Morphing: {@link unproject} (behind `VoidElement.voidBeforeMorph()`, the
 *    supported pre-morph hook for adapters) puts the host back into its
 *    server-markup shape so a DOM morph never sees chrome. The chrome is parked (in
 *    one shared hidden holder per document while `moveBefore` exists) and put back
 *    afterwards with its scroll offsets, so nothing is rebuilt.
 * 7. Recovery, for morphs that skip that hook: if a marker or a top-level chrome
 *    element leaves the host (idiomorph, `host.innerHTML = …`, `innerText`), the
 *    controller discards what is left of the old chrome, inserts fresh markers (Lit
 *    keys its root part on the `renderBefore` node, so this yields a clean part), and
 *    re-renders, projecting the host's current children as if they were initial
 *    content. Chrome elements are tracked by identity, so one a morph recycled as
 *    consumer content (stripping its class) is replaced by a plain copy without
 *    Lit's event listeners. A host created by `cloneNode(true)` or an `outerHTML`
 *    round-trip of a rendered host is cleaned up the same way on first connect:
 *    container contents are lifted back onto the host and the stale chrome dropped.
 *
 * Consequences for consumers: after projection, `host.children` lists the rendered
 * chrome rather than the consumer's children, and `child.parentNode === host` no
 * longer holds for projected children. Use `child.closest('void-…')` or keep your
 * own references.
 */
export class ProjectionController implements ReactiveController {
  private readonly _host: ProjectionHost;
  private readonly _regions: ProjectionRegion[];
  private readonly _placement: 'start' | 'end';
  private readonly _onChange?: () => void;
  private _start: Comment | null = null;
  private _end: Comment | null = null;
  private _observer: MutationObserver | null = null;
  private _observedContainers = new Set<Element>();
  private _placed = new WeakMap<Node, ProjectionRegion>();
  /** Top-level elements of the current render, in order. */
  private _chromeTop: Element[] = [];
  /** Every element Lit rendered for this host (outside container contents), by identity. */
  private _chromeAll = new WeakSet<Element>();
  /** Region containers, by identity. */
  private _containers = new WeakSet<Element>();
  /** Per-node wrappers of `wrap` regions: node -> wrapper, and the set of wrappers. */
  private _wrapperOf = new WeakMap<Node, Element>();
  private _wrappers = new WeakSet<Element>();
  /** Top-level text/comment nodes Lit rendered, with their data at render time. */
  private _litText = new WeakMap<Node, string>();
  private _signature: Node[] = [];
  private _rendered = false;
  private _recovered = false;
  private _initialPass = false;
  private _sawElement = false;
  /**
   * Set by unproject(): the markers and chrome are parked here until re-projection,
   * in a hidden holder outside the morph target when `moveBefore` can keep them
   * connected (so focus inside the chrome survives), else in a fragment.
   */
  private _parked: Parked | null = null;
  private _warned = false;

  constructor(host: LitElement, options: ProjectionOptions = {}) {
    this._host = host as ProjectionHost;
    this._regions = options.regions ?? [];
    this._placement = options.placement ?? (this._regions.length ? 'start' : 'end');
    this._onChange = options.onChange;
    // VoidElement gives every rendering component a region-less controller; a
    // component that declares its own (with regions) replaces it. Both are
    // created in the constructor, before anything was connected or rendered.
    const previous = this._host[PROJECTION_KEY];
    if (previous && previous !== this) host.removeController(previous);
    this._host[PROJECTION_KEY] = this;
    host.addController(this);
  }

  hostConnected(): void {
    const host = this._host;
    if (this._parked) {
      this._restore();
    } else if (!this._start) {
      this._init(false);
    } else if (this._needsInit()) {
      this._init(true);
      host.requestUpdate();
    }
    this._observer ??= new MutationObserver(() => this._onMutation());
    this._observer.observe(host, { childList: true });
    this._observedContainers.clear();
    host.addEventListener('scroll', this._onScroll, { capture: true, passive: true });
    if (this._rendered) this._reconcile(true);
  }

  /**
   * Elements inside the host that have been scrolled, so their scroll position
   * can be put back after parking (a parked element has no layout box, which
   * resets its scroll offsets). Recorded from scroll events rather than read
   * from every element at park time, which would force layouts mid-morph.
   */
  private _scrolled: Set<Element> | null = null;
  private readonly _onScroll = (e: Event): void => {
    const target = e.target;
    if (target instanceof Element && target !== this._host) (this._scrolled ??= new Set()).add(target);
  };

  hostDisconnected(): void {
    this._host.removeEventListener('scroll', this._onScroll, { capture: true });
    this._observer?.disconnect();
    this._observedContainers.clear();
  }

  hostUpdate(): void {
    if (this._parked) {
      this._restore();
      return;
    }
    if (this._needsInit()) {
      // Markers or chrome vanished since the last render; re-initialise so this
      // render builds a fresh root part instead of patching detached nodes.
      this._init(true);
      return;
    }
    if (this._rendered || !this._start || !this._end) return;
    // Anything inserted between the markers before the first render would end up
    // beside Lit's part; move it out so it is treated as consumer content.
    const stray: Node[] = [];
    for (let n = this._start.nextSibling; n && n !== this._end; n = n.nextSibling) stray.push(n);
    if (this._placement === 'end') {
      // Children the parser appended after an early upgrade come before the
      // chrome, as they would with a plain Lit render.
      for (const n of stray) moveNode(this._host, n, this._start);
      if (this._end.nextSibling) {
        Node.prototype.insertBefore.call(this._host, this._start, null);
        Node.prototype.insertBefore.call(this._host, this._end, null);
      }
      return;
    }
    const ref = this._end.nextSibling;
    for (const n of stray) moveNode(this._host, n, ref);
  }

  hostUpdated(): void {
    const first = !this._rendered;
    this._rendered = true;
    this._markChrome();
    this._initialPass = first;
    this._reconcile(!first || this._recovered);
    this._initialPass = false;
    this._recovered = false;
  }

  /** Consumer nodes currently in the named region, in document order. */
  nodes(name: string): Node[] {
    const region = this._regions.find(r => r.name === name);
    return region ? this._regionNodes(region) : [];
  }

  /** The region a consumer node was projected into, if any. */
  regionOf(node: Node): string | undefined {
    return this._placed.get(node)?.name;
  }

  /** True if `node` is a consumer node that was moved into a region container. */
  isProjected(node: Node): boolean {
    const region = this._placed.get(node);
    if (!region || typeof region.target !== 'function') return false;
    const parent = node.parentNode;
    if (!parent || parent === this._host) return false;
    const container = region.target();
    return parent === container || (this._wrappers.has(parent as Element) && parent.parentNode === container);
  }

  /** `host.insertBefore(node, ref)` where `ref` has been projected into a container. */
  insertBefore<T extends Node>(node: T, ref: Node): T {
    if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      for (const child of Array.from(node.childNodes)) this.insertBefore(child, ref);
      return node;
    }
    const region = this._route(node, 'insert');
    if (region?.wrap && region === this._placed.get(ref)) {
      this._place(node, region, ref);
    } else if (region && region === this._placed.get(ref) && ref.parentNode) {
      moveNode(ref.parentNode, node, ref);
      this._placed.set(node, region);
      if (isElement(node)) this._sawElement = true;
    } else if (!region || !this._place(node, region, null)) {
      moveNode(this._host, node, null);
    }
    return node;
  }

  /**
   * Replaces all consumer content (every region, plus anything not yet routed) with
   * `nodes`, leaving the rendered chrome alone. Backs `textContent = …` and
   * `replaceChildren(…)` on the host. Returns false if the projection is not
   * intact, in which case the caller should fall back to the native operation.
   * Callers validate `nodes` first.
   */
  replaceContent(nodes: Node[]): boolean {
    if (!this._intact()) return false;
    const host = this._host;
    const doomed: Node[] = [];
    for (const region of this._regions) {
      if (typeof region.target === 'function') doomed.push(...this._regionNodes(region));
    }
    let zone: 'before' | 'lit' | 'after' = 'before';
    for (let n = host.firstChild; n; n = n.nextSibling) {
      if (n === this._start) zone = 'lit';
      else if (n === this._end) zone = 'after';
      else if (zone !== 'lit') doomed.push(n);
    }
    for (const n of doomed) {
      if (!nodes.includes(n)) n.parentNode?.removeChild(n);
    }
    const ref = this._placement === 'end' ? this._start : null;
    for (const n of nodes) moveNode(host, n, ref);
    if (this._rendered) this._reconcile(true);
    return true;
  }

  /**
   * Returns the host to the shape of its original markup so a DOM morph (Turbo,
   * idiomorph, morphdom/LiveView, Livewire) compares like with like: each region
   * container's consumer nodes are moved back onto the host (before-region nodes,
   * then container contents in document order, then after-region nodes), and the
   * markers and all rendered chrome are taken out of the document. The chrome is
   * parked, not destroyed: on re-projection the same nodes go back, Lit's part stays
   * valid, and no element is rebuilt (the native select, tab list and inputs keep
   * their identity). Component state (properties) is untouched.
   *
   * Re-projection happens on its own once the morph has run: the update requested
   * here and the observer both fire in a microtask, after a synchronous morph. Call
   * {@link reproject} to force it. If the morph left stale chrome behind, the
   * controller falls back to recovery (fresh chrome). Returns false if there was
   * nothing to unproject.
   */
  unproject(): boolean {
    const host = this._host;
    const start = this._start;
    const end = this._end;
    if (this._parked || !this._rendered || !start || !end || !this._intact()) return false;
    const containers = this._regions
      .filter(r => typeof r.target === 'function')
      .map(r => [r, (r.target as () => Element | null | undefined)()] as const)
      .filter((pair): pair is readonly [ProjectionRegion, Element] => !!pair[1])
      .sort((a, b) => (a[1].compareDocumentPosition(b[1]) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    // Before anything moves: emptying a container clamps its scroll offsets.
    const scroll: Array<[Element, number, number]> = [];
    if (this._scrolled) {
      for (const el of this._scrolled) {
        if (!host.contains(el)) {
          this._scrolled.delete(el);
          continue;
        }
        if (el.scrollTop || el.scrollLeft) scroll.push([el, el.scrollTop, el.scrollLeft]);
        else this._scrolled.delete(el);
      }
    }
    for (const [region] of containers) {
      for (const n of this._regionNodes(region)) moveNode(host, n, start);
    }
    const range: Node[] = [];
    for (let n: Node | null = start; n; n = n.nextSibling) {
      range.push(n);
      if (n === end) break;
    }
    const anchor = end.nextSibling;
    const doc = host.ownerDocument;
    const root = doc.documentElement as MovableParent | null;
    const parked: Parked = { nodes: range, park: null, fragment: null, anchor, focus: null, scroll };
    if (root && host.isConnected && typeof root.moveBefore === 'function') {
      // A direct child of <html>, outside <body> and any morph container, shared
      // by every host parked in this morph. Moved nodes stay connected, so a
      // focused chrome element (an input) keeps focus and selection without
      // blur/focus events.
      const park = sharedPark(doc);
      for (const n of range) moveNode(park, n, null);
      parked.park = park;
    } else {
      parked.focus = range.map(n => captureFocus(n)).find(Boolean) ?? null;
      const fragment = doc.createDocumentFragment();
      for (const n of range) fragment.appendChild(n);
      parked.fragment = fragment;
    }
    this._parked = parked;
    this._observedContainers.clear();
    if (this._observer && host.isConnected) {
      this._observer.disconnect();
      this._observer.observe(host, { childList: true });
      this._observer.takeRecords();
    }
    host.requestUpdate();
    return true;
  }

  /** Re-projects now after {@link unproject}; resolves when the host has rendered. */
  reproject(): Promise<boolean> {
    if (this._parked) {
      this._restore();
      this._host.requestUpdate();
    }
    return this._host.updateComplete;
  }

  /** Puts parked chrome back after a morph and re-projects the host's current children. */
  private _restore(): void {
    const host = this._host;
    const parked = this._parked;
    if (!parked) return;
    this._parked = null;
    if (Array.from(host.childNodes).some(isStaleLooking)) {
      // The morph brought rendered markup of its own; rebuild from scratch.
      for (const n of parked.nodes) n.parentNode?.removeChild(n);
      if (parked.park) releasePark(parked.park);
      this._init(true);
      host.requestUpdate();
      return;
    }
    // Everything on the host is consumer content again. With regions the chrome
    // goes back ahead of it and reconcile routes each node back to its region
    // (placement is remembered, new nodes are routed as usual); without, it goes
    // back where it was, before the consumer node that followed it if that is
    // still here.
    const ref = this._regions.length
      ? host.firstChild
      : parked.anchor && parked.anchor.parentNode === host
        ? parked.anchor
        : this._placement === 'end'
          ? null
          : host.firstChild;
    if (parked.fragment) {
      Node.prototype.insertBefore.call(host, parked.fragment, ref);
    } else {
      for (const n of parked.nodes) moveNode(host, n, ref);
    }
    if (parked.park) releasePark(parked.park);
    // Always report a change: derived state (the native select's value, active
    // tab) must be re-applied after the morph even when the node set is the same.
    this._signature = [];
    this._reconcile(true);
    parked.focus?.();
    for (const [el, top, left] of parked.scroll) {
      if (el.scrollTop !== top) el.scrollTop = top;
      if (el.scrollLeft !== left) el.scrollLeft = left;
    }
  }

  private _needsInit(): boolean {
    return !this._parked && !!this._start && !this._intact();
  }

  private _intact(): boolean {
    const host = this._host;
    const start = this._start;
    const end = this._end;
    if (!start || !end || start.parentNode !== host || end.parentNode !== host) return false;
    let found = false;
    for (let n = start.nextSibling; n; n = n.nextSibling) {
      if (n === end) {
        found = true;
        break;
      }
    }
    if (!found) return false;
    // A chrome element removed (or stripped of its marker attribute, as a morph
    // that recycled it would) while the markers stayed also needs recovery.
    return this._chromeTop.every(el => el.parentNode === host && el.hasAttribute(CHROME_ATTR));
  }

  /**
   * Inserts fresh markers and points Lit at them. Any stale markers and chrome
   * (left by a morph, by `innerHTML`, or copied by `cloneNode`) are removed first,
   * with the contents of stale region containers lifted back onto the host so they
   * are projected again.
   */
  private _init(recovering: boolean): void {
    const host = this._host;
    this._start = null;
    this._end = null;
    this._purgeStale();
    const doc = host.ownerDocument;
    const start = doc.createComment(START_DATA);
    const end = doc.createComment(END_DATA);
    Node.prototype.insertBefore.call(host, end, this._placement === 'end' ? null : host.firstChild);
    Node.prototype.insertBefore.call(host, start, end);
    this._start = start;
    this._end = end;
    // Lit keys its root part on renderBefore, so a new end marker means a clean part.
    host.renderOptions.renderBefore = end;
    this._placed = new WeakMap();
    this._litText = new WeakMap();
    this._chromeTop = [];
    this._chromeAll = new WeakSet();
    this._containers = new WeakSet();
    this._wrapperOf = new WeakMap();
    this._wrappers = new WeakSet();
    this._observedContainers.clear();
    this._signature = [];
    this._rendered = false;
    this._recovered = recovering;
    this._sawElement = false;
    this._parked = null;
  }

  /**
   * Removes stale markers and chrome from the host (never the live markers or
   * anything between them), lifting the contents of stale containers back onto the
   * host in their place. Stale nodes come from a clone or serialisation of a
   * rendered host, or are what is left of this host's own chrome after its markers
   * were removed. Chrome elements a morph recycled as consumer content are replaced
   * with plain copies so Lit's listeners do not come along.
   */
  private _purgeStale(): void {
    const host = this._host;
    const kids: Node[] = [];
    let live = false;
    for (let n = host.firstChild; n; n = n.nextSibling) {
      if (n === this._start) live = true;
      else if (n === this._end) live = false;
      else if (!live) kids.push(n);
    }
    const startIdx = kids.findIndex(n => isComment(n) && n.data === START_DATA);
    const endIdx = kids.findIndex((n, i) => i > startIdx && isComment(n) && n.data === END_DATA);
    const stale = kids.filter((n, i) => {
      if (isComment(n) && (n.data === START_DATA || n.data === END_DATA)) return true;
      if (startIdx >= 0 && endIdx > startIdx && i > startIdx && i < endIdx) return true;
      if (isElement(n)) return n.hasAttribute(CHROME_ATTR);
      // A Lit text/comment node whose data a morph has not rewritten.
      return this._litText.get(n) === (n as CharacterData).data;
    });
    for (const node of stale) {
      for (const container of this._staleContainers(node)) {
        for (const child of Array.from(container.childNodes)) {
          // A per-node wrapper of a `wrap` region: lift what it wraps.
          const wrapped = isElement(child) && (child.hasAttribute(WRAP_ATTR) || this._wrappers.has(child));
          for (const n of wrapped ? Array.from(child.childNodes) : [child]) moveNode(host, n, node);
        }
      }
    }
    for (const node of stale) {
      if (node.parentNode === host) Node.prototype.removeChild.call(host, node);
    }
    this._replaceRecycledChrome();
  }

  /**
   * After a morph, an element this host rendered may survive as consumer content
   * (the morph matched it to a server node by tag and rewrote its attributes and
   * children in place). It still carries Lit's event listeners, so swap it for a
   * shallow copy that keeps its current attributes and children.
   */
  private _replaceRecycledChrome(): void {
    const host = this._host;
    const recycled = Array.from(host.querySelectorAll('*')).filter(
      el => this._chromeAll.has(el) || this._containers.has(el) || this._wrappers.has(el)
    );
    for (const el of recycled) {
      const parent = el.parentNode;
      if (!parent) continue;
      const copy = el.cloneNode(false) as Element;
      copy.removeAttribute(CHROME_ATTR);
      copy.removeAttribute(CONTAINER_ATTR);
      copy.removeAttribute(WRAP_ATTR);
      Node.prototype.insertBefore.call(parent, copy, el);
      for (const child of Array.from(el.childNodes)) moveNode(copy, child, null);
      Node.prototype.removeChild.call(parent, el);
    }
  }

  /** Region containers inside a stale chrome node that belong to this host, outermost first. */
  private _staleContainers(node: Node): Element[] {
    if (!isElement(node)) return [];
    const isContainer = (el: Element) => el.hasAttribute(CONTAINER_ATTR) || this._containers.has(el);
    const found = [node, ...Array.from(node.querySelectorAll('*'))].filter(isContainer);
    return found.filter(el => {
      // Skip containers that belong to another component nested in the chrome, and
      // containers nested inside one already being lifted.
      for (let p = el.parentElement; p && p !== node.parentNode; p = p.parentElement) {
        if (p !== el && (isContainer(p) || p.localName.includes('-'))) return false;
      }
      return true;
    });
  }

  /** Records Lit's nodes by identity (and tags top-level ones) so stale chrome can be recognised later. */
  private _markChrome(): void {
    for (const region of this._regions) {
      if (typeof region.target !== 'function') continue;
      const container = region.target();
      if (!container) continue;
      if (!container.hasAttribute(CONTAINER_ATTR)) container.setAttribute(CONTAINER_ATTR, region.name);
      this._containers.add(container);
    }
    const top: Element[] = [];
    for (let n = this._start?.nextSibling; n && n !== this._end; n = n.nextSibling) {
      if (isElement(n)) {
        if (!n.hasAttribute(CHROME_ATTR)) n.setAttribute(CHROME_ATTR, '');
        top.push(n);
        this._trackChrome(n);
      } else {
        this._litText.set(n, (n as CharacterData).data);
      }
    }
    this._chromeTop = top;
  }

  private _trackChrome(el: Element): void {
    this._chromeAll.add(el);
    // Container contents are consumer nodes; custom elements own their own children.
    if (this._containers.has(el) || (el !== this._host && el.localName.includes('-'))) return;
    for (let c = el.firstElementChild; c; c = c.nextElementSibling) this._trackChrome(c);
  }

  private _onMutation(): void {
    if (this._parked) {
      this._restore();
      return;
    }
    if (this._needsInit()) {
      this._init(true);
      this._observer?.takeRecords();
      this._host.requestUpdate();
      return;
    }
    this._reconcile(true);
  }

  private _route(node: Node, zone: ProjectionContext['zone']): ProjectionRegion | undefined {
    const context: ProjectionContext = { initial: !this._sawElement, zone };
    return this._regions.find(r => !r.accepts || r.accepts(node, context));
  }

  /**
   * Moves `node` into `region`, before `ref` (a node of that region) or appending.
   * Returns false if the container is not rendered yet.
   */
  private _place(node: Node, region: ProjectionRegion, ref: Node | null): boolean {
    const host = this._host;
    const validRef = ref && ref !== node && this._placed.get(ref) === region ? ref : null;
    if (region.target === 'before') {
      const before = validRef && validRef.parentNode === host && !this._isAfterEnd(validRef) ? validRef : this._start;
      moveNode(host, node, before);
    } else if (region.target === 'after') {
      if (node.parentNode === host && this._isAfterEnd(node)) {
        // Already after the chrome, where the consumer put it.
      } else if (validRef && validRef.parentNode === host && this._isAfterEnd(validRef)) {
        moveNode(host, node, validRef);
      } else {
        moveNode(host, node, null);
      }
    } else {
      const container = region.target();
      if (!container) return false;
      if (!container.hasAttribute(CONTAINER_ATTR)) container.setAttribute(CONTAINER_ATTR, region.name);
      this._containers.add(container);
      if (region.wrap) {
        let wrapper = this._wrapperOf.get(node);
        if (!wrapper) {
          wrapper = region.wrap(node);
          wrapper.setAttribute(WRAP_ATTR, '');
          this._wrapperOf.set(node, wrapper);
          this._wrappers.add(wrapper);
        }
        const refWrapper = validRef ? this._wrapperOf.get(validRef) : undefined;
        moveNode(container, wrapper, refWrapper && refWrapper.parentNode === container ? refWrapper : null);
        moveNode(wrapper, node, null);
        this._observeContainer(wrapper);
      } else {
        moveNode(container, node, validRef && validRef.parentNode === container ? validRef : null);
      }
      this._observeContainer(container);
    }
    this._placed.set(node, region);
    if (isElement(node)) this._sawElement = true;
    return true;
  }

  /** Removes wrappers whose node left the region (removed by the consumer, or moved elsewhere). */
  private _dropEmptyWrappers(region: ProjectionRegion): void {
    const container = (region.target as () => Element | null | undefined)();
    if (!container) return;
    for (const n of Array.from(container.childNodes)) {
      if (!this._wrappers.has(n as Element)) continue;
      const held = Array.from(n.childNodes).filter(w => this._placed.get(w) === region);
      if (!held.length) {
        // Anything else a consumer put inside a wrapper stays in the region.
        for (const w of Array.from(n.childNodes)) moveNode(container, w, n);
        Node.prototype.removeChild.call(container, n);
      }
    }
  }

  private _isAfterEnd(node: Node): boolean {
    for (let n = this._end?.nextSibling; n; n = n.nextSibling) if (n === node) return true;
    return false;
  }

  private _observeContainer(container: Element): void {
    if (!this._onChange || !this._host.isConnected || this._observedContainers.has(container)) return;
    this._observedContainers.add(container);
    this._observer?.observe(container, { childList: true });
  }

  private _regionNodes(region: ProjectionRegion): Node[] {
    const host = this._host;
    const out: Node[] = [];
    if (region.target === 'before') {
      for (let n = host.firstChild; n && n !== this._start; n = n.nextSibling) {
        if (this._placed.get(n) === region) out.push(n);
      }
    } else if (region.target === 'after') {
      for (let n = this._end?.nextSibling; n; n = n.nextSibling) {
        if (this._placed.get(n) === region) out.push(n);
      }
    } else {
      const container = region.target();
      if (container) {
        for (const n of Array.from(container.childNodes)) {
          if (region.wrap && this._wrappers.has(n as Element)) {
            for (const w of Array.from(n.childNodes)) if (this._placed.get(w) === region) out.push(w);
          } else if (this._placed.get(n) === region) {
            out.push(n);
          }
        }
      }
    }
    return out;
  }

  private _reconcile(notify: boolean): void {
    const host = this._host;
    const start = this._start;
    const end = this._end;
    if (!this._rendered || !start || !end || !this._intact()) return;

    // Route consumer nodes that sit directly on the host and are not yet where
    // their region wants them: nodes present before the first render, nodes
    // added later, and nodes the consumer moved back onto the host.
    const pending: Array<[Node, 'before' | 'after']> = [];
    let zone: 'before' | 'lit' | 'after' = 'before';
    let stale = false;
    const routing = this._regions.length > 0;
    for (let n = host.firstChild; n; n = n.nextSibling) {
      if (n === start) zone = 'lit';
      else if (n === end) zone = 'after';
      else if (!routing) stale ||= zone !== 'lit' && isStaleLooking(n);
      else if (zone !== 'lit' && this._placed.get(n)?.target !== zone) {
        pending.push([n, zone]);
        stale ||= isStaleLooking(n);
      }
    }
    if (stale) {
      // Serialised chrome that arrived after connect (e.g. the parser filling in a
      // restored snapshot of a rendered host): clean it up, then route the rest.
      this._purgeStale();
      this._reconcile(notify);
      return;
    }
    if (!routing && this._placement === 'end' && end.nextSibling) {
      // Without regions the chrome comes after the consumer content, whenever
      // that content arrived (the parser after an early upgrade, a framework
      // appending), so the host reads the same as a clone or a server render.
      const late: Node[] = [];
      for (let n: ChildNode | null = end.nextSibling; n; n = n.nextSibling) late.push(n);
      for (const n of late) moveNode(host, n, start);
    }
    if (pending.length) {
      // Nodes ahead of the chrome logically precede everything already projected,
      // so they go before each region's current first node.
      const firstOf = new Map(this._regions.map(r => [r, this._regionNodes(r)[0] ?? null] as const));
      const beforeRegion = this._regions.find(r => r.target === 'before');
      // The next host-level sibling already placed in each region, for every
      // pending node: one backward pass instead of a forward scan per node
      // (which made projecting thousands of options quadratic).
      const nextPlaced = new Map<Node, Map<ProjectionRegion, Node>>();
      const last = new Map<ProjectionRegion, Node>();
      const pendingSet = new Set(pending.map(p => p[0]));
      for (let n = host.lastChild; n; n = n.previousSibling) {
        if (pendingSet.has(n)) nextPlaced.set(n, new Map(last));
        const r = this._placed.get(n);
        if (r) last.set(r, n);
      }
      // Consecutive fresh nodes bound for the end of the same container are
      // inserted together, as one fragment.
      let batch: { region: ProjectionRegion; nodes: Node[] } | null = null;
      const active = host.ownerDocument.activeElement;
      const flush = () => {
        const b = batch;
        batch = null;
        if (!b) return;
        const container = (b.region.target as () => Element | null | undefined)();
        if (!container || b.nodes.length < 2) {
          for (const n of b.nodes) this._place(n, b.region, null);
          return;
        }
        const fragment = host.ownerDocument.createDocumentFragment();
        for (const n of b.nodes) fragment.appendChild(n);
        Node.prototype.insertBefore.call(container, fragment, null);
        if (!container.hasAttribute(CONTAINER_ATTR)) container.setAttribute(CONTAINER_ATTR, b.region.name);
        this._containers.add(container);
        for (const n of b.nodes) {
          this._placed.set(n, b.region);
          if (isElement(n)) this._sawElement = true;
        }
        this._observeContainer(container);
      };
      for (const [node, nodeZone] of pending) {
        if (nodeZone === 'before' && beforeRegion && !this._initialPass && isAnchor(node)) {
          // Framework anchors (comments, whitespace) placed next to a trigger stay there.
          flush();
          this._placed.set(node, beforeRegion);
          continue;
        }
        // A node that was projected before (moved back onto the host by the consumer,
        // or lifted out by unproject()) returns to its region; others are routed.
        const region = this._placed.get(node) ?? this._route(node, nodeZone);
        if (!region) continue;
        const ref = nodeZone === 'before' ? firstOf.get(region) ?? null : nextPlaced.get(node)?.get(region) ?? null;
        const batchable =
          typeof region.target === 'function' && !region.wrap && !region.accepts &&
          (ref === null || ref.parentNode === host) && !(active && node.contains(active));
        if (batchable) {
          if (batch && batch.region !== region) flush();
          (batch ??= { region, nodes: [] }).nodes.push(node);
          if (isElement(node)) this._sawElement = true;
          continue;
        }
        flush();
        this._place(node, region, ref);
      }
      flush();
    }

    for (const region of this._regions) {
      if (region.wrap && typeof region.target === 'function') this._dropEmptyWrappers(region);
      if (typeof region.target === 'function') {
        const container = region.target();
        if (container) {
          if (!container.hasAttribute(CONTAINER_ATTR)) container.setAttribute(CONTAINER_ATTR, region.name);
          this._containers.add(container);
          this._observeContainer(container);
        }
      }
    }

    // Our own moves queue records; they carry no new information.
    this._observer?.takeRecords();

    this._warnIfRequiredMissing();

    if (!this._onChange) return;
    const signature = this._regions.flatMap(r => this._regionNodes(r));
    const changed =
      signature.length !== this._signature.length || signature.some((n, i) => n !== this._signature[i]);
    this._signature = signature;
    if (changed && notify) this._onChange();
  }

  /** Development builds only (Lit's dev build defines `enabledWarnings`); once per host. */
  private _warnIfRequiredMissing(): void {
    if (this._warned) return;
    const ctor = this._host.constructor as { enabledWarnings?: unknown };
    if (ctor.enabledWarnings === undefined) return;
    const hasElement = (r: ProjectionRegion) => this._regionNodes(r).some(isElement);
    for (const region of this._regions) {
      if (!region.required || hasElement(region)) continue;
      if (!this._regions.some(r => r !== region && hasElement(r))) continue;
      const message = region.required();
      if (!message) continue;
      this._warned = true;
      console.warn(`<${this._host.localName}>: ${message}`, this._host);
      return;
    }
  }

}

/**
 * @internal A region for a component's trigger element (dropdown-menu, popover,
 * hover-card). Mark the trigger with `slot="<name>"`; that is the supported way and
 * the only one that survives frameworks re-keying or swapping the trigger element.
 * An element with the slot is always the trigger, and once one is present no
 * unslotted element becomes the trigger. Without one, as a fallback, the first
 * element the host receives (at connect, or from the parser after an early upgrade)
 * is the trigger, and later an element the consumer puts ahead of the rendered
 * content (`prepend`, or a framework inserting next to the old trigger or its
 * placeholder comment) becomes it. Elements added anywhere else go to the
 * component's other regions. Development builds warn when projection leaves the
 * component without a trigger.
 */
export function triggerRegion(
  name: string,
  target: ProjectionTarget,
  controller: () => ProjectionController,
  host: Element
): ProjectionRegion {
  const slotted = (n: Node) => isElement(n) && n.getAttribute('slot') === name;
  // Once the consumer has used the slot, a missing trigger is deliberate (hidden
  // conditionally), not a routing problem.
  let usedSlot = false;
  return {
    name,
    target,
    required: () =>
      usedSlot
        ? null
        : `no ${name} element was projected, so the component cannot be opened. ` +
          `Mark the ${name} with slot="${name}" (required when a framework re-keys or swaps it).`,
    accepts: (node, { initial, zone }) => {
      if (!isElement(node)) return false;
      if (slotted(node)) {
        usedSlot = true;
        return true;
      }
      if (node.hasAttribute('slot')) return false;
      const existing = controller().nodes(name);
      if (existing.some(slotted) || host.querySelector(`:scope > [slot="${name}"]`)) return false;
      if (zone === 'before') return true;
      return initial && !existing.some(isElement);
    },
  };
}
