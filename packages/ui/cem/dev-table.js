#!/usr/bin/env node
// Generate src/dev/table.generated.ts for the development-mode entry
// (`@voidable/ui/dev`, src/dev/) from dist/custom-elements.json. Runs in the
// @voidable/ui build after `cem analyze` and before `vite build`, so what the
// runtime warnings treat as valid is always the manifest's: a new attribute, a
// changed value set or a new tag appears with no edit.
//
// Compact on purpose (it ships in the dev entry only, never in the root entry).
// Per tag:
//   m  module name under components/ (for "import this component" advice)
//   a  attribute -> 0 any string | 1 boolean | 2 boolean that also reads "false"
//                 | 3 number | string[] the allowed values (enum)
//   h  host attributes the component sets on itself (besides role/aria-*/tabindex)
//   e  events it dispatches (including ones that bubble from children)
//   p  tags it must sit inside (anywhere above it)
//   r  tags it cannot work without (somewhere below it)
//   x  advice for attributes people guess that do not exist
//   n  what names the element (supplement.js accessibleName): a attributes, c content names it,
//      t part tags whose presence names it, p ancestors as [tag, ...attributes], h the hint
//   q  its explicit parts (#52), from the manifest's voidParts:
//        k 'parts' (only parts as children) or 'any'; o ordered; t transparent
//        wrapper tags; s the one-line correct markup; l advice for loose
//        children (the implicit form it replaced); n the parts, each
//        { t tag, r required, x max, c wraps one control }
//   c  1 for a CSS-only part (styled by the theme, never registered)
//   l  what was renamed or removed in 0.8 (#23), the manifest's voidRenamed:
//        a old attribute -> { to, values, fix }; v attribute -> { old value -> new };
//        e old event -> what to listen for instead
//   v  the native control the author writes inside it, from voidNative: { tag, fix }
//   k  it can be one link or button as a whole (#116), from voidLinked: { p the part
//        that holds the control, c the void-* tags that count as controls, s the correct markup }
// Also exported: `removed`, tags that were replaced by parts, with the fix.
// Also exported: `styled`, the tags of the CSS-only elements (the page patterns
// and the media surface). @voidable/theme styles them and nothing registers
// them, so they are not in the manifest and must not be reported as unknown.
// The list is read from the voidable tool's supplement (its `styled` section,
// tools/voidable/.../rules.json), the one place that declares them.
// It is a build artefact and is not committed.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(resolve(root, 'dist/custom-elements.json'), 'utf8'));

/** @param {string} text the manifest's type text for an attribute */
function encode(text) {
  const t = (text ?? 'string').trim();
  if (t === 'boolean') return 1;
  if (/^number(\s*\|\s*(undefined|null))*$/.test(t)) return 2;
  const parts = t.split('|').map((p) => p.trim());
  const literals = parts.filter((p) => /^'[^']*'$/.test(p)).map((p) => p.slice(1, -1));
  const rest = parts.filter((p) => !/^'[^']*'$/.test(p));
  // A pure literal union (optionally nullable) is a closed set; anything wider
  // (`number | 'any'`, `string | null`) accepts values the table cannot list.
  if (literals.length > 0 && rest.every((p) => p === 'null' || p === 'undefined')) return literals;
  return 0;
}

const tags = {};
const removed = {};
/** Event names removed in 0.8 (#23), with what to listen for instead (any tag's advice). */
const renamedEvents = {};

/** The compact parts entry of a component or part. */
function partsEntry(spec, skeleton) {
  const q = { k: spec.children ?? 'any', s: skeleton, n: spec.parts.map((p) => ({ t: p.tag, ...(p.required ? { r: 1 } : {}), ...(p.max ? { x: p.max } : {}), ...(p.control ? { c: 1 } : {}) })) };
  if (spec.ordered) q.o = 1;
  if (spec.transparent?.length) q.t = spec.transparent;
  if (spec.legacy?.children) q.l = spec.legacy.children;
  return q;
}

/** Table entries for the parts of `owner` (CSS-only parts get their own entry; registered ones gain `q`). */
function addParts(owner, module, spec, skeleton) {
  for (const part of spec.parts) {
    if (part.cssOnly) {
      const entry = { m: module, a: {}, e: [], p: [owner], c: 1 };
      for (const a of part.attributes ?? []) entry.a[a.name] = encode(a.type?.text, false);
      tags[part.tag] = entry;
    }
    if (part.parts) {
      later.push(() => {
        tags[part.tag].q = partsEntry(part, skeleton);
        addParts(part.tag, module, part, skeleton);
      });
    }
  }
}
const later = [];

for (const mod of manifest.modules) {
  const match = /^dist\/components\/([^/]+)\.js$/.exec(mod.path);
  if (!match) continue;
  for (const decl of mod.declarations ?? []) {
    if (decl.kind !== 'class' || !decl.tagName) continue;
    const entry = { m: match[1], a: {}, e: [] };
    for (const a of decl.attributes ?? []) entry.a[a.name] = encode(a.type?.text);
    for (const ev of decl.events ?? []) entry.e.push(ev.name);
    entry.e.sort();
    if (decl.voidHostAttributes?.length) entry.h = decl.voidHostAttributes;
    if (decl.voidParents?.length) entry.p = decl.voidParents;
    if (decl.voidRequires?.length) entry.r = decl.voidRequires;
    if (decl.voidHints && Object.keys(decl.voidHints).length) entry.x = decl.voidHints;
    if (decl.voidName) {
      const n = decl.voidName;
      entry.n = { a: n.attributes, h: n.hint };
      if (n.content) entry.n.c = 1;
      if (n.parts?.length) entry.n.t = n.parts;
      if (n.ancestors?.length) entry.n.p = n.ancestors.map((x) => [x.tag, ...(x.attributes ?? [])]);
    }
    if (decl.voidRenamed) {
      const r = decl.voidRenamed;
      entry.l = {};
      if (r.attributes) entry.l.a = r.attributes;
      if (r.values) entry.l.v = r.values;
      if (r.events) {
        entry.l.e = r.events;
        for (const [name, advice] of Object.entries(r.events)) renamedEvents[name] ??= advice;
      }
    }
    if (decl.voidNative) entry.v = { tag: decl.voidNative.tag, fix: decl.voidNative.fix };
    if (decl.voidLinked) entry.k = { p: decl.voidLinked.part, c: decl.voidLinked.controls, s: decl.voidLinked.fix };
    tags[decl.tagName] = entry;
    if (decl.voidParts) {
      entry.q = partsEntry(decl.voidParts, decl.voidParts.skeleton);
      for (const [tag, advice] of Object.entries(decl.voidParts.legacy?.tags ?? {})) removed[tag] = advice;
      later.push(() => addParts(decl.tagName, match[1], decl.voidParts, decl.voidParts.skeleton));
    }
  }
}
while (later.length) later.shift()();
if (Object.keys(tags).length === 0) throw new Error('custom-elements.json contains no components in dist/components/');
for (const [tag, entry] of Object.entries(tags)) {
  for (const t of [...(entry.p ?? []), ...(entry.r ?? [])]) {
    if (!tags[t]) throw new Error(`${tag} refers to unknown tag ${t}`);
  }
}

const stylesRules = resolve(root, '../../tools/voidable/internal/infra/embedded/data/supplement/rules.json');
const styled = (JSON.parse(readFileSync(stylesRules, 'utf8')).styled ?? []).map((s) => s.tag).sort();
for (const tag of styled) {
  if (!/^void-/.test(tag)) throw new Error(`styled element ${tag} is not a void-* tag`);
  if (tags[tag]) throw new Error(`${tag} is both a registered component and a styled element`);
}

const sorted = Object.fromEntries(Object.entries(tags).sort(([x], [y]) => x.localeCompare(y)));

writeFileSync(
  resolve(root, 'src/dev/table.generated.ts'),
  `// Generated from custom-elements.json by packages/ui/cem/dev-table.js. Do not edit.
import type { DevTable } from './types.js';

export const table: DevTable = ${JSON.stringify(sorted)};

/** CSS-only \`void-*\` tags: styled by the theme, never registered, never "unknown". */
export const styled: readonly string[] = ${JSON.stringify(styled)};

/** Tags that were replaced by explicit parts, with the fix. */
export const removed: Readonly<Record<string, string>> = ${JSON.stringify(removed)};

/** Event names removed in 0.8 (#23), with what to listen for instead. */
export const renamedEvents: Readonly<Record<string, string>> = ${JSON.stringify(renamedEvents)};
`,
);
console.log(`[cem] dev table: ${Object.keys(sorted).length} tags, ${styled.length} styled`);
