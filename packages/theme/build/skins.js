// SPDX-License-Identifier: MIT
//
// Skins: reading a skin's source (one rule of token assignments) and writing
// the stylesheet that ships.
//
// Why a skin is written out by a tool. A custom property that refers to
// another (`--void-container-shadow: var(--void-shadow-md)`) is resolved on
// the element that declares it. The theme computes its tokens again on every
// scope (a data-theme region, a nested data-void-theme, data-shape, a media
// surface, glass), so a skin's assignments have to be declared on those
// elements too or they would hold the root's values there, or be undone.
// CSS cannot name a selector list once and reuse it, so the list lives in one
// place, the derived block of tokens.css, and this module writes it into
// every skin. A skin author writes `[data-void-skin="name"] { … }` and
// nothing else.
//
// On a surface (media, glass) the skin keeps its structure and gives up its
// colours: a surface computes its own, and lint:contrast proves them against
// the worst photograph. So there the skin's assignments to colour tokens the
// theme derives are left out, and its component colour tokens are reset.
//
// No Node or DOM APIs: the theme builder on the docs site imports this file.

/** Remove comments. */
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Split on commas at parenthesis and bracket depth 0. */
function splitList(s) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of s) {
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    if (ch === ',' && depth === 0) {
      out.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/**
 * The scopes: every selector the derived block of tokens.css is declared on.
 * Returns { all, page, surface }; `page` leaves out :root (a skin's own
 * element stands for it) and the surfaces.
 */
export function scopes(tokensCss) {
  const m = /^:where\((:root,[^{]*)\)\s*\{/m.exec(strip(tokensCss));
  if (!m) throw new Error('tokens.css: the derived block `:where(:root, …) {` was not found');
  const all = splitList(m[1]);
  const surface = all.filter(isSurfaceScope);
  return { all, surface, page: all.filter((s) => s !== ':root' && !isSurfaceScope(s)) };
}

/** A scope that is a surface: it overrides the inputs of the colour derivation. */
export const isSurfaceScope = (selector) => /void-media|void-glass|data-void-surface/.test(selector);

// ── The grammar of token names ───────────────────────────────────────
// --void-<component>-<part?>-<property>-<state?>, and --void-<role>-<property>-<state?>.

export const PROPERTIES = ['surface', 'ink', 'border', 'border-width', 'radius', 'shadow', 'rule', 'rule-edge', 'rule-head', 'rule-between', 'rule-frame', 'gap', 'padding', 'padding-block', 'padding-inline', 'height', 'width', 'size', 'font-size', 'font-weight'];
export const STATES = ['hover', 'active', 'selected', 'disabled', 'invalid', 'open', 'focus'];
export const PARTS = ['header', 'footer', 'title', 'body', 'actions', 'trigger', 'content', 'item', 'label', 'icon', 'value'];
export const ROLES = ['container', 'float', 'control', 'field', 'item', 'rule'];

const alt = (list) => [...list].sort((a, b) => b.length - a.length).join('|');
const TAIL = new RegExp(`^(?:(${alt(PARTS)})-)?(${alt(PROPERTIES)})(?:-(${alt(STATES)}))?$`);

/**
 * Parse a component token name against the owners (component and pattern
 * names without `void-`, longest first). Returns { owner, part, property,
 * state } or null when the name is outside the grammar.
 */
export function parseTokenName(name, owners) {
  if (!name.startsWith('--void-')) return null;
  const rest = name.slice(7);
  for (const owner of [...owners].sort((a, b) => b.length - a.length)) {
    if (!rest.startsWith(`${owner}-`)) continue;
    const m = TAIL.exec(rest.slice(owner.length + 1));
    if (m) return { owner, part: m[1] ?? null, property: m[2], state: m[3] ?? null };
  }
  return null;
}

/** True for a token whose value is a colour by the grammar: …-surface, …-ink, …-border, with or without a state. */
export const isColourName = (name) => new RegExp(`-(surface|ink|border)(-(${alt(STATES)}))?$`).test(name);

// Working values of the colour derivation. A surface sets or relies on them.
const COLOUR_INPUT = /^--void-(alpha-|scheme-|page-level$|contrast-level$|chrome-level$|neutral-c$|accent-|status-|tone-tint$|fg$|color-|preferred-scheme)/;

/** A token of the theme's own derivation that a surface keeps for itself. */
export const isSurfaceOwned = (name) => COLOUR_INPUT.test(name) || (/^--void-(container|float|control|field|item)-/.test(name) && isColourName(name));

// ── Reading a skin ───────────────────────────────────────────────────

/**
 * Read a skin's source: exactly one rule, `[data-void-skin="name"] { … }`,
 * holding custom properties only. Returns { name, declarations } with the
 * declarations as [name, value] pairs in source order; throws with the
 * reason otherwise. Private working values are `--_void-<skin>-*`.
 */
export function readSkin(css, expectedName) {
  const text = strip(css).trim();
  const m = /^\[data-void-skin="([a-z0-9-]+)"\]\s*\{([^{}]*)\}$/.exec(text);
  if (!m) throw new Error('a skin is one rule, `[data-void-skin="name"] { … }`, of custom properties: no other selector, no at-rule, nothing that names a component');
  const [, name, body] = m;
  if (expectedName && name !== expectedName) throw new Error(`the selector says data-void-skin="${name}" but the skin is called ${expectedName}`);
  const declarations = [];
  for (const part of body.split(';')) {
    const decl = part.trim();
    if (!decl) continue;
    const d = /^(--[\w-]+)\s*:\s*([\s\S]+)$/.exec(decl);
    if (!d) throw new Error(`a skin may only assign tokens; found \`${decl.slice(0, 60)}\``);
    const prop = d[1];
    if (!prop.startsWith('--void-') && !prop.startsWith(`--_void-${name}-`)) throw new Error(`${prop}: a skin assigns --void-* tokens; its own working values are named --_void-${name}-*`);
    declarations.push([prop, d[2].trim().replace(/\s+/g, ' ')]);
  }
  if (!declarations.length) throw new Error('the skin assigns no token');
  return { name, declarations };
}

/** The declarations of a skin as an object (for evaluation; the last assignment wins). */
export const skinTokens = (skin) => Object.fromEntries(skin.declarations);

// ── Writing a skin ───────────────────────────────────────────────────

/**
 * The stylesheet of a skin.
 *
 * `scope` is the result of scopes(). Two rules: everything, on the skin's
 * element and on every page scope under it; and on the surfaces under it,
 * the structure only, with the skin's component colour tokens reset so the
 * surface's own colours show.
 */
export function skinCss(skin, scope) {
  const { name, declarations } = skin;
  const at = `[data-void-skin="${name}"]`;
  const body = (list) => list.map(([p, v]) => `  ${p}: ${v};`).join('\n');
  const onSurface = [];
  for (const [prop, value] of declarations) {
    if (prop.startsWith('--_void-')) onSurface.push([prop, value]);
    else if (isSurfaceOwned(prop)) continue;
    else if (isColourName(prop)) onSurface.push([prop, 'initial']);
    else onSurface.push([prop, value]);
  }
  let css = `${at}${scope.page.length ? `,\n${at} :where(${scope.page.join(', ')})` : ''} {\n${body(declarations)}\n}\n`;
  if (scope.surface.length && onSurface.length) css += `\n${at}:where(${scope.surface.join(', ')}),\n${at} :where(${scope.surface.join(', ')}) {\n${body(onSurface)}\n}\n`;
  return css;
}
