// SPDX-License-Identifier: MIT
//
// Component tokens, read from the theme's CSS source.
//
// A component token is a custom property the theme never declares. A
// component reads it with a fallback to its default:
//
//   box-shadow: var(--void-card-shadow, var(--void-container-shadow));
//
// and documents it in a comment at the top of its file:
//
//   /* @tokens void-card
//      --void-card-shadow  Shadow of the default card. */
//
// This module joins the two: the name and the description come from the
// comment, the default from the first read in the file (the base rule; size
// and variant rules come after it). The reference tables in the docs, the
// token export, the names module and lint:component-tokens all use what it
// returns, so none of them can drift from the CSS.
//
// No Node or DOM APIs.

import { parseTokenName } from './skins.js';

const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Every `var(--void-name, fallback)` in a stylesheet, as { name, fallback } in source order. */
export function fallbackReads(css) {
  const text = strip(css);
  const out = [];
  let i = 0;
  for (;;) {
    const at = text.indexOf('var(', i);
    if (at === -1) return out;
    let depth = 1;
    let j = at + 4;
    while (depth && j < text.length) {
      if (text[j] === '(') depth++;
      else if (text[j] === ')') depth--;
      j++;
    }
    const inner = text.slice(at + 4, j - 1);
    const comma = inner.indexOf(',');
    const name = (comma === -1 ? inner : inner.slice(0, comma)).trim();
    if (comma !== -1 && name.startsWith('--void-')) out.push({ name, fallback: inner.slice(comma + 1).trim().replace(/\s+/g, ' ') });
    // a fallback may itself read a token
    i = at + 4;
  }
}

/** The `@tokens` comments of a stylesheet: [{ owner, name, description }]. */
export function documented(css) {
  const out = [];
  for (const m of css.matchAll(/\/\*\s*@tokens\s+(void-[a-z0-9-]+)\s*\n([\s\S]*?)\*\//g)) {
    let last = null;
    for (const line of m[2].split('\n')) {
      const t = /^\s*(--void-[a-z0-9-]+)\s{2,}(\S.*)$/.exec(line);
      if (t) {
        last = { owner: m[1], name: t[1], description: t[2].trim() };
        out.push(last);
      } else if (last && line.trim()) last.description += ` ${line.trim()}`;
    }
  }
  return out;
}

/**
 * Read the component tokens of the theme.
 *
 * `files` is [{ file, css }] for every stylesheet of components and
 * patterns. `owners` are the names a token can belong to (tags without
 * `void-`). `runtime` are properties the components set from TypeScript:
 * state, not tokens. `defined` are the properties the theme declares
 * (semantic and role tokens).
 *
 * Returns { tokens, problems }. A token is
 *   { name, owner, component, part, property, state, setting, default, description, file }.
 */
export function readComponentTokens(files, { owners, runtime = [], defined = [] }) {
  const problems = [];
  const docs = new Map();
  const reads = new Map();
  const isRuntime = (n) => runtime.includes(n);
  const isDefined = new Set(defined);
  for (const { file, css } of files) {
    for (const d of documented(css)) {
      if (docs.has(d.name)) problems.push(`${file}: ${d.name} is documented twice (also in ${docs.get(d.name).file})`);
      else docs.set(d.name, { ...d, file });
    }
    for (const r of fallbackReads(css)) {
      if (!reads.has(r.name)) reads.set(r.name, { file, fallback: r.fallback, count: 0 });
      reads.get(r.name).count++;
    }
    // A component token is never declared by the theme: one declaration by an application has to win.
    for (const m of strip(css).matchAll(/(?<![\w-])(--void-[a-z0-9-]+)\s*:/g)) {
      const name = m[1];
      if (isRuntime(name) || isDefined.has(name)) continue;
      if (docs.has(name) || parseTokenName(name, owners)) problems.push(`${file}: ${name} is declared by the theme. A component token is only ever read (var(${name}, default)); a working value is named --_void-*`);
    }
  }
  const ownerOf = (name) => [...owners].sort((a, b) => b.length - a.length).find((o) => name.startsWith(`--void-${o}-`));
  for (const [name, r] of reads) {
    if (docs.has(name) || isRuntime(name) || isDefined.has(name)) continue;
    if (ownerOf(name)) problems.push(`${r.file}: ${name} is read with a fallback but not documented: add it to the file's @tokens comment`);
  }
  const tokens = [];
  for (const [name, d] of docs) {
    const component = d.owner.replace(/^void-/, '');
    if (!owners.includes(component)) problems.push(`${d.file}: @tokens ${d.owner}: no component or pattern of that name`);
    if (!name.startsWith(`--void-${component}-`)) problems.push(`${d.file}: ${name} is documented under ${d.owner} but is not named --void-${component}-…`);
    const read = reads.get(name);
    if (!read) {
      problems.push(`${d.file}: ${name} is documented but nothing reads it (var(${name}, default))`);
      continue;
    }
    const setting = /^Setting:/.test(d.description);
    const parsed = parseTokenName(name, [component]);
    if (!parsed && !setting) problems.push(`${d.file}: ${name} is outside the grammar --void-<component>-<part?>-<property>-<state?> (see build/skins.js for the vocabulary). A layout parameter that is not a look is documented as "Setting: …"`);
    tokens.push({
      name,
      owner: d.owner,
      component,
      part: parsed?.part ?? null,
      property: parsed?.property ?? name.slice(`--void-${component}-`.length),
      state: parsed?.state ?? null,
      setting,
      default: read.fallback,
      description: d.description.replace(/^Setting:\s*/, ''),
      file: d.file,
    });
  }
  tokens.sort((a, b) => a.component.localeCompare(b.component) || 0);
  return { tokens, problems };
}

/** The token a default refers to when it is exactly one `var(--void-x)`, else null. */
export const aliasOf = (value) => /^var\(\s*(--void-[a-z0-9-]+)\s*\)$/.exec(value)?.[1] ?? null;

/** Tokens grouped by component: { card: [token, …], … }. */
export function byComponent(tokens) {
  const out = {};
  for (const t of tokens) (out[t.component] ??= []).push(t);
  return out;
}
