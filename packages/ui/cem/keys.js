#!/usr/bin/env node
// Writes the key actions (#90) into dist/custom-elements.json as `voidKeys`, on each element's declaration:
//
//   { intro?, note?, actions: [{ action, keys, labels, description, essential }], browser?: [{ keys, action }] }
//
// `keys` are the default bindings exactly as the component's map has them (src/keymaps/, read through the built
// dist/keymaps.js, so the maps are written once) and `labels` the same for a reader ("Right Arrow (Left Arrow in
// right-to-left text)"). The words come from ./keys-meta.js. The checks fail the build: an element with a map and no
// entry, an action with no description, a description or `essential` entry for an action the map does not have,
// an entry for an element the manifest lacks or whose class does not declare the `keys` attribute.
//
// Runs in the @voidable/ui build after `vite build`, before the reference and the typings are generated.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { keysMeta } from './keys-meta.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');

const NAMES = {
  ArrowRight: 'Right Arrow', ArrowLeft: 'Left Arrow', ArrowUp: 'Up Arrow', ArrowDown: 'Down Arrow',
  PageUp: 'Page Up', PageDown: 'Page Down', Escape: 'Escape', Enter: 'Enter', Space: 'Space', Tab: 'Tab',
  Home: 'Home', End: 'End', Backspace: 'Backspace', Delete: 'Delete', ',': 'Comma', Control: 'Ctrl',
};

/** One binding as a reader sees it. */
export function label(spec) {
  if (spec === 'ArrowInlineEnd') return 'Right Arrow (Left Arrow in right-to-left text)';
  if (spec === 'ArrowInlineStart') return 'Left Arrow (Right Arrow in right-to-left text)';
  if (spec === 'Printable') return 'Characters';
  const cut = spec.length > 1 ? spec.lastIndexOf('+', spec.length - 2) : -1;
  const key = spec.slice(cut + 1);
  const mods = cut < 0 ? [] : spec.slice(0, cut).split('+');
  return [...mods.map((m) => NAMES[m] ?? m), NAMES[key] ?? (key.length === 1 ? key.toUpperCase() : key)].join(' + ');
}

export function buildKeys({ manifest, maps }) {
  const errors = [];
  const declared = new Map();
  for (const mod of manifest.modules) for (const d of mod.declarations ?? []) if (d.tagName) declared.set(d.tagName, d);

  for (const tag of Object.keys(maps)) if (!keysMeta[tag]) errors.push(`keys: <${tag}> has a key map (src/keymaps/) but no entry in cem/keys-meta.js`);
  for (const [tag, meta] of Object.entries(keysMeta)) {
    const d = declared.get(tag);
    if (!d) {
      errors.push(`keys: cem/keys-meta.js describes <${tag}>, which is not an element of the manifest`);
      continue;
    }
    const source = meta.from ?? tag;
    const map = maps[source];
    if (!map) {
      errors.push(`keys: <${tag}> has no key map${meta.from ? ` (nor has <${meta.from}>)` : ''}`);
      continue;
    }
    if (!meta.from) {
      if (!(d.attributes ?? []).some((a) => a.name === 'keys')) errors.push(`keys: <${tag}> has a key map but no \`keys\` attribute`);
      const described = Object.keys(meta.actions ?? {});
      for (const a of Object.keys(map)) if (!described.includes(a)) errors.push(`keys: <${tag}> action "${a}" has no description in cem/keys-meta.js`);
      for (const a of described) if (!(a in map)) errors.push(`keys: cem/keys-meta.js describes "${a}" of <${tag}>, which its key map does not have`);
      for (const a of meta.essential ?? []) if (!(a in map)) errors.push(`keys: "${a}" is essential on <${tag}> but its key map does not have it`);
    }
  }
  if (errors.length) throw new Error(errors.join('\n'));

  const entry = (tag, meta) => {
    const own = meta.from ? keysMeta[meta.from] : meta;
    const map = maps[meta.from ?? tag];
    const out = {};
    const intro = meta.intro ?? own.intro;
    if (intro) out.intro = intro;
    if (meta.note ?? own.note) out.note = meta.note ?? own.note;
    out.actions = Object.keys(map).map((action) => ({
      action,
      keys: [...map[action]],
      labels: map[action].map(label),
      description: own.actions[action],
      ...(own.essential?.includes(action) ? { essential: true } : {}),
    }));
    const browser = [...(meta.browser ?? own.browser ?? [])];
    if (browser.length) out.browser = browser.map(([keys, action]) => ({ keys, action }));
    return out;
  };
  let count = 0;
  for (const [tag, meta] of Object.entries(keysMeta)) {
    declared.get(tag).voidKeys = entry(tag, meta);
    count++;
  }
  return count;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { keyMaps } = await import(pathToFileURL(join(dist, 'keymaps.js')).href);
  const path = join(dist, 'custom-elements.json');
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  const count = buildKeys({ manifest, maps: keyMaps });
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`keys: ${count} elements' key actions written to the manifest`);
}
