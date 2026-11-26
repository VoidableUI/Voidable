// `@voidable/ui/testing`: waiting for components and switching motion off, for
// tests written in any tool.
//
// In the page (a test build, never production):
//
//   <script type="module">import '@voidable/ui/testing'</script>
//
// Importing it starts a watcher that sets `data-void-ready` on <html> while
// every `void-*` element is defined and has finished its first render, and
// removes it while one is not (a late script, an element a morph, Turbo or
// LiveView just added). A selector is enough to wait on it, with no script:
//
//   html[data-void-ready]
//
// From a script in the page: `await whenReady()`.
//
// From Playwright (no import in the page needed):
//
//   import { voidReady, animationsOff } from '@voidable/ui/testing';
//   await animationsOff(page);          // before page.goto
//   await page.goto('/');
//   await voidReady(page);
//
// The module imports no component and adds nothing to any element: the
// only cost is one MutationObserver on the document, and only when it is imported.

export interface ReadyOptions {
  /** Longest wait in milliseconds before rejecting with what is still missing. Default 10000. */
  timeout?: number;
  /** Tags that must be defined even when no element on the page uses them yet. */
  expect?: string[];
  /** CSS selector of the subtree to wait for. Default: the whole document. */
  scope?: string;
}

/**
 * A page object as Playwright's `Page`. Only what the helpers call is listed, so
 * this module needs no Playwright types.
 */
export interface PageLike {
  evaluate(fn: any, arg?: any): Promise<any>;
  addInitScript(script: any, arg?: any): Promise<any>;
  goto(url: string, options?: any): Promise<any>;
}

const READY_ATTRIBUTE = 'data-void-ready';

/**
 * Resolves when the document has loaded, the autoloader (if the page uses it) has
 * defined every tag it needs, and every defined `void-*` element has finished
 * its first update, repeated until no element is pending (one render can add
 * elements). It is written without references outside itself so Playwright can
 * run it in the page by source: do not use imports or module variables inside.
 *
 * A tag that is still undefined once the page has loaded is a CSS-only part or
 * pattern (`void-card-body`) and is not waited for; name tags a script will
 * register later in `expect`.
 */
async function settleInPage(options: ReadyOptions = {}, node?: ParentNode): Promise<void> {
  const timeout = options.timeout ?? 10000;
  let waiting = 'the page to load';
  const run = async (): Promise<void> => {
    if (document.readyState !== 'complete') await new Promise<void>((resolve) => addEventListener('load', () => resolve(), { once: true }));
    for (let round = 0; round < 100; round++) {
      const autoloader = (globalThis as any)[Symbol.for('voidable.autoloader')];
      if (autoloader) {
        waiting = 'the autoloader to define every tag';
        await autoloader.ready();
      }
      for (const tag of options.expect ?? []) {
        waiting = `<${tag}> to be defined`;
        await customElements.whenDefined(tag);
      }
      const root = node ?? (options.scope ? document.querySelector(options.scope) : document);
      if (!root) throw new Error(`whenReady: nothing matches the scope "${options.scope}"`);
      const pending = (Array.from(root.querySelectorAll('*')) as any[]).filter(
        (el) => el.localName.startsWith('void-') && customElements.get(el.localName) && (el.isUpdatePending || el.hasUpdated === false),
      );
      if (!pending.length) return;
      waiting = `${pending.length} element(s) to finish rendering (<${pending[0].localName}>${pending.length > 1 ? ', ...' : ''})`;
      await Promise.all(pending.map((el) => Promise.resolve(el.updateComplete).catch(() => undefined)));
    }
    throw new Error('whenReady: the page keeps adding elements that need rendering');
  };
  if (timeout === Infinity) return run();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      run(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`whenReady: timed out after ${timeout} ms waiting for ${waiting}`)), timeout);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** In the page: resolves when every `void-*` element under `root` is defined and has rendered. */
export function whenReady(root?: ParentNode, options: Omit<ReadyOptions, 'scope'> = {}): Promise<void> {
  return settleInPage(options, root ?? document);
}

let observer: MutationObserver | undefined;

/** True when a node, or anything inside it, is a `void-*` element. */
function holdsVoid(node: Node): boolean {
  if (node.nodeType !== 1) return false;
  if ((node as Element).localName.startsWith('void-')) return true;
  for (const el of Array.from((node as Element).getElementsByTagName('*'))) if (el.localName.startsWith('void-')) return true;
  return false;
}

/**
 * Starts keeping `data-void-ready` on <html> true exactly while the page's
 * `void-*` elements are ready. Importing this module calls it; calling again does nothing.
 */
export function startReadiness(): void {
  if (typeof document === 'undefined' || observer) return;
  const html = document.documentElement;
  let generation = 0;
  const check = (): void => {
    const mine = ++generation;
    html.removeAttribute(READY_ATTRIBUTE);
    settleInPage({ timeout: Infinity }).then(
      () => {
        if (mine === generation && observer) html.setAttribute(READY_ATTRIBUTE, '');
      },
      () => undefined,
    );
  };
  observer = new MutationObserver((records) => {
    if (records.some((r) => Array.from(r.addedNodes).some(holdsVoid))) check();
  });
  observer.observe(document, { childList: true, subtree: true });
  check();
}

/** Stops the watcher and removes `data-void-ready`. */
export function stopReadiness(): void {
  observer?.disconnect();
  observer = undefined;
  if (typeof document !== 'undefined') document.documentElement.removeAttribute(READY_ATTRIBUTE);
}

/**
 * In the page: turns every theme-driven animation off (`data-anim-speed="off"`
 * on <html>, which sets `--void-anim-scale: 0`) or back to the page's own setting.
 * Toast auto-dismiss, tooltip and hover-card delays are timers, not animations,
 * and keep their durations.
 */
export function setAnimations(on: boolean, root: Element = document.documentElement): void {
  if (on) root.removeAttribute('data-anim-speed');
  else root.setAttribute('data-anim-speed', 'off');
}

startReadiness();

// ── Playwright ──────────────────────────────────────────────────────

/** Waits, in the browser, until the page's `void-*` elements are defined and rendered. */
export async function voidReady(page: PageLike, options: ReadyOptions = {}): Promise<void> {
  await page.evaluate(settleInPage, options);
}

/** Opens `url` and waits for the components. */
export async function gotoReady(page: PageLike, url: string, options: ReadyOptions & { goto?: Record<string, unknown> } = {}): Promise<void> {
  const { goto, ...ready } = options;
  await page.goto(url, goto);
  await voidReady(page, ready);
}

/**
 * Turns animation off for this page, for the current document and every
 * navigation after it. Call it before `page.goto`. Needs the theme (it is what
 * reads the attribute); `reducedMotion: 'reduce'` in Playwright's `use` options
 * has the same effect and needs nothing from this package.
 */
export async function animationsOff(page: PageLike): Promise<void> {
  // An init script can run before the document has its <html> element (WebKit, Firefox).
  const apply = (): void => {
    const set = (): void => document.documentElement.setAttribute('data-anim-speed', 'off');
    if (document.documentElement) return set();
    const wait = new MutationObserver(() => {
      if (!document.documentElement) return;
      wait.disconnect();
      set();
    });
    wait.observe(document, { childList: true });
  };
  await page.addInitScript(apply);
  await page.evaluate(apply);
}
