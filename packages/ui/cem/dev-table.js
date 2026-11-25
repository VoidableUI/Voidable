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
// It is a build artefact and is not committed.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(resolve(root, 'dist/custom-elements.json'), 'utf8'));

/** @param {string} text the manifest's type text for an attribute */
function encode(text, falseString) {
  const t = (text ?? 'string').trim();
  if (t === 'boolean') return falseString ? 2 : 1;
  if (falseString) throw new Error(`falseString on a non-boolean attribute (${t})`);
  if (/^number(\s*\|\s*(undefined|null))*$/.test(t)) return 3;
  const parts = t.split('|').map((p) => p.trim());
  const literals = parts.filter((p) => /^'[^']*'$/.test(p)).map((p) => p.slice(1, -1));
  const rest = parts.filter((p) => !/^'[^']*'$/.test(p));
  // A pure literal union (optionally nullable) is a closed set; anything wider
  // (`number | 'any'`, `string | null`) accepts values the table cannot list.
  if (literals.length > 0 && rest.every((p) => p === 'null' || p === 'undefined')) return literals;
  return 0;
}

const tags = {};
for (const mod of manifest.modules) {
  const match = /^dist\/components\/([^/]+)\.js$/.exec(mod.path);
  if (!match) continue;
  for (const decl of mod.declarations ?? []) {
    if (decl.kind !== 'class' || !decl.tagName) continue;
    const entry = { m: match[1], a: {}, e: [] };
    for (const a of decl.attributes ?? []) entry.a[a.name] = encode(a.type?.text, a.falseString === true);
    for (const ev of decl.events ?? []) entry.e.push(ev.name);
    entry.e.sort();
    if (decl.voidHostAttributes?.length) entry.h = decl.voidHostAttributes;
    if (decl.voidParents?.length) entry.p = decl.voidParents;
    if (decl.voidRequires?.length) entry.r = decl.voidRequires;
    if (decl.voidHints && Object.keys(decl.voidHints).length) entry.x = decl.voidHints;
    tags[decl.tagName] = entry;
  }
}
if (Object.keys(tags).length === 0) throw new Error('custom-elements.json contains no components in dist/components/');
for (const [tag, entry] of Object.entries(tags)) {
  for (const t of [...(entry.p ?? []), ...(entry.r ?? [])]) {
    if (!tags[t]) throw new Error(`${tag} refers to unknown tag ${t}`);
  }
}

const sorted = Object.fromEntries(Object.entries(tags).sort(([x], [y]) => x.localeCompare(y)));

writeFileSync(
  resolve(root, 'src/dev/table.generated.ts'),
  `// Generated from custom-elements.json by packages/ui/cem/dev-table.js. Do not edit.
import type { DevTable } from './types.js';

export const table: DevTable = ${JSON.stringify(sorted)};
`,
);
console.log(`[cem] dev table: ${Object.keys(sorted).length} tags`);
