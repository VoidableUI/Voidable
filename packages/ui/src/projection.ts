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
}

export interface ProjectionOptions {
  regions: ProjectionRegion[];
  /**
   * Called when the set or order of consumer nodes in any region changes after the
   * first render (children added, removed or reordered by the consumer), and after
   * the controller recovered from its markers being removed (see the class docs).
   * Not called for the initial projection. Typical use: `() => this.requestUpdate()`.
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

type ProjectionHost = LitElement & { [PROJECTION_KEY]?: ProjectionController };

const isElement = (n: Node): n is Element => n.nodeType === Node.ELEMENT_NODE;
const isComment = (n: Node): n is Comment => n.nodeType === Node.COMMENT_NODE;
const isStaleLooking = (n: Node): boolean =>
  (isComment(n) && (n.data === START_DATA || n.data === END_DATA)) ||
  (isElement(n) && n.hasAttribute(CHROME_ATTR));
const isAnchor = (n: Node): boolean =>
  isComment(n) || (n.nodeType === Node.TEXT_NODE && !(n.textContent ?? '').trim());

/**
 * @internal Experimental: the API may change before it is made public.
 *
 * Light-DOM content projection for {@link VoidElement} components.
 *
 * Components that render chrome with Lit and also host consumer children (text,
 * elements, framework-managed nodes) use one of these instead of snapshotting
 * `childNodes` in `connectedCallback`. Construct it in a field initializer so it
 * exists before the first connect:
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
 *    and framework references survive. Nodes the consumer adds later land outside
 *    the markers and are routed by a MutationObserver, keeping their position
 *    relative to the region's other nodes; removals and reorders inside containers
 *    are observed too. This also covers elements upgraded before the parser
 *    appended their children.
 * 4. Disconnecting stops observing; nothing is torn down or rebuilt, so moving the
 *    element in the DOM or reconnecting it never duplicates wrappers.
 * 5. `VoidElement` redirects `insertBefore` / `removeChild` / `replaceChild` calls
 *    on the host whose reference node has been projected into a container, and
 *    makes the `textContent` setter and `replaceChildren` replace only consumer
 *    content, so frameworks that keep treating the host as the parent of their
 *    children (React, Solid, Vue) keep working.
 * 6. Recovery: if the markers are removed (a server-side morph such as idiomorph,
 *    `host.innerHTML = …`, `innerText`), the controller discards whatever is left of
 *    the old chrome, inserts fresh markers (Lit keys its root part on the
 *    `renderBefore` node, so this yields a clean part), and re-renders, projecting
 *    the host's current children as if they were initial content. A host created by
 *    `cloneNode(true)` or an `outerHTML` round-trip of a rendered host is cleaned up
 *    the same way on first connect: container contents are lifted back onto the
 *    host and the stale chrome is dropped.
 *
 * Consequences for consumers: after projection, `host.children` lists the rendered
 * chrome rather than the consumer's children, and `child.parentNode === host` no
 * longer holds for projected children. Use `child.closest('void-…')` or keep your
 * own references.
 */
export class ProjectionController implements ReactiveController {
  private readonly _host: ProjectionHost;
  private readonly _regions: ProjectionRegion[];
  private readonly _onChange?: () => void;
  private _start: Comment | null = null;
  private _end: Comment | null = null;
  private _observer: MutationObserver | null = null;
  private _observedContainers = new Set<Element>();
  private _placed = new WeakMap<Node, ProjectionRegion>();
  /** Top-level text/comment nodes Lit rendered, with their data at render time. */
  private _litText = new WeakMap<Node, string>();
  private _signature: Node[] = [];
  private _rendered = false;
  private _recovered = false;
  private _initialPass = false;
  private _sawElement = false;
  constructor(host: LitElement, options: ProjectionOptions) {
    this._host = host as ProjectionHost;
    this._regions = options.regions;
    this._onChange = options.onChange;
    this._host[PROJECTION_KEY] = this;
    host.addController(this);
  }

  hostConnected(): void {
    const host = this._host;
    if (!this._start) {
      this._init(false);
    } else if (!this._intact()) {
      this._init(true);
      host.requestUpdate();
    }
    this._observer ??= new MutationObserver(() => this._onMutation());
    this._observer.observe(host, { childList: true });
    this._observedContainers.clear();
    if (this._rendered) this._reconcile(true);
  }

  hostDisconnected(): void {
    this._observer?.disconnect();
    this._observedContainers.clear();
  }

  hostUpdate(): void {
    if (!this._start || !this._end) return;
    if (!this._intact()) {
      // Markers vanished since the last render; re-initialise so this render
      // builds a fresh root part instead of patching detached nodes.
      this._init(true);
      return;
    }
    if (this._rendered) return;
    // Anything inserted between the markers before the first render would end up
    // beside Lit's part; move it out so it is treated as consumer content.
    const stray: Node[] = [];
    for (let n = this._start.nextSibling; n && n !== this._end; n = n.nextSibling) stray.push(n);
    const ref = this._end.nextSibling;
    for (const n of stray) Node.prototype.insertBefore.call(this._host, n, ref);
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
    return !!parent && parent !== this._host && parent === region.target();
  }

  /** `host.insertBefore(node, ref)` where `ref` has been projected into a container. */
  insertBefore<T extends Node>(node: T, ref: Node): T {
    if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      for (const child of Array.from(node.childNodes)) this.insertBefore(child, ref);
      return node;
    }
    const region = this._route(node, 'insert');
    if (region && region === this._placed.get(ref) && ref.parentNode) {
      ref.parentNode.insertBefore(node, ref);
      this._placed.set(node, region);
      if (isElement(node)) this._sawElement = true;
    } else if (!region || !this._place(node, region, null)) {
      Node.prototype.insertBefore.call(this._host, node, null);
    }
    return node;
  }

  /**
   * Replaces all consumer content (every region, plus anything not yet routed) with
   * `nodes`, leaving the rendered chrome alone. Backs `textContent = …` and
   * `replaceChildren(…)` on the host. Returns false if the markers are not intact,
   * in which case the caller should fall back to the native operation.
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
    for (const n of doomed) n.parentNode?.removeChild(n);
    for (const n of nodes) Node.prototype.insertBefore.call(host, n, null);
    if (this._rendered) this._reconcile(true);
    return true;
  }

  private _intact(): boolean {
    const host = this._host;
    const start = this._start;
    const end = this._end;
    if (!start || !end || start.parentNode !== host || end.parentNode !== host) return false;
    for (let n = start.nextSibling; n; n = n.nextSibling) if (n === end) return true;
    return false;
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
    Node.prototype.insertBefore.call(host, end, host.firstChild);
    Node.prototype.insertBefore.call(host, start, end);
    this._start = start;
    this._end = end;
    // Lit keys its root part on renderBefore, so a new end marker means a clean part.
    host.renderOptions.renderBefore = end;
    this._placed = new WeakMap();
    this._litText = new WeakMap();
    this._observedContainers.clear();
    this._signature = [];
    this._rendered = false;
    this._recovered = recovering;
    this._sawElement = false;
  }

  /**
   * Removes stale markers and chrome from the host (never the live markers or
   * anything between them), lifting the contents of stale containers back onto the
   * host in their place. Stale nodes come from a clone or serialisation of a
   * rendered host, or are what is left of this host's own chrome after its markers
   * were removed.
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
    if (!stale.length) return;
    for (const node of stale) {
      for (const container of this._staleContainers(node)) {
        for (const child of Array.from(container.childNodes)) {
          Node.prototype.insertBefore.call(host, child, node);
        }
      }
    }
    for (const node of stale) {
      if (node.parentNode === host) Node.prototype.removeChild.call(host, node);
    }
  }

  /** Region containers inside a stale chrome node that belong to this host, outermost first. */
  private _staleContainers(node: Node): Element[] {
    if (!isElement(node)) return [];
    const found = [node, ...Array.from(node.querySelectorAll(`[${CONTAINER_ATTR}]`))].filter(
      el => el.hasAttribute(CONTAINER_ATTR)
    );
    return found.filter(el => {
      // Skip containers that belong to another component nested in the chrome, and
      // containers nested inside one already being lifted.
      for (let p = el.parentElement; p && p !== node.parentNode; p = p.parentElement) {
        if (p !== el && (p.hasAttribute(CONTAINER_ATTR) || p.localName.includes('-'))) return false;
      }
      return true;
    });
  }

  /** Tags Lit's top-level nodes so stale chrome can be recognised later. */
  private _markChrome(): void {
    for (let n = this._start?.nextSibling; n && n !== this._end; n = n.nextSibling) {
      if (isElement(n)) {
        if (!n.hasAttribute(CHROME_ATTR)) n.setAttribute(CHROME_ATTR, '');
      } else {
        this._litText.set(n, (n as CharacterData).data);
      }
    }
  }

  private _onMutation(): void {
    if (this._start && !this._intact()) {
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
      Node.prototype.insertBefore.call(host, node, before);
    } else if (region.target === 'after') {
      if (node.parentNode === host && this._isAfterEnd(node)) {
        // Already after the chrome, where the consumer put it.
      } else if (validRef && validRef.parentNode === host && this._isAfterEnd(validRef)) {
        Node.prototype.insertBefore.call(host, node, validRef);
      } else {
        Node.prototype.insertBefore.call(host, node, null);
      }
    } else {
      const container = region.target();
      if (!container) return false;
      if (!container.hasAttribute(CONTAINER_ATTR)) container.setAttribute(CONTAINER_ATTR, region.name);
      container.insertBefore(node, validRef && validRef.parentNode === container ? validRef : null);
      this._observeContainer(container);
    }
    this._placed.set(node, region);
    if (isElement(node)) this._sawElement = true;
    return true;
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
          if (this._placed.get(n) === region) out.push(n);
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
    for (let n = host.firstChild; n; n = n.nextSibling) {
      if (n === start) zone = 'lit';
      else if (n === end) zone = 'after';
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
    if (pending.length) {
      // Nodes ahead of the chrome logically precede everything already projected,
      // so they go before each region's current first node.
      const firstOf = new Map(this._regions.map(r => [r, this._regionNodes(r)[0] ?? null] as const));
      const beforeRegion = this._regions.find(r => r.target === 'before');
      for (const [node, nodeZone] of pending) {
        if (nodeZone === 'before' && beforeRegion && !this._initialPass && isAnchor(node)) {
          // Framework anchors (comments, whitespace) placed next to a trigger stay there.
          this._placed.set(node, beforeRegion);
          continue;
        }
        const region = this._route(node, nodeZone);
        if (!region) continue;
        const ref = nodeZone === 'before' ? firstOf.get(region) ?? null : this._nextInRegion(node, region);
        this._place(node, region, ref);
      }
    }

    for (const region of this._regions) {
      if (typeof region.target === 'function') {
        const container = region.target();
        if (container) {
          if (!container.hasAttribute(CONTAINER_ATTR)) container.setAttribute(CONTAINER_ATTR, region.name);
          this._observeContainer(container);
        }
      }
    }

    // Our own moves queue records; they carry no new information.
    this._observer?.takeRecords();

    if (!this._onChange) return;
    const signature = this._regions.flatMap(r => this._regionNodes(r));
    const changed =
      signature.length !== this._signature.length || signature.some((n, i) => n !== this._signature[i]);
    this._signature = signature;
    if (changed && notify) this._onChange();
  }

  /** The next host-level sibling of `node` already placed in `region`, if any. */
  private _nextInRegion(node: Node, region: ProjectionRegion): Node | null {
    for (let n = node.nextSibling; n; n = n.nextSibling) {
      if (this._placed.get(n) === region) return n;
    }
    return null;
  }
}

/**
 * @internal A region for a component's trigger element (dropdown-menu, popover,
 * hover-card). An element with `slot="<name>"` is always the trigger, and once one
 * is present no unslotted element becomes the trigger. Without one, the first
 * element the host receives (at connect, or from the parser after an early
 * upgrade) is the trigger, and later an element the consumer puts ahead of the
 * rendered content (where the trigger lives: `prepend`, or a framework inserting
 * next to the old trigger or its placeholder comment) becomes it. Elements added
 * anywhere else go to the component's other regions, so a trigger that a framework
 * re-inserts relative to the panel's items needs `slot="<name>"`.
 */
export function triggerRegion(
  name: string,
  target: ProjectionTarget,
  controller: () => ProjectionController,
  host: Element
): ProjectionRegion {
  const slotted = (n: Node) => isElement(n) && n.getAttribute('slot') === name;
  return {
    name,
    target,
    accepts: (node, { initial, zone }) => {
      if (!isElement(node)) return false;
      if (slotted(node)) return true;
      if (node.hasAttribute('slot')) return false;
      const existing = controller().nodes(name);
      if (existing.some(slotted) || host.querySelector(`:scope > [slot="${name}"]`)) return false;
      if (zone === 'before') return true;
      return initial && !existing.some(isElement);
    },
  };
}
