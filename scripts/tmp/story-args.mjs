// Story args and render() bindings that do not exist on the manifest's element (host only).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const manifest = JSON.parse(readFileSync('packages/ui/dist/custom-elements.json', 'utf8'));
const byTag = new Map();
for (const mod of manifest.modules) for (const d of mod.declarations ?? []) if (d.tagName) byTag.set(d.tagName, d);
const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const known = (tag) => {
  const d = byTag.get(tag);
  const s = new Set();
  for (const m of d?.members ?? []) s.add(m.name);
  for (const a of d?.attributes ?? []) { s.add(a.name); s.add(camel(a.name)); }
  return s;
};
const dir = 'packages/storybook/stories';
for (const f of readdirSync(dir).filter((n) => n.endsWith('.stories.ts'))) {
  const src = readFileSync(join(dir, f), 'utf8');
  const m = src.match(/argTypesFor\(\s*'([^']+)'(?:\s*,\s*\{([\s\S]*?)\}\s*\))?/);
  if (!m) { console.log(`${f}: no argTypesFor`); continue; }
  const tag = m[1];
  if (!byTag.has(tag)) { console.log(`${f}: ${tag} not in manifest`); continue; }
  const ok = known(tag);
  for (const k of (m[2] ?? '').matchAll(/^\s{4}(\w+):/gm)) ok.add(k[1]);
  // args blocks: top-level keys (6 spaces) inside `args: {`
  for (const a of src.matchAll(/args:\s*\{([\s\S]*?)\n\s{2,4}\},?/g)) {
    for (const k of a[1].matchAll(/(?:^|[{,]\s*|\n\s*)(\w+):/g)) {
      if (!ok.has(k[1])) console.log(`${f}: arg '${k[1]}' not on ${tag}`);
    }
  }
  // bindings on the element used by the story
  for (const b of src.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, 'g'))) {
    for (const at of b[1].matchAll(/(?:^|\s)([?.@]?)([\w-]+)=/g)) {
      const name = at[2];
      if (at[1] === '@' || name.startsWith('aria-') || name.startsWith('data-') || ['class', 'style', 'id', 'slot', 'name', 'part', 'role', 'tabindex', 'title', 'hidden', 'lang', 'dir', 'autofocus', 'popover'].includes(name)) continue;
      if (!ok.has(name) && !ok.has(camel(name))) console.log(`${f}: <${tag}> binds '${name}', not in the manifest`);
    }
  }
}
