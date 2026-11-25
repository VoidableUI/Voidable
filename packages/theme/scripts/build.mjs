// Builds @voidable/theme's published stylesheets from src/.
//
//   node scripts/build.mjs                    everything: src/reset.css, then dist/
//   node scripts/build.mjs --generated-only   only the generated source file (src/reset.css)
//
// dist/ holds, each as `x.css` (readable) and `x.min.css`:
//   void            everything: tokens, base, every component, pattern and chart
//   core            the same without the optional base (html and body)
//   tokens          layer order, primitives, knobs, derived tokens, surfaces, type roles
//   base            the optional html/body defaults
//   primitives, knobs, type, reset, layers   single parts
//   components/<name>   one component, with what it needs to render on its own
//   patterns/<name>     one group of CSS-only elements
//   themes/<name>       one demonstration theme, in its layer
//   skins/<name>        one skin (data-void-skin), in the layer above the patterns
// plus exports.json. No source map: the bundle is flattened from many files and the
// packaging lint rejects maps (they would point at sources the package does not publish
// under those names); the unminified file is the readable form.
import fs from 'node:fs';
import path from 'node:path';
import { bundleAsync } from 'lightningcss';
import * as L from './lib.mjs';

const { SRC, DIST } = L;
const generatedOnly = process.argv.includes('--generated-only');

// ── The one generated source file ───────────────────────────────────────────
const FOCUS_RING = (S) => {
  const roots = `:is(${S.join(', ')})`;
  return `
/* Forced colours: many components replace the outline with a shadow or a
   border colour for focus, and forced colours drop shadows. Restore a real
   outline on every theme element; it wins over every \`outline: none\`. */
@media (forced-colors: active) {
  :where(${roots}, ${roots} *):focus-visible {
    outline: var(--void-focus-ring-width, 2px) solid Highlight !important;
    outline-offset: var(--void-focus-ring-offset, 2px);
  }
}
`;
};

const allTags = [...L.allStyledTags()].sort();
const resetSource = L.RESET_HEADER + L.resetCss(allTags) + FOCUS_RING(allTags);
fs.writeFileSync(path.join(SRC, 'reset.css'), resetSource);
if (generatedOnly) process.exit(0);

// ── Analysis ────────────────────────────────────────────────────────────────
const statement = L.readLayersStatement();
const components = L.componentNames();
const ownerOfTag = L.makeOwnerOfTag(components);
const ownerOfClass = L.makeOwnerOfClass(components);

const upgrade = L.splitByComponent(L.read(path.join(SRC, 'pre-upgrade.css')), 'pre-upgrade.css', ownerOfTag, ownerOfClass);
const forced = L.splitByComponent(L.read(path.join(SRC, 'forced-colors.css')), 'forced-colors.css', ownerOfTag, ownerOfClass);
const problems = [...upgrade.unmapped, ...forced.unmapped];
if (upgrade.globals.length || forced.globals.length) {
  for (const g of [...upgrade.globals, ...forced.globals]) problems.push(`global selector in a split file: ${g.selectors.join(', ')}`);
}
if (problems.length) {
  console.error(`The theme build cannot place these selectors in a component:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}

// ── Bundling (lightningcss, with in-memory entries) ─────────────────────────
const virtual = new Map();
const abs = (rel) => path.join(SRC, rel);
const resolver = {
  read: (file) => (virtual.has(file) ? virtual.get(file) : fs.readFileSync(file, 'utf8')),
  resolve: (specifier, from) => (specifier.startsWith('virtual:') || path.isAbsolute(specifier) ? specifier : path.resolve(path.dirname(from), specifier)),
};

/**
 * Lightningcss splits the leading layer statement into pieces it leaves
 * around the output. Put the canonical statement first and drop the rest;
 * every layer is still declared, in order, by the first.
 */
const compact = (s) => s.replace(/\s+/g, ' ').replace(/, /g, ',').replace(/\s*;$/, ';');
const withStatement = (css, minify) => {
  const body = css.replace(/@layer\s[\w.,\s-]+;\s*/g, '').replace(/^\s+/, '');
  return minify ? `${compact(statement)}${body}` : `${statement}\n\n${body}`;
};

async function bundle(name, entry, { minify, sourceMap = false }) {
  const filename = `virtual:${name}`;
  virtual.set(filename, entry);
  const r = await bundleAsync({ filename, minify, sourceMap, projectRoot: DIST, resolver });
  let css = r.code.toString();
  css = withStatement(css, minify);
  return { css, map: r.map ? r.map.toString() : null };
}

const sizes = [];
async function emit(rel, entry, { map = false } = {}) {
  const plain = await bundle(rel, entry, { minify: false });
  const min = await bundle(rel, entry, { minify: true, sourceMap: map });
  const out = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(`${out}.css`, plain.css);
  let minCss = min.css;
  if (map && min.map) {
    minCss += `\n/*# sourceMappingURL=${path.basename(rel)}.min.css.map */\n`;
    fs.writeFileSync(`${out}.min.css.map`, min.map);
  }
  fs.writeFileSync(`${out}.min.css`, minCss);
  sizes.push({ file: rel, bytes: Buffer.byteLength(plain.css), min: Buffer.byteLength(minCss) });
}

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

const imp = (rel, layer) => `@import '${abs(rel)}'${layer ? ` layer(${layer})` : ''};`;
const impVirtual = (name, content, layer) => {
  virtual.set(`virtual:${name}`, content);
  return `@import 'virtual:${name}' layer(${layer});`;
};
const wrapReset = (tags) => L.resetCss([...tags].sort());

// layers, primitives, knobs, type, base, reset
await emit('layers', statement);
await emit('primitives', `${statement}\n${imp('primitives.css', 'void.tokens')}`);
await emit('knobs', `${statement}\n${imp('knobs.css', 'void.tokens')}`);
await emit('type', `${statement}\n${imp('type.css', 'void.type')}`);
await emit('base', `${statement}\n${imp('base.css', 'void.reset')}`);
await emit('reset', `${statement}\n${imp('reset.css', 'void.reset')}`);

// tokens: everything a component's rules read
await emit(
  'tokens',
  [statement, imp('primitives.css', 'void.tokens'), imp('knobs.css', 'void.tokens'), imp('tokens.css', 'void.tokens'), imp('media/surface.css', 'void.patterns'), imp('type.css', 'void.type')].join('\n'),
);

// core and void
await emit('core', `@import '${abs('core.css')}';`);
await emit('void', `@import '${abs('core.css')}';\n${imp('base.css', 'void.reset')}`);

// per component
const exportsJson = { layers: L.voidLayers(), components: {}, patterns: {}, themes: [], skins: [] };
const tagsOfFile = (rel) => L.tagsOfCss(L.read(abs(rel)), rel);
for (const name of components) {
  if (L.SHARED.has(name)) continue;
  const chain = L.closure(name, ownerOfTag);
  const files = chain.map((n) => `components/${n}.css`);
  const tags = new Set();
  for (const f of files) for (const t of tagsOfFile(f)) tags.add(t);
  const upg = chain.map((n) => upgrade.byComponent.get(n) ?? '').join('');
  const fc = chain.map((n) => forced.byComponent.get(n) ?? '').join('');
  const parts = [statement, impVirtual(`reset-${name}`, wrapReset(tags), 'void.reset'), ...files.map((f) => imp(f, 'void.components'))];
  if (upg) parts.push(impVirtual(`upgrade-${name}`, upg, 'void.components'));
  if (fc) parts.push(impVirtual(`forced-${name}`, fc, 'void.a11y'));
  await emit(`components/${name}`, parts.join('\n'));
  exportsJson.components[name] = { requires: chain.filter((n) => n !== name), tags: [...tags].sort() };
}

// per pattern group
const patternGroups = {
  shell: ['patterns/shell.css'],
  page: ['patterns/page.css'],
  data: ['patterns/data.css'],
  media: ['media/media.css'],
  'app-shell': L.listCss('app-shell'),
};
for (const f of L.listCss('patterns')) {
  const n = path.basename(f, '.css');
  if (!patternGroups[n]) patternGroups[n] = [f];
}
for (const [name, files] of Object.entries(patternGroups)) {
  if (!files.length) continue;
  const tags = new Set();
  for (const f of files) for (const t of tagsOfFile(f)) tags.add(t);
  const parts = [statement];
  if (tags.size) parts.push(impVirtual(`reset-pattern-${name}`, wrapReset(tags), 'void.reset'));
  for (const f of files) parts.push(imp(f, 'void.patterns'));
  await emit(`patterns/${name}`, parts.join('\n'));
  exportsJson.patterns[name] = { tags: [...tags].sort() };
}

// themes
for (const f of L.listCss('themes')) {
  const n = path.basename(f, '.css');
  await emit(`themes/${n}`, `${statement}\n${imp(f, 'void.themes')}`);
  exportsJson.themes.push(n);
}

// skins
for (const f of L.listCss('skins')) {
  const n = path.basename(f, '.css');
  await emit(`skins/${n}`, `${statement}\n${imp(f, 'void.skins')}`);
  exportsJson.skins.push(n);
}

fs.writeFileSync(path.join(DIST, 'exports.json'), `${JSON.stringify(exportsJson, null, 2)}\n`);
const full = sizes.find((s) => s.file === 'void');
console.log(`@voidable/theme: ${sizes.length} stylesheets built. void.css ${(full.bytes / 1024).toFixed(1)} KB, void.min.css ${(full.min / 1024).toFixed(1)} KB`);
