#!/usr/bin/env node
// Generate src/autoloader-table.generated.ts for the autoloader entry
// (src/autoloader.ts) from dist/custom-elements.json. Runs in the @voidable/ui
// build after `cem analyze` and before `vite build`, so the table is always the
// manifest's: a new component or tag appears in the autoloader with no edit.
//
// The file holds a literal `import('./components/<name>.js')` per component
// module, which is what lets a bundler give each component its own chunk. It is
// a build artefact and is not committed.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(resolve(root, 'dist/custom-elements.json'), 'utf8'));

/** @type {Map<string, string>} tag -> module name */
const tags = new Map();
for (const mod of manifest.modules) {
  const match = /^dist\/components\/([^/]+)\.js$/.exec(mod.path);
  if (!match) continue;
  for (const decl of mod.declarations ?? []) {
    if (decl.kind !== 'class' || !decl.tagName) continue;
    if (tags.has(decl.tagName)) throw new Error(`${decl.tagName} is declared by two modules`);
    tags.set(decl.tagName, match[1]);
  }
}
if (tags.size === 0) throw new Error('custom-elements.json contains no components in dist/components/');

const sorted = [...tags].sort(([a], [b]) => a.localeCompare(b));
const names = [...new Set(sorted.map(([, name]) => name))].sort();

writeFileSync(
  resolve(root, 'src/autoloader-table.generated.ts'),
  `// Generated from custom-elements.json by packages/ui/cem/autoloader-table.js. Do not edit.
import type { ModuleLoader } from './autoloader-core.js';

/** Tag name -> the module under components/ that registers it. */
export const tags: Readonly<Record<string, string>> = {
${sorted.map(([tag, name]) => `  '${tag}': '${name}',`).join('\n')}
};

/** Module name -> loader. One literal import each, so bundlers split per component. */
export const modules: Readonly<Record<string, ModuleLoader>> = {
${names.map((name) => `  '${name}': () => import('./components/${name}.js'),`).join('\n')}
};
`,
);
console.log(`[cem] autoloader table: ${tags.size} tags from ${names.length} modules`);
