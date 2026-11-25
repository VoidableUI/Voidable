// SPDX-License-Identifier: MIT
//
// From the theme's CSS source to resolved tokens: which custom properties
// exist, what each computes to for a set of knob values in one colour
// scheme, and how that is written as Design Tokens Community Group JSON
// (Format Module 2025.10) and as a flat map of CSS values.
//
// Takes CSS text, returns objects; scripts/export-tokens.mjs does the file work and
// the theme builder on the docs site calls the same functions in the page.

import { declarations, evaluate, fontFamilies, hex, clipped, ruleBody, stripComments, toPx } from './css-eval.js';
import { knobs as knobMeta } from './knobs.js';

export const DTCG_VERSION = '2025.10';
const EXT = 'dev.voidable';

/** Top-level rules of a stylesheet as { prelude, body }; at-rules are skipped whole. */
function topLevelRules(css) {
  const rules = [];
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open === -1) break;
    const semi = css.indexOf(';', i);
    // a statement at-rule (@import …;) before the next block
    if (semi !== -1 && semi < open && css.slice(i, semi).trim().startsWith('@')) {
      i = semi + 1;
      continue;
    }
    let depth = 1;
    let j = open + 1;
    while (depth && j < css.length) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') depth--;
      j++;
    }
    const prelude = css.slice(i, open).trim();
    if (!prelude.startsWith('@')) rules.push({ prelude, body: css.slice(open + 1, j - 1) });
    i = j;
  }
  return rules;
}

const selectors = (prelude) => prelude.split(',').map((s) => s.trim());

/**
 * Read the theme's source.
 *
 * `css` is { primitives, knobs, tokens } as text. Returns the fixed
 * values, the knob defaults, the fixed inputs declared on :root in
 * tokens.css (scheme, shape, scrim, glass) and the derived block.
 */
export function readSource(css) {
  const prim = stripComments(css.primitives);
  const knobsCss = stripComments(css.knobs);
  const tok = stripComments(css.tokens);
  const inputs = {};
  for (const rule of topLevelRules(tok)) {
    if (selectors(rule.prelude).includes(':root')) Object.assign(inputs, declarations(rule.body));
  }
  return {
    primitives: declarations(ruleBody(prim, /^:root\s*\{/m)),
    knobs: declarations(ruleBody(knobsCss, /^:root\s*\{/m)),
    inputs,
    derived: declarations(ruleBody(tok, /^:where\(:root,[^{]*\{/m)),
  };
}

/** The knob declarations of a theme file (one `[data-void-theme="name"]` rule). */
export function readTheme(css) {
  const rule = topLevelRules(stripComments(css))[0];
  if (!rule) throw new Error('a theme file holds one rule');
  return declarations(rule.body);
}

/**
 * The token overrides of a skin file: its first rule, which may hold only
 * custom properties. The rules after it restyle elements and are not tokens.
 */
export function readSkin(css) {
  const rule = topLevelRules(stripComments(css))[0];
  if (!rule) throw new Error('a skin file starts with a rule of token overrides');
  const rest = rule.body.replace(/--void-[\w-]+\s*:\s*[^;{}]+;/g, '').trim();
  if (rest) throw new Error(`the first rule of a skin may only set --void-* properties, found: ${rest.slice(0, 60)}`);
  return declarations(rule.body);
}

/**
 * Every custom property with its unevaluated value, for one configuration.
 * Later layers win, as in the cascade: fixed values, knob defaults, the
 * theme's knobs, the derived block, then a skin's overrides of it.
 */
export function environment(source, { scheme = 'dark', knobs = {}, skin = {} } = {}) {
  const dark = scheme === 'dark' ? '1' : '0';
  return {
    ...source.primitives,
    ...source.knobs,
    ...source.inputs,
    '--void-color-scheme': scheme === 'dark' ? 'dark' : 'light',
    '--void-scheme-dark': dark,
    '--void-page-scheme-dark': dark,
    ...knobs,
    ...source.derived,
    ...skin,
  };
}

const isKnob = (name) => knobMeta.some((k) => k.name === name);
const isFamily = (name) => /^--void-font-(sans|mono)$/.test(name) || name.endsWith('-family');
const isWeight = (name) => /(^--void-weight-|-weight$)/.test(name);

// Working values of the derivation: real custom properties, of no use to a
// design tool. They stay in the flat JSON and out of the DTCG file.
const INTERNAL = /^--void-(alpha-|scheme-dark$|page-scheme-dark$|contrast-boost$|contrast-level$|chrome-level$|page-level$|shape$|neutral-c$|accent-c$|accent-l$|accent-shift$|status-pole$|status-shift$|fg$|glass-solid$|glass-alpha$|scrim-alpha$|space-unit$|radius-base$)/;

/** Resolve every property of an environment. Returns Map(name → evaluated value). */
export function resolve(env) {
  const out = new Map();
  for (const name of Object.keys(env)) {
    if (isFamily(name)) out.set(name, { kind: 'fontFamily', families: fontFamilies(env[name], env) });
    else out.set(name, evaluate(env[name], env));
  }
  return out;
}

const r4 = (n) => Math.round(n * 1e4) / 1e4;
const dim = (v) => ({ value: r4(v.n), unit: v.unit });
const px = (n) => ({ value: r4(n), unit: 'px' });

function dtcgColor(c) {
  const value = { colorSpace: 'srgb', components: clipped(c).map(r4) };
  if (c.alpha < 1) value.alpha = r4(c.alpha);
  value.hex = hex(c);
  return value;
}

function dtcgShadow(layer) {
  const s = { color: dtcgColor(layer.color), offsetX: px(layer.offsetX), offsetY: px(layer.offsetY), blur: px(layer.blur), spread: px(layer.spread) };
  if (layer.inset) s.inset = true;
  return s;
}

/** One resolved value as a DTCG token, or null when the format has no type for it. */
function dtcgToken(name, v) {
  switch (v.kind) {
    case 'color':
      return { $type: 'color', $value: dtcgColor(v.color) };
    case 'dimension':
      return { $type: 'dimension', $value: dim(v) };
    case 'duration':
      return { $type: 'duration', $value: { value: r4(v.unit === 's' ? v.n * 1000 : v.n), unit: 'ms' } };
    case 'number':
      return isWeight(name) ? { $type: 'fontWeight', $value: v.n } : { $type: 'number', $value: r4(v.n) };
    case 'percentage':
      return { $type: 'number', $value: r4(v.n / 100), $description: 'A fraction: 0.14 is 14%.' };
    case 'fontFamily':
      return { $type: 'fontFamily', $value: v.families.length === 1 ? v.families[0] : v.families };
    case 'shadow':
      return { $type: 'shadow', $value: v.layers.length === 1 ? dtcgShadow(v.layers[0]) : v.layers.map(dtcgShadow) };
    case 'cubicBezier':
      return { $type: 'cubicBezier', $value: v.points };
    default:
      return null; // em, fluid, string
  }
}

/** Where a custom property sits in the DTCG file: a group and a token name. */
export function dtcgPath(name) {
  const rest = name.slice('--void-'.length);
  if (isKnob(name)) return ['knob', rest];
  const dash = rest.indexOf('-');
  return dash === -1 ? [rest, '$root'] : [rest.slice(0, dash), rest.slice(dash + 1)];
}

export const TYPE_ROLES = ['label', 'value', 'unit', 'caption', 'heading', 'title', 'lede', 'body', 'code'];

/** The type roles as DTCG typography tokens (the display role is fluid and has none). */
function typography(resolved) {
  const group = {};
  const get = (n) => resolved.get(n);
  for (const role of TYPE_ROLES) {
    const family = get(`--void-type-${role}-family`);
    const size = get(`--void-type-${role}-size`);
    const weight = get(`--void-type-${role}-weight`);
    if (!family || size?.kind !== 'dimension' || !weight) continue;
    const leading = get(`--void-type-${role}-leading`) ?? get('--void-leading-normal');
    const tracking = get(`--void-type-${role}-tracking`);
    // Tracking is in em; DTCG wants a length, so it is taken at the role's size.
    const trackingPx = tracking?.kind === 'em' ? tracking.n * toPx(size) : 0;
    group[role] = {
      $value: {
        fontFamily: family.families,
        fontSize: dim(size),
        fontWeight: weight.n,
        letterSpacing: px(trackingPx),
        lineHeight: r4(leading.n),
      },
    };
  }
  return { $type: 'typography', $description: 'The type roles (data-void-type), one composite token each.', ...group };
}

/**
 * A DTCG document (Format Module 2025.10) of the resolved tokens.
 *
 * Custom property --void-<group>-<name> is the token <group>.<name>; a
 * property with one word that also names a group (--void-measure beside
 * --void-measure-page) is that group's $root token; the knobs are
 * knob.<name>. Colours are sRGB with a hex fallback. Values the format
 * cannot express (keywords, em lengths, anything that depends on the
 * viewport) are listed under $extensions and are in the flat JSON.
 */
export function toDtcg(resolved, meta = {}) {
  const doc = {};
  const omitted = [];
  for (const [name, v] of resolved) {
    if (INTERNAL.test(name)) continue;
    const token = dtcgToken(name, v);
    if (!token) {
      omitted.push(name);
      continue;
    }
    const [group, key] = dtcgPath(name);
    (doc[group] ??= {})[key] = token;
  }
  // A one-word property with no siblings is a token at the top level.
  for (const [group, tokens] of Object.entries(doc)) {
    if (Object.keys(tokens).length === 1 && tokens.$root) doc[group] = tokens.$root;
  }
  if (doc.knob) doc.knob = { $description: 'The inputs. Everything else in this file is derived from them.', ...doc.knob };
  doc.typography = typography(resolved);
  return {
    $description: meta.description ?? 'Voidable theme tokens, resolved.',
    $extensions: { [EXT]: { format: `DTCG ${DTCG_VERSION}`, ...meta.extension, omitted } },
    ...Object.fromEntries(Object.keys(doc).sort().map((k) => [k, doc[k]])),
  };
}

const n4 = (n) => String(r4(n));

/** One resolved value as CSS text, free of var() and of calc() unless it is fluid. */
export function cssText(v) {
  switch (v.kind) {
    case 'color':
      return hex(v.color, true);
    case 'dimension':
    case 'duration':
      return v.n === 0 ? `0${v.unit}` : `${n4(v.n)}${v.unit}`;
    case 'number':
      return n4(v.n);
    case 'percentage':
      return `${n4(v.n)}%`;
    case 'em':
      return `${n4(v.n)}em`;
    case 'fontFamily':
      return v.families.map((f) => (/^[a-z-]+$/i.test(f) ? f : `'${f}'`)).join(', ');
    case 'shadow':
      return v.layers.map((l) => `${l.inset ? 'inset ' : ''}${n4(l.offsetX)}px ${n4(l.offsetY)}px ${n4(l.blur)}px ${n4(l.spread)}px ${hex(l.color, true)}`).join(', ');
    case 'cubicBezier':
      return `cubic-bezier(${v.points.join(', ')})`;
    default:
      return v.css;
  }
}

/** Every custom property and its resolved CSS value: { "--void-color-bg": "#000000", … }. */
export function toFlat(resolved) {
  return Object.fromEntries([...resolved].map(([name, v]) => [name, cssText(v)]));
}

/** The knobs alone as a DTCG document: what the builder exports for a theme in progress. */
export function knobsToDtcg(values, meta = {}) {
  const group = { $description: 'Voidable theme knobs. Everything else is derived from them in CSS.' };
  for (const k of knobMeta) {
    const raw = values[k.name];
    if (raw === undefined) continue;
    const key = k.param;
    if (k.type === 'fontFamily') group[key] = { $type: 'fontFamily', $value: fontFamilies(raw, {}), $description: k.description };
    else if (k.type === 'dimension') group[key] = { $type: 'dimension', $value: { value: parseFloat(raw), unit: k.unit }, $description: k.description };
    else group[key] = { $type: 'number', $value: parseFloat(raw), $description: k.description };
  }
  return {
    $description: meta.description ?? 'A Voidable theme: knob values.',
    $extensions: { [EXT]: { format: `DTCG ${DTCG_VERSION}`, ...meta.extension } },
    knob: group,
  };
}

/** A resolver document (Resolver Module 2025.10) that names every theme and scheme file. */
export function resolverDocument(files, fallback) {
  return {
    version: DTCG_VERSION,
    description: 'Voidable themes. Each context is one self-contained token file: a theme (or a skin) in one colour scheme.',
    modifiers: {
      theme: {
        description: 'Theme and colour scheme.',
        contexts: Object.fromEntries(files.map((f) => [f.context, [{ $ref: f.file }]])),
        default: fallback,
      },
    },
    resolutionOrder: [{ $ref: '#/modifiers/theme' }],
  };
}
