// Analysis shared by the theme build (build.mjs) and its lint (check.mjs).
//
// The theme's source is hand-written CSS: one file per component under
// src/components, one per pattern group under src/patterns, src/media and
// src/app-shell, composed in a deliberate order by src/core.css. Everything
// that has to follow from that source (the scoped reset, the per-component
// stylesheets, the export map) is derived here, never listed by hand.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SRC = path.join(ROOT, 'src');
export const DIST = path.join(ROOT, 'dist');
export const UI_COMPONENTS = path.resolve(ROOT, '../ui/src/components');

/** The layer order, as `src/layers.css` declares it. */
export const LAYERS_FILE = path.join(SRC, 'layers.css');
export const readLayersStatement = () => {
  const m = /^@layer\s[^;{]+;/m.exec(fs.readFileSync(LAYERS_FILE, 'utf8'));
  if (!m) throw new Error('src/layers.css has no @layer order statement');
  return m[0];
};

/** Layers the theme owns, in order, from the statement. */
export const voidLayers = () =>
  readLayersStatement()
    .replace(/^@layer\s+|;$/g, '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.startsWith('components.void.'));

export const read = (f) => fs.readFileSync(f, 'utf8');
export const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

/** `[{ file, layer }]` for every `@import './x.css' layer(l)` in src/core.css, in order. */
export function indexImports() {
  const out = [];
  for (const m of read(path.join(SRC, 'core.css')).matchAll(/@import\s+'\.\/([^']+)'(?:\s+layer\(([^)]+)\))?\s*;/g)) {
    out.push({ file: m[1], layer: m[2] ?? null });
  }
  return out;
}

/** All .css files under a src subdirectory, as paths relative to src. */
export const listCss = (dir) =>
  fs.existsSync(path.join(SRC, dir))
    ? fs.readdirSync(path.join(SRC, dir)).filter((f) => f.endsWith('.css')).sort().map((f) => `${dir}/${f}`)
    : [];

const isKeyframes = (rule) => rule.parent?.type === 'atrule' && /keyframes$/i.test(rule.parent.name);

/** Every selector of every style rule, as [{ selector, line, rule }]. */
export function selectorsOf(cssText, file = '') {
  const out = [];
  postcss.parse(cssText, { from: file }).walkRules((rule) => {
    if (isKeyframes(rule)) return;
    selectorParser((root) => {
      root.each((sel) => out.push({ selector: sel, text: sel.toString().trim().replace(/\s+/g, ' '), line: rule.source?.start?.line ?? 0, rule }));
    }).processSync(rule.selector);
  });
  return out;
}

/** The `void-*` element names a selector mentions (type selectors only). */
export function tagsOfSelector(sel) {
  const tags = new Set();
  sel.walk((n) => {
    if (n.type === 'tag' && /^void-/.test(n.value)) tags.add(n.value);
  });
  return tags;
}

/** The `.void-*` classes a selector mentions. */
export function classesOfSelector(sel) {
  const classes = new Set();
  sel.walk((n) => {
    if (n.type === 'class' && /^void-/.test(n.value)) classes.add(n.value);
  });
  return classes;
}

export function tagsOfCss(cssText, file = '') {
  const tags = new Set();
  for (const { selector } of selectorsOf(cssText, file)) for (const t of tagsOfSelector(selector)) tags.add(t);
  return tags;
}

/** Component stylesheets: src/components/*.css, by name. `overlay` is shared, not a component. */
export const componentNames = () => listCss('components').map((f) => path.basename(f, '.css'));
export const SHARED = new Set(['overlay']);

/**
 * tag -> module name, from the `customElements.get('void-x')` guard every
 * component file ends with (the same fact the autoloader's table is built from).
 */
export function registeredTags() {
  const map = new Map();
  if (!fs.existsSync(UI_COMPONENTS)) return map;
  for (const f of fs.readdirSync(UI_COMPONENTS)) {
    if (!f.endsWith('.ts')) continue;
    const mod = path.basename(f, '.ts');
    for (const m of read(path.join(UI_COMPONENTS, f)).matchAll(/customElements\.get\(\s*'(void-[a-z0-9-]+)'\s*\)/g)) map.set(m[1], mod);
  }
  return map;
}

/**
 * Which stylesheet a tag belongs to: the module that registers it when that
 * module has a stylesheet, otherwise the stylesheet whose name is the longest
 * prefix of the tag (`void-tabs-x` -> tabs).
 */
export function makeOwnerOfTag(styleNames) {
  const registered = registeredTags();
  const names = styleNames.filter((n) => !SHARED.has(n));
  return (tag) => {
    const mod = registered.get(tag);
    if (mod && names.includes(mod)) return mod;
    const body = tag.replace(/^void-/, '');
    let best = null;
    for (const n of names) if ((body === n || body.startsWith(`${n}-`)) && (!best || n.length > best.length)) best = n;
    return best;
  };
}

/** Classes the components render that do not start with their stylesheet's name. */
export const CLASS_ALIASES = { 'void-pin-cell': 'pin-input' };

export function makeOwnerOfClass(styleNames) {
  const names = styleNames.filter((n) => !SHARED.has(n));
  return (cls) => {
    if (CLASS_ALIASES[cls]) return CLASS_ALIASES[cls];
    const body = cls.replace(/^void-/, '');
    let best = null;
    for (const n of names) if ((body === n || body.startsWith(`${n}-`)) && (!best || n.length > best.length)) best = n;
    return best;
  };
}

/**
 * Runtime dependencies of a component: stylesheets it needs because the
 * component renders or extends other components, or opens an overlay.
 * Read from the component's TypeScript, so it follows the code.
 */
export function dependenciesOf(name, ownerOfTag) {
  const file = path.join(UI_COMPONENTS, `${name}.ts`);
  if (!fs.existsSync(file)) return [];
  const src = read(file);
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const deps = new Set();
  if (/from\s+'\.\.\/overlay\.js'/.test(code)) deps.add('overlay');
  for (const m of code.matchAll(/<(void-[a-z0-9-]+)/g)) {
    const o = ownerOfTag(m[1]);
    if (o && o !== name) deps.add(o);
  }
  // A value import of a sibling component (not `import type`) is a dependency too.
  for (const m of code.matchAll(/^import\s+(?!type\b)[^;]*?from\s+'\.\/([a-z0-9-]+)\.js'/gm)) {
    if (m[1] !== name && componentNames().includes(m[1])) deps.add(m[1]);
  }
  return [...deps];
}

/** Dependency closure in include order: shared first, dependencies, then the component. */
export function closure(name, ownerOfTag) {
  const seen = new Set();
  const order = [];
  const visit = (n) => {
    if (seen.has(n)) return;
    seen.add(n);
    for (const d of dependenciesOf(n, ownerOfTag)) visit(d);
    order.push(n);
  };
  visit(name);
  return order.sort((a, b) => (SHARED.has(b) ? 1 : 0) - (SHARED.has(a) ? 1 : 0));
}

// ── Scoped reset ────────────────────────────────────────────────────────────

/** The words a part tag ends in (`void-<component>-<region>`, see "Explicit parts" in AGENTS.md). */
const PART_SUFFIX = /-(trigger|content|title|description|body|actions|header|footer|item|list|separator|close)$/;

/**
 * The tags the reset names: `tags` without the parts whose component is in `tags` too. A part is always inside
 * its component, so `void-card *` already reaches `void-card-body` and everything in it. Every tag in an
 * `:is()` list is compared on every element, and every ancestor of every element is compared with the list
 * again (the browser cannot hash `:is()`), so the list's length is paid per element of every page that
 * loads the theme: 164 tags cost the 500-row table a quarter of its first render (#77).
 */
export function resetRoots(tags) {
  const set = new Set(tags);
  return [...set]
    .filter((t) => {
      const m = PART_SUFFIX.exec(t);
      return !(m && set.has(t.slice(0, m.index)));
    })
    .sort();
}

/**
 * The reset, scoped to the given tags and everything inside them. Nothing
 * outside a `void-*` element is touched. `:where()` keeps specificity at zero.
 */
export function resetCss(tags) {
  const S = resetRoots(tags);
  const roots = `:is(${S.join(', ')})`;
  const any = `:where(${roots}, ${roots} *)`;
  const within = (sel) => `:where(${roots} :is(${sel}))`;
  return `${any},
${any}::before,
${any}::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* \`hidden\` hides. Every component and pattern sets a display of its own,
   and any of those beats the browser's \`[hidden] { display: none }\`, so an
   alert, a row or a part with the attribute stayed on screen. Stated once
   here for every theme element and what it contains, and important: in this
   lowest layer that beats every display rule above it, the theme's and an
   application's. \`hidden="until-found"\` keeps the browser's behaviour. */
${any}[hidden]:not([hidden="until-found"]) {
  display: none !important;
}

/* Native controls and scrollbars inside follow the colour scheme in force. */
:where(${roots}) {
  color-scheme: var(--void-color-scheme);
}

${within('img, picture, video, canvas, svg')} {
  display: block;
  max-width: 100%;
}

${within('input, button, textarea, select')} {
  font: inherit;
}

/* A link in running text is the text colour, underlined: hierarchy comes
   from opacity, and colour is left to status. Zero specificity, so any rule
   of yours or a framework's wins. */
${within('a')} {
  color: inherit;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.2em;
}

/* The underline is stated, not left to the browser default, so a framework
   reset that clears link decoration does not take it from running text. */
${within('a[href]')} {
  text-decoration-line: underline;
}
`;
}

export const RESET_HEADER = `/* Generated by packages/theme/scripts/build.mjs (mise run lint:theme checks it
   is current): the scoped reset for every void-* tag the theme styles.
   Edit the generator, not this file. */\n\n`;

/** Every void-* tag any stylesheet in the entry list styles. */
export function allStyledTags() {
  const tags = new Set();
  for (const { file } of indexImports()) {
    if (/^(reset|base|layers|primitives|knobs|tokens|type|forced-colors|pre-upgrade)\.css$/.test(file)) continue;
    for (const t of tagsOfCss(read(path.join(SRC, file)), file)) tags.add(t);
  }
  return tags;
}

// ── Splitting a multi-component file (pre-upgrade, forced-colors) ───────────

/**
 * Splits a stylesheet whose rules belong to several components into one
 * stylesheet per component, by the tags and `.void-*` classes each selector
 * names. A selector that names nothing of the theme (a global `:focus-visible`)
 * is `global`, and is returned for the caller to scope. A selector that maps to
 * no component is returned in `unmapped`, which the build treats as an error.
 *
 * Returns { byComponent: Map<name, cssText>, global: cssText, unmapped: [] }.
 */
export function splitByComponent(cssText, file, ownerOfTag, ownerOfClass) {
  const root = postcss.parse(cssText, { from: file });
  const byComponent = new Map();
  const unmapped = [];
  const globals = [];

  const ownersOf = (sel) => {
    const owners = new Set();
    for (const t of tagsOfSelector(sel)) {
      const o = ownerOfTag(t);
      if (o) owners.add(o);
    }
    for (const c of classesOfSelector(sel)) {
      const o = ownerOfClass(c);
      if (o) owners.add(o);
    }
    return owners;
  };

  const emit = (name, at, rule, selectors) => {
    const clone = rule.clone({ selector: selectors.join(',\n') });
    clone.raws.before = '\n';
    const key = `${name}`;
    if (!byComponent.has(key)) byComponent.set(key, new Map());
    const groups = byComponent.get(key);
    const gk = at ? `${at.name} ${at.params}` : '';
    if (!groups.has(gk)) groups.set(gk, { at, rules: [] });
    groups.get(gk).rules.push(clone);
  };

  const handleRule = (rule, at) => {
    const perOwner = new Map();
    const global = [];
    selectorParser((sels) => {
      sels.each((sel) => {
        const text = sel.toString().trim();
        const owners = ownersOf(sel);
        if (owners.size === 0) {
          if (/void-|\.void-/.test(text)) unmapped.push(`${file}:${rule.source.start.line} ${text}`);
          else global.push(text);
          return;
        }
        for (const o of owners) {
          if (!perOwner.has(o)) perOwner.set(o, []);
          perOwner.get(o).push(text);
        }
      });
    }).processSync(rule.selector);
    for (const [o, sels] of perOwner) emit(o, at, rule, sels);
    if (global.length) globals.push({ at, rule, selectors: global });
  };

  for (const node of root.nodes) {
    if (node.type === 'rule') handleRule(node, null);
    else if (node.type === 'atrule' && node.nodes) {
      if (/keyframes$/i.test(node.name)) {
        // Keyframes follow the component that names them in an animation; none here.
        unmapped.push(`${file}:${node.source.start.line} @${node.name} ${node.params}`);
        continue;
      }
      for (const child of node.nodes) if (child.type === 'rule') handleRule(child, node);
    }
  }

  const render = (groups) => {
    let out = '';
    for (const { at, rules } of groups.values()) {
      const body = rules.map((r) => r.toString()).join('\n');
      out += at ? `@${at.name} ${at.params} {\n${body}\n}\n` : `${body}\n`;
    }
    return out;
  };

  const rendered = new Map();
  for (const [name, groups] of byComponent) rendered.set(name, render(groups));
  return { byComponent: rendered, globals, unmapped };
}

// ── Component tokens and skins ──────────────────────────────────────────────

/** Owners that hold inputs of a surface or shared mechanics, not component tokens. */
export const NOT_TOKEN_OWNERS = new Set(['media', 'media-content', 'glass', 'overlay']);

/** Custom properties the components set from TypeScript: state, not tokens. */
export function runtimeProperties() {
  const out = new Set();
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  const ui = path.resolve(ROOT, '../ui/src');
  if (!fs.existsSync(ui)) return out;
  for (const file of walk(ui).filter((x) => x.endsWith('.ts'))) {
    for (const m of read(file).matchAll(/(?<![\w-])(--void-[a-z0-9-]+)(?=\s*:)|(?:setProperty|setHostStyle)\(\s*['"](--void-[a-z0-9-]+)/g)) out.add(m[1] ?? m[2]);
  }
  return out;
}

/** Every stylesheet that can read a component token, as [{ file, css }]. */
export const tokenFiles = () => [...listCss('components'), ...listCss('patterns'), ...listCss('media'), ...listCss('app-shell'), 'pre-upgrade.css', 'forced-colors.css'].map((file) => ({ file, css: read(path.join(SRC, file)) }));

/** Names a component token can belong to: component stylesheets and CSS-only pattern tags, without `void-`. */
export function tokenOwners() {
  const owners = new Set(componentNames());
  for (const t of allStyledTags()) owners.add(t.replace(/^void-/, ''));
  return [...owners].filter((o) => !NOT_TOKEN_OWNERS.has(o));
}

/** Custom properties the theme itself declares in primitives, knobs and tokens. */
export function declaredTokens() {
  const out = new Set();
  for (const f of ['primitives.css', 'knobs.css', 'tokens.css', 'media/surface.css']) for (const m of stripComments(read(path.join(SRC, f))).matchAll(/(?<![\w-])(--void-[a-z0-9-]+)\s*:/g)) out.add(m[1]);
  return out;
}

/** `/* a *\/` style header for generated per-component files. */
export const GENERATED_NOTE = '/* Generated by @voidable/theme (scripts/build.mjs). Do not edit. */\n';
