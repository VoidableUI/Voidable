// The engine behind `@voidable/ui/autoloader`: watch a document for `void-*`
// tags and load, once each, only the component modules the page uses.
//
// This file knows nothing about which tags exist. The entry (autoloader.ts)
// hands it a tag -> module table generated from the Custom Elements Manifest.
// Keeping the two apart lets the logic be tested with fake loaders.

/** Loads one component module. Resolves once the module has been evaluated. */
export type ModuleLoader = () => Promise<unknown>;

export interface AutoloaderOptions {
  /** tag name -> module name (`void-option` -> `multiselect`). */
  tags: Readonly<Record<string, string>>;
  /**
   * module name -> loader. Bundlers see a literal `import('./components/x.js')`
   * per module, which is what makes them split one chunk per component.
   */
  modules: Readonly<Record<string, ModuleLoader>>;
  /**
   * Load `<base><module>.js` instead of using `modules`, e.g. a CDN or vendored
   * directory of the package's `dist/components/`. Resolved against the
   * document's base URL.
   */
  base?: string;
  /** Called when a module fails to load. Defaults to `console.error`. */
  onError?: (module: string, error: unknown) => void;
}

export interface Autoloader {
  /** Scan `document` now and keep watching it. Safe to call twice. */
  start(): void;
  /** Stop watching every root. Modules already loaded stay loaded. */
  stop(): void;
  /**
   * Also watch `root` (a ShadowRoot, or a detached subtree you will attach
   * later). The document is watched by `start()`.
   */
  observe(root: ParentNode): void;
  /**
   * Resolves when every `void-*` element in the document and in observed
   * roots, including elements the loaded components render, is defined.
   * Never rejects: a module that failed to load is listed in `failed`.
   */
  ready(): Promise<void>;
  /** Change where modules load from. Affects modules not yet requested. */
  configure(options: { base?: string }): void;
  /** Module names whose import has resolved. */
  readonly loaded: ReadonlySet<string>;
  /** Module names whose import rejected, with the error. */
  readonly failed: ReadonlyMap<string, unknown>;
}

export function createAutoloader(options: AutoloaderOptions): Autoloader {
  const { tags, modules } = options;
  const onError = options.onError ?? ((name, error) => console.error(`[voidable] failed to load ${name}`, error));
  let base = options.base;

  const selector = Object.keys(tags).join(',');
  const loaded = new Set<string>();
  const failed = new Map<string, unknown>();
  const inflight = new Map<string, Promise<void>>();
  const roots = new Set<ParentNode>();
  let observer: MutationObserver | undefined;
  let started = false;
  // False while modules have loaded since the last settling pass in ready().
  let settled = true;

  const defined = (tag: string) => typeof customElements !== 'undefined' && customElements.get(tag) !== undefined;

  function importModule(name: string): Promise<unknown> {
    if (base !== undefined) {
      const doc = typeof document === 'undefined' ? undefined : document;
      const dir = new URL(base.endsWith('/') ? base : `${base}/`, doc?.baseURI ?? globalThis.location?.href);
      return import(/* @vite-ignore */ new URL(`${name}.js`, dir).href);
    }
    const load = modules[name];
    if (!load) return Promise.reject(new Error(`no loader for module "${name}"`));
    return load();
  }

  function request(tag: string, retry: boolean): void {
    const name = Object.hasOwn(tags, tag) ? tags[tag] : undefined;
    if (name === undefined || defined(tag) || inflight.has(name)) return;
    // A module that failed is retried when one of its tags is added again (a
    // flaky network should not strand the page until reload), but not by a
    // rescan of elements already there, which would loop forever offline.
    if (failed.has(name)) {
      if (!retry) return;
      failed.delete(name);
    }
    const pending = importModule(name).then(
      () => {
        loaded.add(name);
        settled = false;
      },
      (error: unknown) => {
        failed.set(name, error);
        onError(name, error);
      },
    );
    inflight.set(name, pending);
    void pending.finally(() => {
      inflight.delete(name);
    });
  }

  /** Request every not-yet-defined known tag at or under `node`. */
  function scan(node: ParentNode | Element, retry = false): void {
    if (node.nodeType === 1 && Object.hasOwn(tags, (node as Element).localName)) {
      request((node as Element).localName, retry);
    }
    if ('querySelectorAll' in node && selector) {
      for (const el of node.querySelectorAll(selector)) request(el.localName, retry);
    }
  }

  function flush(records: MutationRecord[]): void {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node.nodeType === 1) scan(node as Element, true);
      }
    }
  }

  function watch(root: ParentNode): void {
    if (roots.has(root)) return;
    roots.add(root);
    scan(root, true);
    observer?.observe(root, { childList: true, subtree: true });
  }

  const nextTask = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

  async function ready(): Promise<void> {
    if (!started) return;
    for (;;) {
      // Mutations the observer has not delivered yet, then every watched tree.
      if (observer) flush(observer.takeRecords());
      for (const root of roots) scan(root);
      if (inflight.size) {
        await Promise.all(inflight.values());
        settled = false;
        continue;
      }
      if (settled) return;
      // A module that just evaluated defined its tags, which upgraded their
      // elements; the first render may add elements of other tags. Lit renders
      // on a microtask, so a task later those children are in the tree: scan
      // once more before declaring the page defined.
      await nextTask();
      settled = true;
    }
  }

  return {
    start() {
      if (started || typeof document === 'undefined') return;
      started = true;
      observer = new MutationObserver(flush);
      watch(document);
    },
    stop() {
      observer?.disconnect();
      observer = undefined;
      roots.clear();
      started = false;
    },
    observe(root) {
      if (!started) return;
      watch(root);
    },
    ready,
    configure(next) {
      if ('base' in next) base = next.base;
    },
    loaded,
    failed,
  };
}
