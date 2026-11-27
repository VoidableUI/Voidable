// SPDX-License-Identifier: MIT
//
// What the page did, in the order it did it, for diagnosing a screen reader that says the wrong thing or
// nothing. A screen reader announces state at the moment focus arrives, so the order of "focus moved" and
// "aria-expanded changed" matters; the spoken log alone cannot show it.
//
//   installTrace(page)   before page.goto: records focus changes, `role`, `tabindex`, `hidden`, `popover`
//                        and every `aria-*` attribute written by script (setAttribute and friends, in the
//                        moment they are called, so the order against a focus event in the same task is
//                        true), and popover toggles, each with a timestamp
//   readTrace(page)      the entries so far
//   formatTrace(entries) one line per entry, for a log
//   axTree(page)         Chromium only: the browser's own accessibility tree (role, name, state), through
//                        the DevTools protocol, which is what NVDA reads on Windows
//
// Loaded by the normal browser suite too (specs/screen-reader-order.spec.ts asserts the order of operations
// without a screen reader), so it imports Playwright types only.
import type { Page } from '@playwright/test';

export interface TraceEntry {
  /** Milliseconds since the page started. */
  t: number;
  kind: 'focus' | 'blur' | 'attr' | 'toggle' | 'added' | 'removed';
  /** `<tag#id role=...>` and the first words of its text. */
  target: string;
  /** For `attr`: the attribute name. */
  name?: string;
  from?: string | null;
  to?: string | null;
}

/** Runs in the page before any of its scripts. Kept as a string so it needs no bundling. */
const SCRIPT = `(() => {
  if (window.__srTrace) return;
  const trace = (window.__srTrace = []);
  const t0 = performance.now();
  const describe = (el) => {
    if (!el || el.nodeType !== 1) return String(el && el.nodeName);
    const role = el.getAttribute('role');
    const text = (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 24);
    return '<' + el.localName + (el.id ? '#' + el.id : '') + (role ? ' role=' + role : '') + '>' + (text ? ' "' + text + '"' : '');
  };
  const push = (e) => { if (trace.length < 1500) trace.push(Object.assign({ t: Math.round(performance.now() - t0) }, e)); };
  window.__srDescribe = describe;
  document.addEventListener('focusin', (e) => push({ kind: 'focus', target: describe(e.target) }), true);
  document.addEventListener('focusout', (e) => push({ kind: 'blur', target: describe(e.target) }), true);
  document.addEventListener('toggle', (e) => push({ kind: 'toggle', target: describe(e.target), to: e.newState }), true);
  const watched = (n) => n === 'role' || n === 'tabindex' || n === 'hidden' || n === 'popover' || n === 'open' || n === 'inert' || n.startsWith('aria-');
  // Attribute writes are recorded where they happen (a patched setAttribute, removeAttribute and toggleAttribute),
  // not by a MutationObserver: its records arrive after the task, so a focus event in the same task would be
  // listed before an attribute that was written first.
  const P = Element.prototype;
  const set = P.setAttribute, rem = P.removeAttribute, tog = P.toggleAttribute;
  const record = (el, name, from) => {
    const n = String(name).toLowerCase();
    const to = el.getAttribute(n);
    if (watched(n) && from !== to) push({ kind: 'attr', target: describe(el), name: n, from, to });
  };
  P.setAttribute = function (name, value) { const from = this.getAttribute(name); const r = set.call(this, name, value); record(this, name, from); return r; };
  P.removeAttribute = function (name) { const from = this.getAttribute(name); const r = rem.call(this, name); record(this, name, from); return r; };
  P.toggleAttribute = function (name, force) { const from = this.getAttribute(name); const r = tog.call(this, name, force); record(this, name, from); return r; };
})();`;

export async function installTrace(page: Page): Promise<void> {
  await page.addInitScript(SCRIPT);
}

export async function readTrace(page: Page): Promise<TraceEntry[]> {
  return page.evaluate(() => ((window as unknown as { __srTrace?: unknown[] }).__srTrace ?? []) as never);
}

/** Empties the trace, so what follows starts from a known point. */
export async function clearTrace(page: Page): Promise<void> {
  await page.evaluate(() => {
    const t = (window as unknown as { __srTrace?: unknown[] }).__srTrace;
    if (t) t.length = 0;
  });
}

export function formatTrace(entries: TraceEntry[]): string {
  return entries
    .map((e) => {
      const what =
        e.kind === 'attr' ? `${e.name}: ${e.from === null ? '(none)' : JSON.stringify(e.from)} -> ${e.to === null ? '(removed)' : JSON.stringify(e.to)}` : e.kind === 'toggle' ? `popover ${e.to}` : e.kind;
      return `    ${String(e.t).padStart(6)}ms  ${what}  ${e.target}`;
    })
    .join('\n');
}

interface AXValue {
  value?: unknown;
}
interface AXNode {
  nodeId: string;
  ignored?: boolean;
  role?: AXValue;
  name?: AXValue;
  value?: AXValue;
  description?: AXValue;
  properties?: { name: string; value: AXValue }[];
  childIds?: string[];
  parentId?: string;
}

/** Roles that say nothing a screen reader would add. */
const QUIET = new Set(['generic', 'none', 'StaticText', 'InlineTextBox', 'LineBreak', 'paragraph', 'RootWebArea']);

/**
 * The browser's accessibility tree as text, one node per line (indented by depth), with the states a screen
 * reader speaks. Chromium only (the DevTools protocol); other engines get a one-line note.
 */
export async function axTree(page: Page): Promise<string> {
  try {
    const cdp = await page.context().newCDPSession(page);
    try {
      const { nodes } = (await cdp.send('Accessibility.getFullAXTree')) as { nodes: AXNode[] };
      const byId = new Map(nodes.map((n) => [n.nodeId, n]));
      const lines: string[] = [];
      const walk = (n: AXNode, depth: number): void => {
        const role = String(n.role?.value ?? '');
        const shown = !n.ignored && !QUIET.has(role);
        if (shown) {
          const props = (n.properties ?? [])
            .filter((p) => !['focusable', 'url', 'readonly', 'multiline'].includes(p.name))
            .map((p) => `${p.name}=${String(p.value?.value)}`)
            .join(' ');
          const name = String(n.name?.value ?? '');
          const desc = n.description?.value ? ` desc=${JSON.stringify(n.description.value)}` : '';
          const value = n.value?.value !== undefined && n.value.value !== '' ? ` value=${JSON.stringify(n.value.value)}` : '';
          lines.push(`    ${'  '.repeat(depth)}${role}${name ? ` ${JSON.stringify(name)}` : ''}${value}${desc}${props ? ` [${props}]` : ''}`);
        }
        for (const id of n.childIds ?? []) {
          const child = byId.get(id);
          if (child) walk(child, shown ? depth + 1 : depth);
        }
      };
      const root = nodes.find((n) => !n.parentId) ?? nodes[0];
      if (root) walk(root, 0);
      return lines.join('\n');
    } finally {
      await cdp.detach().catch(() => undefined);
    }
  } catch (e) {
    return `    (no accessibility tree from this browser: ${(e as Error).message.split('\n')[0]})`;
  }
}
