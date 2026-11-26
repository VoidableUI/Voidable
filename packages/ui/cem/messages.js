#!/usr/bin/env node
// Writes the built-in strings (#29) into dist/custom-elements.json as `voidMessages`:
//
//   - on each element's declaration: `[{ key, default, override }]`, the strings it writes, the English
//     they start as, and what replaces each one on the element (an attribute, a part, or nothing);
//   - at the top of the manifest: the whole catalogue (`key`, `default`, `purpose`, `tags`, `override`), which
//     the Translation guide's table is generated from.
//
// The English comes from the built dist/messages.js, the purpose and the override from ./messages-meta.js, and
// the check that they agree (every key described, every use in a component source listed for that component,
// every tag a registered element) fails the build, so a string cannot be added without being documented, nor
// documented for a component that does not write it.
//
// Runs in the @voidable/ui build after `vite build`, before the reference and the typings are generated.

import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { messageMeta, sampleParams } from './messages-meta.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const src = resolve(root, 'src');

/** Source files that can write a string: everything in src except the catalogue, the locales and the dev entry. */
function sources(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name !== 'dev' && name !== 'messages') sources(path, out);
    } else if (name.endsWith('.ts') && name !== 'messages.ts') out.push(path);
  }
  return out;
}

/** The text of every `msg(...)` call in `text`, parentheses balanced. */
function calls(text) {
  const found = [];
  const re = /(?<![\w.])msg\(/g;
  let m;
  while ((m = re.exec(text))) {
    let depth = 1;
    let i = re.lastIndex;
    while (i < text.length && depth > 0) {
      const c = text[i++];
      if (c === '(') depth++;
      else if (c === ')') depth--;
    }
    found.push(text.slice(re.lastIndex, i - 1));
  }
  return found;
}

export function buildMessages({ manifest, english, render }) {
  const errors = [];
  const keys = Object.keys(english);
  for (const k of keys) if (!messageMeta[k]) errors.push(`messages: "${k}" is in src/messages.ts but not in cem/messages-meta.js`);
  for (const k of Object.keys(messageMeta)) if (!(k in english)) errors.push(`messages: "${k}" is in cem/messages-meta.js but not in src/messages.ts`);

  const declared = new Map();
  for (const mod of manifest.modules) for (const d of mod.declarations ?? []) if (d.tagName) declared.set(d.tagName, d);
  for (const [k, meta] of Object.entries(messageMeta)) {
    for (const tag of meta.tags) if (!declared.has(tag)) errors.push(`messages: "${k}" names <${tag}>, which is not an element of the manifest`);
    if (meta.override?.attribute && meta.override.on === undefined) {
      for (const tag of meta.tags) {
        const attrs = new Set((declared.get(tag)?.attributes ?? []).map((a) => a.name));
        const global = meta.override.attribute.startsWith('aria-');
        if (!global && declared.has(tag) && !attrs.has(meta.override.attribute)) {
          errors.push(`messages: "${k}" is replaced by "${meta.override.attribute}" on <${tag}>, which has no such attribute`);
        }
      }
    }
  }

  // Each source that defines elements and writes a message must list one of its elements for that key.
  for (const file of sources(src)) {
    const text = readFileSync(file, 'utf8');
    const defined = [...text.matchAll(/customElements\.define\(\s*'([a-z-]+)'/g)].map((x) => x[1]);
    const used = new Set();
    for (const call of calls(text)) for (const s of call.matchAll(/'([A-Za-z.]+)'/g)) if (s[1] in english) used.add(s[1]);
    for (const k of used) {
      const tags = messageMeta[k]?.tags ?? [];
      if (defined.length && !defined.some((t) => tags.includes(t))) {
        errors.push(`messages: ${file.slice(root.length + 1)} writes "${k}" but cem/messages-meta.js lists none of ${defined.map((t) => `<${t}>`).join(', ')} for it`);
      }
    }
  }
  if (errors.length) throw new Error(errors.join('\n'));

  const catalogue = keys.map((key) => {
    const meta = messageMeta[key];
    return { key, default: render(key), purpose: meta.purpose, tags: meta.tags, override: meta.override };
  });
  for (const entry of catalogue) {
    for (const tag of entry.tags) {
      const d = declared.get(tag);
      (d.voidMessages ??= []).push({ key: entry.key, default: entry.default, override: entry.override });
    }
  }
  manifest.voidMessages = catalogue;
  return catalogue;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { englishMessages, msg } = await import(pathToFileURL(join(dist, 'messages.js')).href);
  const path = join(dist, 'custom-elements.json');
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  const catalogue = buildMessages({ manifest, english: englishMessages, render: (key) => msg(null, key, sampleParams) });
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`messages: ${catalogue.length} strings written to the manifest`);
}
