#!/usr/bin/env node
// SPDX-License-Identifier: MIT
//
// Reference lint (`mise run lint:reference`, #54). The machine-readable
// reference inside each package must be complete and must say what the
// `voidable` tool says:
//
//   1. @voidable/ui's dist/llms.txt and dist/reference.md are what
//      packages/ui/cem/reference.js generates from the built manifest now, so a
//      stale build or a hand edit fails;
//   2. every element of the manifest (registered elements, the CSS-only parts
//      and the styled patterns) has a section in reference.md and a line in
//      llms.txt, so a new component cannot ship without appearing;
//   3. `voidable ref --all --format json` (the Go renderer) and reference.md
//      agree: same elements, and for each the same attribute names, allowed
//      values, event names and part tags;
//   4. each adapter's llms.txt exists, points at the core reference and names
//      every public export of its package (npm index.ts exports, the gem's view
//      helpers, the hex components, the Laravel helper and directives).
//
// Needs `mise run build` and tools/voidable/build/voidable (`mise run voidable:binary`).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../release/lib.mjs';
import { buildReference, loadSupplement } from '../../packages/ui/cem/reference.js';

const errors = [];
const err = (m) => errors.push(m);
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

const dist = 'packages/ui/dist';
if (!existsSync(join(ROOT, dist, 'reference.md'))) {
  console.error('ERROR: packages/ui/dist/reference.md is missing: run `mise run build` first');
  process.exit(1);
}
const manifest = JSON.parse(read(`${dist}/custom-elements.json`));
const version = JSON.parse(read('packages/ui/package.json')).version;
const fresh = buildReference({ manifest, ...loadSupplement(), version });
const reference = read(`${dist}/reference.md`);
const llms = read(`${dist}/llms.txt`);

// 1. Up to date.
if (reference !== fresh.reference) err(`${dist}/reference.md is not what cem/reference.js generates from the manifest: rebuild @voidable/ui`);
if (llms !== fresh.llms) err(`${dist}/llms.txt is not what cem/reference.js generates from the manifest: rebuild @voidable/ui`);

// 2. Complete.
const sections = new Map();
for (const chunk of reference.split(/^## `</m).slice(1)) sections.set(chunk.slice(0, chunk.indexOf('>`')), chunk);
for (const tag of fresh.tags) {
  if (!sections.has(tag)) err(`reference.md has no section for <${tag}>`);
  if (!llms.includes(`\`<${tag}>\``)) err(`llms.txt does not list <${tag}>`);
}
for (const [tag, text] of sections) if (!/```html\n.+\n```/s.test(text)) err(`reference.md: <${tag}> has no example`);

// 3. Agrees with the Go tool.
const bin = join(ROOT, 'tools/voidable/build/voidable');
if (!existsSync(bin)) {
  err('tools/voidable/build/voidable is missing: run `mise run voidable:binary`');
} else {
  const refs = JSON.parse(execFileSync(bin, ['ref', '--all', '--format', 'json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
  const goTags = new Set(refs.map((r) => r.tag));
  for (const tag of goTags) if (!sections.has(tag)) err(`voidable ref lists <${tag}>, reference.md does not`);
  for (const tag of sections.keys()) if (!goTags.has(tag)) err(`reference.md lists <${tag}>, voidable ref does not`);
  const partTags = (ps) => (ps?.parts ?? []).flatMap((p) => [p.tag, ...partTags(p.parts)]);
  for (const r of refs) {
    const text = sections.get(r.tag);
    if (!text) continue;
    const need = (what, s) => { if (!text.includes(s)) err(`<${r.tag}>: voidable ref has ${what}, reference.md does not`); };
    for (const a of r.attributes ?? []) {
      need(`attribute ${a.name}`, `\`${a.name}\``);
      for (const v of a.values ?? []) need(`value ${v} of ${a.name}`, v);
    }
    for (const e of r.events ?? []) need(`event ${e.name}`, `\`${e.name}\``);
    for (const p of partTags(r.parts)) need(`part <${p}>`, `\`<${p}>\``);
    for (const p of r.parents ?? []) need(`parent <${p}>`, `\`<${p}>\``);
  }
}

// 4. Adapters.
const mustMention = (file, names, what) => {
  const text = read(file);
  for (const n of names) if (!text.includes(n)) err(`${file} does not mention ${what} ${n}`);
  if (!/@voidable\/ui\/reference\.md/.test(text)) err(`${file} does not point at @voidable/ui/reference.md`);
  if (!/^# /m.test(text) || !/^> /m.test(text)) err(`${file} must start with a title and a summary line`);
};

for (const dir of ['react', 'hotwire', 'alpine', 'liveview']) {
  const src = read(`packages/${dir}/src/index.ts`);
  const names = new Set();
  for (const m of src.matchAll(/export\s+(type\s+)?\{([^}]*)\}/g)) {
    // React's component wrappers are described by the naming rule, not listed one by one.
    if (dir === 'react' && !m[1] && !m[2].includes('useTheme')) continue;
    for (const n of m[2].split(',').map((s) => s.trim()).filter(Boolean)) names.add(n.split(/\s+as\s+/).pop());
  }
  mustMention(`packages/${dir}/llms.txt`, names, 'the export');
  const pkg = JSON.parse(read(`packages/${dir}/package.json`));
  if (pkg.exports?.['./llms.txt'] !== './llms.txt') err(`packages/${dir}/package.json must export "./llms.txt"`);
  if (!pkg.files?.includes('llms.txt')) err(`packages/${dir}/package.json "files" must include llms.txt`);
}

const hex = read('packages/liveview/hex/lib/voidable_ui/components.ex');
mustMention('packages/liveview/hex/llms.txt', [...hex.matchAll(/^ {2}def ([a-z_]+)\(assigns\)/gm)].map((m) => `<.${m[1]}>`), 'the component');
mustMention('packages/liveview/hex/llms.txt', ['VoidableUI.Dev.warnings'], 'the function');

const helpers = read('packages/hotwire/gem/lib/voidable/hotwire/helpers.rb');
const publicHelpers = helpers.split(/^\s*private\s*$/m)[0];
mustMention('packages/hotwire/gem/llms.txt', [...publicHelpers.matchAll(/^\s*def ([a-z_]+)/gm)].map((m) => m[1]), 'the helper');
mustMention('packages/hotwire/gem/llms.txt', ['voidable:install', 'voidable:devise_views'], 'the generator');
if (!read('packages/hotwire/gem/voidable-hotwire.gemspec').includes('llms.txt')) err('voidable-hotwire.gemspec does not ship llms.txt');
if (!read('packages/liveview/hex/mix.exs').includes('llms.txt')) err('live_voidable mix.exs does not ship llms.txt');

mustMention('packages/alpine/laravel/llms.txt', [
  ...[...read('packages/alpine/laravel/src/VoidableServiceProvider.php').matchAll(/Blade::directive\('([A-Za-z]+)'/g)].map((m) => `@${m[1]}`),
  ...[...read('packages/alpine/laravel/src/helpers.php').matchAll(/^function ([a-z_]+)/gm)].map((m) => m[1]),
], 'the directive or helper');

if (errors.length) {
  for (const e of errors) console.error(`ERROR: ${e}`);
  console.error(`\nreference lint failed: ${errors.length} problem(s)`);
  process.exit(1);
}
console.log(`reference lint passed: ${fresh.tags.length} elements; llms.txt ${llms.length} bytes, reference.md ${reference.length} bytes`);
