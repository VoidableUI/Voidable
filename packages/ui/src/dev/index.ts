// `@voidable/ui/dev`: development-time warnings. Importing this module starts
// it. Import it once, in development builds only:
//
//   import '@voidable/ui/dev';
//   // or, with no bundler, through an import map:
//   //   <script type="module">import '@voidable/ui/dev.js'</script>
//
// It watches the document and reports through `console.warn` what would
// otherwise fail silently: an attribute the element does not declare, a value
// outside the declared set, `disabled="false"`, a child in the wrong parent or a
// required child that is missing, an element that needs an accessible name and
// has none (judged after upgrade, on the live DOM), a `void-*` tag nothing defines, a listener
// for a `void-*` event nothing dispatches, a script that keeps removing an
// attribute a component manages (reported by the component, which stops
// restoring it). Each message names the element, what
// is wrong, the valid alternatives and a "did you mean" where one is close.
// Each distinct problem is reported once per element type and attribute (or
// child, or event name), so 500 table rows do not flood the console.
//
// What is valid comes from the Custom Elements Manifest (a table generated at
// build time, see packages/ui/cem/dev-table.js), never from a list kept here.
// This module imports nothing from the components, so the root entry
// (`@voidable/ui`) never contains it or its table.
//
// In a test suite, turn warnings into errors:
//
//   import { configure } from '@voidable/ui/dev';
//   configure({ throw: true });
//
// or set `window.VOIDABLE_DEV = { throw: true }` before this module loads.
import {
  checkAttribute,
  checkAttributes,
  checkDefined,
  checkEvent,
  checkName,
  checkParent,
  checkRequired,
  keyOf,
} from './rules.js';
import { styled, table } from './table.generated.js';
import type { DevWarning } from './types.js';

export type { DevWarning, WarningKind } from './types.js';

export interface DevOptions {
  /** Throw a `VoidDevError` instead of logging, and report every occurrence (for test suites). */
  throw?: boolean;
  /** Receive each warning instead of `console.warn`. */
  onWarning?: (warning: DevWarning) => void;
  /** Tags to leave alone, for `void-*` elements your own code defines. */
  ignoreTags?: readonly string[];
  /** Attribute names (or patterns) to leave alone on every element. */
  ignoreAttributes?: readonly (string | RegExp)[];
  /** `void-*` event names to leave alone, for events your own code dispatches. */
  ignoreEvents?: readonly string[];
  /** How long nothing may happen (load, a component being defined, a resource arriving) before the page counts as settled and undefined tags, wrong parents and missing children are judged. Default 500. */
  settleMs?: number;
}

/** Thrown in `throw` mode. `warning` carries the structured problem. */
export class VoidDevError extends Error {
  readonly warning: DevWarning;
  constructor(warning: DevWarning) {
    super(warning.message);
    this.name = 'VoidDevError';
    this.warning = warning;
  }
}

interface Autoloading {
  ready(): Promise<void>;
}

declare global {
  var VOIDABLE_DEV: DevOptions | undefined;
}

const INTERNAL_TAGS = new Set(['void-projection-park']);
const AUTOLOADER = Symbol.for('voidable.autoloader');
const STARTED = Symbol.for('voidable.dev');

let throwing = false;
let onWarning: ((warning: DevWarning) => void) | undefined;
let ignoreTags = new Set<string>();
let ignoreAttributes: (string | RegExp)[] = [];
let ignoreEvents = new Set<string>();
let settleMs = 500;

const seen = new Set<string>();
const log: DevWarning[] = [];

export function configure(options: DevOptions): void {
  if (options.throw !== undefined) throwing = options.throw;
  if ('onWarning' in options) onWarning = options.onWarning;
  if (options.ignoreTags) ignoreTags = new Set(options.ignoreTags);
  if (options.ignoreAttributes) ignoreAttributes = [...options.ignoreAttributes];
  if (options.ignoreEvents) ignoreEvents = new Set(options.ignoreEvents);
  if (options.settleMs !== undefined) settleMs = options.settleMs;
}

function ignored(w: DevWarning): boolean {
  if (ignoreTags.has(w.tag)) return true;
  if (w.kind === 'unknown-event') return ignoreEvents.has(w.subject);
  if (w.kind === 'unknown-attribute' || w.kind === 'invalid-value' || w.kind === 'boolean-false') {
    return ignoreAttributes.some((p) => (typeof p === 'string' ? p === w.subject : p.test(w.subject)));
  }
  return false;
}

/** Report one problem: throw in throw mode, otherwise log it once per kind, tag and subject. */
function report(w: DevWarning | undefined): void {
  if (!w || ignored(w)) return;
  if (throwing) throw new VoidDevError(w);
  const key = keyOf(w);
  if (seen.has(key)) return;
  seen.add(key);
  log.push(w);
  if (onWarning) onWarning(w);
  else console.warn(w.message);
}

const isVoid = (el: Element) => el.localName.startsWith('void-') && !INTERNAL_TAGS.has(el.localName);

function voidElements(root: ParentNode | Element): Element[] {
  const out: Element[] = [];
  if (root.nodeType === 1 && isVoid(root as Element)) out.push(root as Element);
  if ('querySelectorAll' in root) for (const el of root.querySelectorAll('*')) if (isVoid(el)) out.push(el);
  return out;
}

// ── Deferred checks: wait until the page has settled ─────────────────────────

const pending = new Set<Element>();
let timer: ReturnType<typeof setTimeout> | undefined;
let scheduled = false;
let flushing: Promise<void> = Promise.resolve();

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// The page has "settled" once nothing has happened for `settleMs`: no load
// event, no `customElements.define()` (a component module evaluating), no new
// resource (a chunk or module being fetched). Lazy chunks, route-level imports
// and frameworks that mount late each reset it, so a component that is merely
// still arriving is not reported as missing.
let lastActivity = typeof performance === 'undefined' ? 0 : performance.now();
const touch = (): void => {
  lastActivity = performance.now();
};

async function settle(): Promise<void> {
  if (document.readyState === 'loading') {
    await new Promise<void>((resolve) => document.addEventListener('DOMContentLoaded', () => resolve(), { once: true }));
  }
  if (document.readyState !== 'complete') {
    await new Promise<void>((resolve) => window.addEventListener('load', () => resolve(), { once: true }));
  }
  const loader = (globalThis as Record<symbol, unknown>)[AUTOLOADER] as Autoloading | undefined;
  for (;;) {
    // The autoloader knows when every tag it can load is defined; wait for it
    // rather than guess.
    if (loader) await loader.ready();
    const quiet = performance.now() - lastActivity;
    if (quiet >= settleMs) return;
    await delay(settleMs - quiet + 5);
  }
}

function schedule(el: Element): void {
  pending.add(el);
  clearTimeout(timer);
  scheduled = true;
  timer = setTimeout(() => {
    scheduled = false;
    flushing = flushDeferred();
  }, 50);
}

async function flushDeferred(): Promise<void> {
  await settle();
  const batch = [...pending];
  pending.clear();
  const autoloading = (globalThis as Record<symbol, unknown>)[AUTOLOADER] !== undefined;
  for (const el of batch) {
    if (!el.isConnected) continue;
    report(checkDefined(table, el, autoloading, styled));
    report(checkParent(table, el));
    for (const w of checkRequired(table, el)) report(w);
    report(checkName(table, el));
  }
}

// ── Observation ───────────────────────────────────────────────────────────────

function visit(el: Element): void {
  for (const w of checkAttributes(table, el)) report(w);
  schedule(el);
}

function onMutations(records: MutationRecord[]): void {
  for (const record of records) {
    if (record.type === 'attributes') {
      const el = record.target as Element;
      if (isVoid(el) && record.attributeName) report(checkAttribute(table, el, record.attributeName));
      continue;
    }
    for (const node of record.addedNodes) {
      if (node.nodeType === 1) for (const el of voidElements(node as Element)) visit(el);
    }
  }
}

const observer: MutationObserver | undefined = typeof MutationObserver === 'undefined' ? undefined : new MutationObserver(onMutations);
const observed = new Set<Node>();

/** Also watch a ShadowRoot or other subtree the document does not contain. */
export function observe(root: ParentNode & Node): void {
  if (!observer || observed.has(root)) return;
  observed.add(root);
  for (const el of voidElements(root)) visit(el);
  observer.observe(root, { subtree: true, childList: true, attributes: true });
}

function watchActivity(): void {
  const define = CustomElementRegistry.prototype.define;
  CustomElementRegistry.prototype.define = function (this: CustomElementRegistry, ...args: Parameters<typeof define>) {
    touch();
    return define.apply(this, args);
  };
  window.addEventListener('load', touch);
  if (typeof PerformanceObserver !== 'undefined') {
    try {
      new PerformanceObserver(touch).observe({ type: 'resource', buffered: false });
    } catch {
      // Not supported: the load event and component definitions still count.
    }
  }
}

function patchEvents(): void {
  // The prototype that owns addEventListener for documents and elements:
  // EventTarget.prototype in a browser (found by walking up, so a DOM
  // implementation whose EventTarget is not the global one is patched too).
  let proto: object | null = Object.getPrototypeOf(document);
  let owner: EventTarget = EventTarget.prototype;
  while (proto && proto !== Object.prototype) {
    if (Object.hasOwn(proto, 'addEventListener')) owner = proto as EventTarget;
    proto = Object.getPrototypeOf(proto);
  }
  const original = owner.addEventListener;
  owner.addEventListener = function (this: EventTarget, type: string, ...rest: [never, never?]) {
    if (typeof type === 'string' && type.startsWith('void-')) report(checkEvent(table, this, type));
    return (original as (...args: unknown[]) => void).call(this, type, ...rest);
  } as typeof original;
}

// ── Test and tooling API ──────────────────────────────────────────────────────

/**
 * Check `root` (default: the document) now, synchronously, including undefined
 * tags and missing children (nothing is waited for). Reports each problem as
 * the observer would; in `throw` mode the first one throws. Returns the
 * problems found, deduplicated or not: this call always lists them all.
 */
export function check(root: ParentNode & Node = document): DevWarning[] {
  const found: DevWarning[] = [];
  for (const el of voidElements(root)) {
    const loader = (globalThis as Record<symbol, unknown>)[AUTOLOADER] !== undefined;
    for (const w of [...checkAttributes(table, el), checkDefined(table, el, loader), checkParent(table, el), ...checkRequired(table, el), checkName(table, el)]) {
      if (!w || ignored(w)) continue;
      found.push(w);
      report(w);
    }
  }
  return found;
}

/** Resolves when the deferred checks (undefined tags, parents, required children) have run. */
export async function settled(): Promise<readonly DevWarning[]> {
  for (;;) {
    await flushing;
    if (!scheduled && pending.size === 0) return log;
    await delay(10);
  }
}

/** Every warning reported so far (once per kind, element type and attribute). */
export function warnings(): readonly DevWarning[] {
  return log;
}

/** Forget what was reported, so the same problems can be reported again. */
export function reset(): void {
  seen.clear();
  log.length = 0;
}

function start(): void {
  if (typeof document === 'undefined' || (globalThis as Record<symbol, unknown>)[STARTED]) return;
  // `report` is how components reach this module without importing it: they
  // look it up under the same symbol and call it only when it is there.
  (globalThis as Record<symbol, unknown>)[STARTED] = { settled, check, warnings, report };
  if (globalThis.VOIDABLE_DEV) configure(globalThis.VOIDABLE_DEV);
  watchActivity();
  patchEvents();
  observe(document);
}

start();
