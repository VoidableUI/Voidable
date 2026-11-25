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
  accepts?: (node: Node) => boolean;
}

export interface ProjectionOptions {
  regions: ProjectionRegion[];
  /**
   * Called when the set or order of consumer nodes in any region changes after the
   * first render (children added, removed or reordered by the consumer). Not
   * called for the initial projection. Typical use: `() => this.requestUpdate()`.
   */
  onChange?: () => void;
}

/** Instance key under which a host's controller is stored (read by VoidElement's DOM overrides). */
export const PROJECTION_KEY = '__voidProjection';

type ProjectionHost = LitElement & { [PROJECTION_KEY]?: ProjectionController };

/**
 * Light-DOM content projection for {@link VoidElement} components.
 *
 * Components that render chrome with Lit and also host consumer children (text,
 * elements, framework-managed nodes) use one of these instead of snapshotting
 * `childNodes` in `connectedCallback`. Construct it in a field initializer so it
 * exists before the first connect:
 *
 * ```ts
 * private _projection = new ProjectionController(this, {
 *   regions: [{ name: 'body', target: () => this.querySelector(':scope .x-body') }],
 * });
 * ```
 *
 * ## Contract between Lit and consumer nodes
 *
 * Lit and the consumer share the host element, so the two must never own the same
 * positions:
 *
 * 1. On first connect the controller inserts two comment sentinels into the host
 *    and points the host's `renderOptions.renderBefore` at the second one. Lit's
 *    root part therefore lives strictly between the sentinels; nothing Lit does
 *    (including clearing its part when the top-level template changes) can touch
 *    a node before the first sentinel or after the second. Consumer nodes only
 *    ever live outside the sentinels or inside region containers.
 * 2. A region container must be a static element of the host's template: rendered
 *    on every render path (never behind a condition or `nothing`) and with no Lit
 *    child bindings inside it. Lit never adds, removes or reorders children of an
 *    element that has no child parts, so consumer nodes moved inside are safe.
 *    Hide closed overlays with `hidden` / an attribute instead of not rendering.
 * 3. Consumer nodes are moved exactly once, never cloned, so identity, listeners
 *    and framework references survive. Nodes the consumer appends later land after
 *    the second sentinel (outside Lit's range) and are routed by a
 *    MutationObserver; removals and reorders inside containers are observed too.
 *    This also covers elements upgraded before the parser appended their children.
 * 4. Disconnecting stops observing; nothing is torn down or rebuilt, so moving the
 *    element in the DOM or reconnecting it never duplicates wrappers.
 * 5. `VoidElement` redirects `insertBefore` / `removeChild` / `replaceChild` calls
 *    on the host whose reference node has been projected into a container, so
 *    frameworks that keep treating the host as the parent of their children
 *    (React, Solid, Vue) keep working.
 *
 * Unsupported: wiping the host's own children wholesale (`innerHTML`,
 * `textContent`, `replaceChildren`) after it has rendered, which removes Lit's
 * nodes and the sentinels.
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
  private _signature: Node[] = [];
  private _rendered = false;

  constructor(host: LitElement, options: ProjectionOptions) {
    this._host = host as ProjectionHost;
    this._regions = options.regions;
    this._onChange = options.onChange;
    this._host[PROJECTION_KEY] = this;
    host.addController(this);
  }

  hostConnected(): void {
    const host = this._host;
    if (!this._start || !this._end) {
      const doc = host.ownerDocument;
      this._start = doc.createComment('void-projection');
      this._end = doc.createComment('/void-projection');
      // Before the first render every existing child is consumer content: keep
      // it after the sentinels so it is routed once containers exist.
      const ref = host.hasUpdated ? null : host.firstChild;
      Node.prototype.insertBefore.call(host, this._end, ref);
      Node.prototype.insertBefore.call(host, this._start, this._end);
      if (!host.hasUpdated) host.renderOptions.renderBefore = this._end;
    }
    this._observer ??= new MutationObserver(() => this._reconcile(true));
    this._observer.observe(host, { childList: true });
    this._observedContainers.clear();
    if (this._rendered) this._reconcile(true);
  }

  hostDisconnected(): void {
    this._observer?.disconnect();
    this._observedContainers.clear();
  }

  hostUpdate(): void {
    if (this._rendered || !this._start || !this._end) return;
    // Anything inserted between the sentinels before the first render would end
    // up beside Lit's part; move it out so it is treated as consumer content.
    const stray: Node[] = [];
    for (let n = this._start.nextSibling; n && n !== this._end; n = n.nextSibling) stray.push(n);
    const ref = this._end.nextSibling;
    for (const n of stray) Node.prototype.insertBefore.call(this._host, n, ref);
  }

  hostUpdated(): void {
    const first = !this._rendered;
    this._rendered = true;
    this._reconcile(!first);
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
    const region = this._route(node);
    if (region && region === this._placed.get(ref) && ref.parentNode) {
      ref.parentNode.insertBefore(node, ref);
      this._placed.set(node, region);
    } else if (!region || !this._place(node, region)) {
      Node.prototype.insertBefore.call(this._host, node, null);
    }
    return node;
  }

  private _route(node: Node): ProjectionRegion | undefined {
    return this._regions.find(r => !r.accepts || r.accepts(node));
  }

  /** Moves `node` into `region`, appending. Returns false if the container is not rendered yet. */
  private _place(node: Node, region: ProjectionRegion): boolean {
    const host = this._host;
    if (region.target === 'before') {
      Node.prototype.insertBefore.call(host, node, this._start);
    } else if (region.target === 'after') {
      if (node.parentNode !== host || !this._isAfterEnd(node)) {
        Node.prototype.insertBefore.call(host, node, null);
      }
    } else {
      const container = region.target();
      if (!container) return false;
      container.appendChild(node);
      this._observeContainer(container);
    }
    this._placed.set(node, region);
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
    if (!this._rendered || !start || !end || start.parentNode !== host || end.parentNode !== host) return;

    // Route consumer nodes that sit directly on the host and are not yet where
    // their region wants them: nodes present before the first render, nodes
    // appended later, and nodes the consumer moved back onto the host.
    const pending: Node[] = [];
    let zone: 'before' | 'lit' | 'after' = 'before';
    for (let n = host.firstChild; n; n = n.nextSibling) {
      if (n === start) zone = 'lit';
      else if (n === end) zone = 'after';
      else if (zone !== 'lit' && this._placed.get(n)?.target !== zone) pending.push(n);
    }
    for (const node of pending) {
      const region = this._route(node);
      if (region) this._place(node, region);
    }

    for (const region of this._regions) {
      if (typeof region.target === 'function') {
        const container = region.target();
        if (container) this._observeContainer(container);
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
}
