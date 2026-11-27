// The checks behind `@voidable/ui/dev`. Pure functions of a DOM element (or a
// name) and the table generated from the Custom Elements Manifest, so they are
// testable with a hand-written table and never touch the page.
import type { AttrRule, DevName, DevRenamedAttribute, DevTable, DevTag, DevWarning } from './types.js';

const PREFIX = '[voidable]';

/** HTML global attributes (and the few every framework puts on every element). */
const GLOBAL_ATTRIBUTES = new Set([
  'id', 'class', 'style', 'slot', 'title', 'lang', 'dir', 'hidden', 'tabindex', 'role', 'accesskey', 'autofocus',
  'contenteditable', 'draggable', 'enterkeyhint', 'inert', 'inputmode', 'is', 'itemid', 'itemprop', 'itemref',
  'itemscope', 'itemtype', 'nonce', 'part', 'exportparts', 'popover', 'spellcheck', 'translate', 'autocapitalize',
  'writingsuggestions', 'virtualkeyboardpolicy', 'elementtiming', 'xmlns', 'key', 'ref',
]);

/**
 * Attributes that belong to the page, a framework or a template language and
 * never to the component: `aria-*`, `data-*` (Turbo, Stimulus, Astro),
 * `x-*` (Alpine), `hx-*`, `v-*`, `ng-*`, `_ngcontent-*`, `phx-*`, `up-*`,
 * anything with a namespace colon (`wire:model`, `on:click`, `client:load`,
 * `q:slot`), template bindings (`:prop`, `@event`, `[prop]`, `(event)`,
 * `*ngIf`, `#ref`, `?flag`, `.prop`) and inline handlers (`onclick`).
 */
const FRAMEWORK_ATTRIBUTE =
  /^(?:aria-|data-|x-|hx-|v-|ng-|_ng|phx-|up-|sveltekit-|on[a-z]|[@:[(*#?._])|:/;

export function isForeignAttribute(name: string): boolean {
  return GLOBAL_ATTRIBUTES.has(name) || FRAMEWORK_ATTRIBUTE.test(name);
}

/** Edit distance, capped: returns `max + 1` when it exceeds `max`. */
function distance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      row.push(v);
      if (v < best) best = v;
    }
    if (best > max) return max + 1;
    prev = row;
  }
  return prev[b.length];
}

const squash = (s: string) => s.toLowerCase().replace(/[-_\s]/g, '');

/** Words people reach for that mean one of the library's values. */
const SYNONYMS: Record<string, string> = {
  danger: 'error', destructive: 'error', critical: 'error', negative: 'error', red: 'error', invalid: 'error',
  warn: 'warning', orange: 'warning', ok: 'success', positive: 'success', green: 'success', valid: 'success',
  neutral: 'default', primary: 'default', secondary: 'default', normal: 'default', none: 'default',
  small: 'sm', medium: 'md', large: 'lg', mini: 'sm', tiny: 'xs', big: 'lg', regular: 'md',
  solid: 'filled', contained: 'filled', bordered: 'outline', outlined: 'outline', flat: 'ghost',
};

/** The closest candidate to `input`, or undefined when nothing is plausibly meant. */
export function suggest(input: string, candidates: readonly string[], synonyms = false): string | undefined {
  const key = squash(input);
  if (!key) return undefined;
  const exact = candidates.find((c) => squash(c) === key);
  if (exact) return exact;
  if (synonyms) {
    const alias = SYNONYMS[key];
    if (alias && candidates.includes(alias)) return alias;
  }
  const max = key.length <= 4 ? 1 : 2;
  let best: string | undefined;
  let bestDistance = max + 1;
  for (const c of candidates) {
    const d = distance(key, squash(c), max);
    if (d < bestDistance) {
      best = c;
      bestDistance = d;
    }
  }
  return best;
}

const list = (items: readonly string[]) => items.join(', ');
const tags = (items: readonly string[]) => items.map((t) => `<${t}>`).join(' or ');

/** `<void-button id="save" color="primary">`: the tag, its identity and the attribute at issue. */
export function describe(el: Element, attribute?: string): string {
  const parts = [el.localName];
  for (const name of ['id', 'name']) {
    const v = el.getAttribute(name);
    if (v && name !== attribute) parts.push(`${name}="${v.length > 24 ? `${v.slice(0, 24)}...` : v}"`);
  }
  if (attribute) {
    const v = el.getAttribute(attribute);
    parts.push(v === null ? attribute : `${attribute}="${v.length > 24 ? `${v.slice(0, 24)}...` : v}"`);
  }
  return `<${parts.join(' ')}>`;
}

function warning(kind: DevWarning['kind'], tag: string, subject: string, message: string, element?: Element): DevWarning {
  return { kind, tag, subject, message: `${PREFIX} ${message}`, element };
}

function isNumber(value: string): boolean {
  return value.trim() !== '' && Number.isFinite(Number(value));
}

/**
 * The markup to write instead of the 0.8-renamed attribute `name="value"`
 * (#23): the replacement given for that value, else the new name with the same
 * value, else the advice.
 */
export function renamedReplacement(rule: DevRenamedAttribute, value: string): string {
  if (rule.values && Object.hasOwn(rule.values, value)) return rule.values[value]!;
  if (rule.to) return value === '' ? rule.to : `${rule.to}="${value}"`;
  return rule.fix ?? '';
}

function written(name: string, value: string): string {
  return value === '' ? name : `${name}="${value}"`;
}

/** The problem with attribute `name` on `el`, if any. */
/** The `keys` attribute (#90): a JSON object whose names are actions the element has (read from its class, `static keyMap`). */
function checkKeys(el: Element, value: string, where: string): DevWarning | undefined {
  if (!value.trim()) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    parsed = undefined;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return warning('keys', el.localName, 'keys', `${where}: keys must be a JSON object such as {"close":[]}, so it is ignored.`, el);
  }
  const map = (customElements.get(el.localName) as { keyMap?: Readonly<Record<string, unknown>> } | undefined)?.keyMap;
  if (!map) return undefined;
  const actions = Object.keys(map);
  for (const action of Object.keys(parsed)) {
    if (action in map) continue;
    const near = suggest(action, actions);
    return warning(
      'keys',
      el.localName,
      action,
      `${where}: ${el.localName} has no key action "${action}", so it does nothing. ${near ? `Did you mean "${near}"?` : `Its actions: ${actions.join(', ')}.`}`,
      el,
    );
  }
  return undefined;
}

export function checkAttribute(table: DevTable, el: Element, name: string): DevWarning | undefined {
  const tag = table[el.localName];
  if (!tag) return undefined;
  const rule: AttrRule | undefined = Object.hasOwn(tag.a, name) ? tag.a[name] : undefined;
  const value = el.getAttribute(name);
  if (value === null) return undefined;
  const where = describe(el, name);

  if (name === 'keys' && rule !== undefined) return checkKeys(el, value, where);

  if (rule === undefined) {
    if (tag.h?.includes(name) || isForeignAttribute(name)) return undefined;
    const old = tag.l?.a && Object.hasOwn(tag.l.a, name) ? tag.l.a[name] : undefined;
    if (old) {
      const renames = !!old.to || (!!old.values && Object.hasOwn(old.values, value));
      return warning(
        'legacy-markup',
        el.localName,
        name,
        renames
          ? `${where}: ${written(name, value)} was renamed in Void UI 0.8, so it does nothing. Write ${renamedReplacement(old, value)} instead.`
          : `${where}: ${written(name, value)} was removed in Void UI 0.8, so it does nothing. Instead ${renamedReplacement(old, value)}.`,
        el,
      );
    }
    const declared = Object.keys(tag.a).sort();
    const near = suggest(name, declared);
    const hint = Object.hasOwn(tag.x ?? {}, name.toLowerCase()) ? tag.x![name.toLowerCase()] : undefined;
    const rest = [
      near ? `Did you mean "${near}"?` : '',
      hint ? `Instead ${hint}.` : '',
      !near && !hint ? (declared.length ? `Valid attributes: ${list(declared)}.` : `${el.localName} takes no attributes.`) : '',
    ].filter(Boolean);
    return warning(
      'unknown-attribute',
      el.localName,
      name,
      `${where}: "${name}" is not an attribute of ${el.localName}, so it does nothing. ${rest.join(' ')}`.trim(),
      el,
    );
  }

  // A value renamed in 0.8 (an enum value, or "false" on a number such as stagger).
  const renamedTo = tag.l?.v?.[name] && Object.hasOwn(tag.l.v[name]!, value) ? tag.l.v[name]![value] : undefined;
  if (renamedTo !== undefined && !(Array.isArray(rule) && rule.includes(value))) {
    return warning(
      'legacy-markup',
      el.localName,
      name,
      `${where}: ${name}="${value}" was renamed in Void UI 0.8, so it is ignored. Write ${name}="${renamedTo}" instead.`,
      el,
    );
  }
  if (Array.isArray(rule)) {
    if (rule.includes(value)) return undefined;
    const shown = rule.map((v) => (v === '' ? '""' : v));
    const near = suggest(value, rule.filter((v) => v !== ''), true);
    return warning(
      'invalid-value',
      el.localName,
      name,
      `${where}: "${value}" is not a valid value for ${name}, so it is ignored. Valid values: ${list(shown)}.${near ? ` Did you mean "${near}"?` : ''}`,
      el,
    );
  }
  if (rule === 1) {
    if (value.toLowerCase() === 'false') {
      return warning(
        'boolean-false',
        el.localName,
        name,
        `${where}: ${name} is a boolean attribute, on whenever it is present, so ${name}="false" does not turn it off. Remove the attribute to turn it off.`,
        el,
      );
    }
    return undefined;
  }
  if (rule === 2 && !isNumber(value)) {
    return warning(
      'invalid-value',
      el.localName,
      name,
      `${where}: "${value}" is not a number, so ${name} is ignored. Write a plain number such as ${name}="10".`,
      el,
    );
  }
  return undefined;
}

/** Every attribute problem on `el`. */
export function checkAttributes(table: DevTable, el: Element): DevWarning[] {
  const out: DevWarning[] = [];
  if (!table[el.localName]) return out;
  for (const attr of Array.from(el.attributes)) {
    const w = checkAttribute(table, el, attr.name);
    if (w) out.push(w);
  }
  return out;
}

const PARKING = 'void-projection-park';

/** The nearest `void-*` ancestor, for the message. */
function voidAncestor(el: Element): Element | null {
  for (let p = el.parentElement; p; p = p.parentElement) if (p.localName.startsWith('void-')) return p;
  return null;
}

/** A child that is not inside any parent the manifest allows. */
export function checkParent(table: DevTable, el: Element): DevWarning | undefined {
  const allowed = table[el.localName]?.p;
  if (!allowed || !el.isConnected) return undefined;
  for (let p = el.parentElement; p; p = p.parentElement) {
    // Parked by a morph (see VoidElement.voidBeforeMorph): not in its real place right now.
    if (p.localName === PARKING) return undefined;
    if (allowed.includes(p.localName)) return undefined;
  }
  const parent = voidAncestor(el);
  const found = parent ? `it is inside <${parent.localName}>` : 'it has no void-* parent';
  const select =
    parent?.localName === 'void-select' ? ' <void-select> takes a native <select> with native <option>s inside.' : '';
  return warning(
    'wrong-parent',
    el.localName,
    parent?.localName ?? '',
    `${describe(el)} only works inside ${tags(allowed)}, and ${found}, so it is not used.${select}`,
    el,
  );
}

/** Required child tags that are missing under `el`. */
export function checkRequired(table: DevTable, el: Element): DevWarning[] {
  const required = table[el.localName]?.r;
  if (!required || !el.isConnected) return [];
  const out: DevWarning[] = [];
  for (const child of required) {
    if (el.querySelector(child)) continue;
    out.push(
      warning(
        'missing-child',
        el.localName,
        child,
        `${describe(el)} has no <${child}> child, which it needs to show anything. Add at least one <${child}>.`,
        el,
      ),
    );
  }
  return out;
}

const filled = (v: string | null | undefined): boolean => !!v && v.trim() !== '';

/** The text of the elements an `aria-labelledby` points to, or whether it names something not there (yet). */
function labelledBy(el: Element): boolean {
  const ids = (el.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean);
  if (!ids.length) return false;
  const root = el.getRootNode() as Document | ShadowRoot;
  // A reference to an element that is not there yet is given the benefit of the doubt.
  return ids.some((id) => {
    const target = root.getElementById?.(id);
    return !target || filled(target.textContent) || filled(target.getAttribute('aria-label'));
  });
}

/** Whether the element's content reads as something: text, or a child that has a name (an image's alt, an aria-label). */
function contentNames(el: Element): boolean {
  if (filled(el.textContent)) return true;
  for (const child of el.querySelectorAll('[aria-label], img[alt], [title]')) {
    if (filled(child.getAttribute('aria-label')) || filled(child.getAttribute('alt')) || filled(child.getAttribute('title'))) return true;
  }
  return false;
}

/** A `<label for>` in the same tree that points at the element or at a control inside it. */
function labelledByFor(el: Element): boolean {
  const root = el.getRootNode() as Document | ShadowRoot;
  if (!root.querySelectorAll) return false;
  const ids = [el, ...el.querySelectorAll('input, select, textarea, button, [role="combobox"], [role="slider"]')]
    .map((c) => c.id)
    .filter(Boolean);
  return ids.some((id) => Array.from(root.querySelectorAll('label[for]')).some((l) => l.getAttribute('for') === id));
}

function hasName(el: Element, rule: DevName): boolean {
  if (rule.a.some((name) => filled(el.getAttribute(name)))) return true;
  if (labelledBy(el)) return true;
  // The control a component renders inside itself: a name written on it, or one a field wired onto it.
  for (const inner of el.querySelectorAll('input, select, textarea, [role="combobox"], [role="slider"], [role="textbox"], [role="button"]:not(button)')) {
    if (filled(inner.getAttribute('aria-label')) || labelledBy(inner)) return true;
    if ((inner as HTMLInputElement).labels?.length) return true;
  }
  if (rule.c && contentNames(el)) return true;
  for (const tag of rule.t ?? []) {
    for (const part of el.querySelectorAll(tag)) if (filled(part.textContent) || filled(part.getAttribute('aria-label')) || labelledBy(part)) return true;
  }
  for (const [tag, ...attrs] of rule.p ?? []) {
    const ancestor = el.parentElement?.closest(tag);
    if (ancestor && (!attrs.length || attrs.some((a) => filled(ancestor.getAttribute(a))))) return true;
  }
  return labelledByFor(el);
}

/** An element that must have an accessible name and has none. Judged after upgrade, from the live DOM. */
export function checkName(table: DevTable, el: Element): DevWarning | undefined {
  const rule = table[el.localName]?.n;
  if (!rule || !el.isConnected) return undefined;
  // Parked by a morph: not in its real place right now.
  if (el.closest(PARKING)) return undefined;
  if (hasName(el, rule)) return undefined;
  const sources = [
    rule.a.some((a) => !/^(aria-|title$)/.test(a)) ? `a ${list(rule.a.filter((a) => !/^(aria-|title$)/.test(a)))} attribute` : '',
    'aria-label',
    rule.c ? 'text inside it' : '',
    rule.t?.length ? `a ${list(rule.t.map((tag) => `<${tag}>`))} part` : '',
    rule.p?.length ? `an enclosing ${list(rule.p.map(([tag, ...a]) => `<${tag}${a.length ? ` ${a[0]}` : ''}>`))}` : '',
  ].filter(Boolean);
  return warning(
    'missing-name',
    el.localName,
    '',
    `${describe(el)} has no accessible name, so a screen reader announces it as nothing. Name it with ${sources.join(', ')}: ${rule.h}.`,
    el,
  );
}

/** A `void-*` tag with no definition, once the page has settled. */
export function checkDefined(
  table: DevTable,
  el: Element,
  autoloading: boolean,
  styled: readonly string[] = [],
): DevWarning | undefined {
  const tag = el.localName;
  if (!tag.startsWith('void-') || customElements.get(tag)) return undefined;
  // A CSS-only element (a page pattern): the theme styles it, nothing defines it.
  if (styled.includes(tag)) return undefined;
  const known = table[tag];
  // A CSS-only part (#52): the same.
  if (known?.c) return undefined;
  if (known) {
    const how = autoloading
      ? `The autoloader did not load it; check the console for a failed import of "${known.m}".`
      : `Import it with import "@voidable/ui/components/${known.m}.js", import "@voidable/ui", or use "@voidable/ui/autoloader".`;
    return warning(
      'undefined-element',
      tag,
      tag,
      `${describe(el)} is a Void UI element but it is not defined, so it renders as an unstyled, inert tag. ${how}`,
      el,
    );
  }
  const near = suggest(tag, [...Object.keys(table), ...styled]);
  return warning(
    'undefined-element',
    tag,
    tag,
    `${describe(el)} is not a Void UI element and nothing defines it, so it does nothing.${near ? ` Did you mean <${near}>?` : ''}`,
    el,
  );
}

/** A `void-*` event listener for a name nothing dispatches. */
export function checkEvent(
  table: DevTable,
  target: EventTarget,
  type: string,
  renamedEvents: Readonly<Record<string, string>> = {},
): DevWarning | undefined {
  if (!type.startsWith('void-')) return undefined;
  const el = target instanceof Element ? target : undefined;
  const own: DevTag | undefined = el ? table[el.localName] : undefined;
  const onWhat0 = el ? describe(el) : target === document ? 'document' : target === window ? 'window' : 'this target';
  // An event this element dispatched before 0.8 (#23), even if another element still dispatches the name.
  const ownOld = own?.l?.e && Object.hasOwn(own.l.e, type) && !own.e.includes(type) ? own.l.e[type] : undefined;
  const all = new Set<string>();
  for (const t of Object.values(table)) for (const e of t.e) all.add(e);
  const anyOld = !all.has(type) && Object.hasOwn(renamedEvents, type) ? renamedEvents[type] : undefined;
  if (ownOld ?? anyOld) {
    return warning(
      'legacy-markup',
      el?.localName ?? '',
      type,
      `Listener for "${type}" on ${onWhat0}: ${type} was removed in Void UI 0.8, so it never fires. Instead ${ownOld ?? anyOld}.`,
      el,
    );
  }
  if (all.has(type)) return undefined;
  const near = suggest(type, own?.e.length ? own.e : [...all]) ?? suggest(type, [...all]);
  const onWhat = el ? describe(el) : target === document ? 'document' : target === window ? 'window' : 'this target';
  const events = own?.e.length ? ` ${el!.localName} dispatches: ${list(own.e)}.` : '';
  return warning(
    'unknown-event',
    el?.localName ?? '',
    type,
    `Listener for "${type}" on ${onWhat}: no Void UI element dispatches an event with that name, so it never fires.${near ? ` Did you mean "${near}"?` : ''}${events}`,
    el,
  );
}

/** Dedupe key: once per element type, kind and attribute (or child, or event name). */
export function keyOf(w: DevWarning): string {
  return `${w.kind}|${w.tag}|${w.subject}`;
}

// ── Explicit parts (#52) ──────────────────────────────────────────────────────

/** Elements that never count as content of a component (and are never reported as unknown children). */
const INERT_CHILDREN = new Set(['template', 'script', 'style', 'void-projection-park']);

/** The children of `owner` that count as its own: through transparent wrappers (a `<form>`), in order. */
function ownChildren(owner: Element, transparent: readonly string[] | undefined): Node[] {
  const out: Node[] = [];
  const walk = (parent: Element) => {
    // What the component renders beside its parts (the input of a combobox) sits between the
    // projection markers, `<!--void-projection-->` and `<!--/void-projection-->`: not the author's.
    let chrome = false;
    for (const n of Array.from(parent.childNodes)) {
      if (n.nodeType === 8) {
        const data = (n as Comment).data;
        if (data === 'void-projection') chrome = true;
        else if (data === '/void-projection') chrome = false;
        continue;
      }
      if (chrome) continue;
      if (n.nodeType === 1 && transparent?.includes((n as Element).localName)) walk(n as Element);
      else out.push(n);
    }
  };
  walk(owner);
  return out;
}

const fix = (q: { s: string }) => `Correct markup: ${q.s}`;
/** `<a>, <b> and <c>`. */
const allOf = (items: readonly string[]) => {
  const list = items.map((t) => `<${t}>`);
  return list.length < 2 ? list.join('') : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
};

/**
 * Problems with the parts of `el` (a component, or a part with parts of its
 * own): a required part that is missing, a child that is not a part where the
 * component takes only parts (usually the implicit form the parts replaced:
 * a bare button for a trigger, loose text for a body), a part repeated more
 * often than allowed, parts out of order.
 */
export function checkParts(table: DevTable, el: Element): DevWarning[] {
  const q = table[el.localName]?.q;
  if (!q || !el.isConnected) return [];
  const out: DevWarning[] = [];
  const where = describe(el);
  const names = q.n.map((p) => p.t);
  const children = ownChildren(el, q.t);
  const counts = new Map<string, number>();
  let last = -1;
  let ordered = true;
  for (const n of children) {
    if (n.nodeType === 3) {
      if (q.k === 'parts' && (n.textContent ?? '').trim()) {
        const text = (n.textContent ?? '').trim();
        out.push(
          warning(
            'unknown-child',
            el.localName,
            '#text',
            `${where} has text outside its parts ("${text.length > 24 ? `${text.slice(0, 24)}...` : text}"), which is not shown where you expect.${q.l ? ` Instead ${q.l}.` : ''} ${fix(q)}`,
            el,
          ),
        );
      }
      continue;
    }
    if (n.nodeType !== 1) continue;
    const child = n as Element;
    const tag = child.localName;
    const i = names.indexOf(tag);
    if (i < 0) {
      // A part of another component is reported once, by the wrong-parent check.
      if (q.k === 'parts' && !INERT_CHILDREN.has(tag) && !table[tag]?.p) {
        out.push(
          warning(
            'unknown-child',
            el.localName,
            tag,
            `${describe(child)} is not a part of <${el.localName}>, which takes only ${allOf(names)}.${q.l ? ` Instead ${q.l}.` : ''} ${fix(q)}`,
            child,
          ),
        );
      }
      continue;
    }
    counts.set(tag, (counts.get(tag) ?? 0) + 1);
    if (i < last) ordered = false;
    last = Math.max(last, i);
  }
  for (const part of q.n) {
    const count = counts.get(part.t) ?? 0;
    if (part.r && count === 0) {
      out.push(
        warning(
          'missing-part',
          el.localName,
          part.t,
          `${where} has no <${part.t}>, which it needs.${q.l ? ` If you wrote the content directly inside it: ${q.l}.` : ''} ${fix(q)}`,
          el,
        ),
      );
    }
    if (part.x && count > part.x) {
      out.push(
        warning(
          'part-misuse',
          el.localName,
          part.t,
          `${where} has ${count} <${part.t}> parts; it takes at most ${part.x}, and the others are ignored. ${fix(q)}`,
          el,
        ),
      );
    }
  }
  if (q.o && !ordered) {
    out.push(
      warning(
        'part-misuse',
        el.localName,
        'order',
        `${where}: its parts are out of order, so they read in the wrong order (screen readers and Tab follow the markup). Write them as ${allOf(names.filter((t) => counts.has(t))).replace(' and ', ', ')}, in that order. ${fix(q)}`,
        el,
      ),
    );
  }
  return out;
}

/** A part that wraps one control (`<void-popover-trigger>`) holding none, or more than one. */
export function checkControl(table: DevTable, el: Element): DevWarning | undefined {
  const tag = table[el.localName];
  if (!tag?.c || !tag.p) return undefined;
  for (const ownerTag of tag.p) {
    const spec = table[ownerTag]?.q?.n.find((p) => p.t === el.localName);
    if (!spec?.c) continue;
    const elements = el.children.length;
    const text = Array.from(el.childNodes).some((n) => n.nodeType === 3 && (n.textContent ?? '').trim());
    if (elements === 1 && !text) return undefined;
    const q = table[ownerTag]!.q!;
    return warning(
      'unknown-child',
      el.localName,
      elements ? 'controls' : 'control',
      `${describe(el)} must wrap exactly one element, the control that gets the ARIA (a <void-button>, a <button>, a link); it has ${elements === 0 ? (text ? 'only text' : 'nothing') : `${elements} elements`}. ${fix(q)}`,
      el,
    );
  }
  return undefined;
}

/**
 * A component that enhances a native control the author writes inside it
 * (`<void-select>` around a `<select>`) without one: usually the old form,
 * native options written straight into the component.
 */
export function checkNative(table: DevTable, el: Element): DevWarning | undefined {
  const v = table[el.localName]?.v;
  if (!v || !el.isConnected) return undefined;
  for (const inner of Array.from(el.querySelectorAll(v.tag))) if (inner.closest(el.localName) === el) return undefined;
  const loose = Array.from(el.children).some((c) => c.localName === 'option' || c.localName === 'optgroup');
  return warning(
    loose ? 'legacy-markup' : 'missing-part',
    el.localName,
    v.tag,
    `${describe(el)} has no native <${v.tag}> inside${loose ? ': its options are written straight into it, which no longer works' : ''}. Instead ${v.fix}.`,
    el,
  );
}

/** A tag that explicit parts replaced (`<void-tab-panel>`). */
export function checkRemoved(removed: Readonly<Record<string, string>>, el: Element): DevWarning | undefined {
  const advice = removed[el.localName];
  if (!advice) return undefined;
  return warning(
    'legacy-markup',
    el.localName,
    el.localName,
    `${describe(el)} no longer exists, so it does nothing. Instead ${advice}.`,
    el,
  );
}

/** Native elements that are a control however they are written. */
const NATIVE_CONTROLS = 'a[href], button, input:not([type="hidden"]), select, textarea, summary';

/**
 * A component that can be one link or one button as a whole (`<void-card>`): wrapped in a link or a
 * button (block content inside one is invalid HTML and announces badly), or linked (its title holds a
 * control) with a second control anywhere inside (two things to Tab to, and the stretched link covers the
 * second one so it cannot be clicked).
 */
export function checkLinked(table: DevTable, el: Element): DevWarning | undefined {
  const k = table[el.localName]?.k;
  if (!k || !el.isConnected) return undefined;
  const wrapper = el.parentElement?.closest('a[href], button');
  if (wrapper) {
    return warning(
      'nested-control',
      el.localName,
      'wrapped',
      `${describe(el)} is inside ${describe(wrapper)}. Block content inside a link or a button is invalid HTML and announces badly. Instead ${k.s}.`,
      el,
    );
  }
  const selector = [NATIVE_CONTROLS, ...k.c].join(', ');
  // Only the outermost match counts: a <void-button> around a <button> is one control.
  const own = (root: Element) =>
    Array.from(root.querySelectorAll(selector)).filter((c) => {
      const up = c.parentElement?.closest(selector);
      return !up || !root.contains(up);
    });
  const title = Array.from(el.querySelectorAll(k.p)).find((t) => t.closest(el.localName) === el);
  if (!title || own(title).length === 0) return undefined;
  const all = own(el);
  if (all.length < 2) return undefined;
  const second = all.find((c) => !title.contains(c)) ?? all[1];
  return warning(
    'nested-control',
    el.localName,
    'second-control',
    `${describe(el)} is a link or button (its <${k.p}> holds a control) and also holds ${describe(second)}: a linked card holds exactly one control, and the stretched link covers any other. Instead ${k.s}.`,
    el,
  );
}
