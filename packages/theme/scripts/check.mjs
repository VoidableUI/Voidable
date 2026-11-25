// Lint for the theme's architecture (mise run lint:theme). Run after build.mjs.
//
// Keeps four things from rotting:
//   1. the layer order, and that every source file is composed into the right layer;
//   2. the scoping rule: no selector reaches an element outside `void-*` markup
//      except the documented base, and the generated reset is current;
//   3. the `!important` declarations, each of which inverts inside a layer;
//   4. the built output: nothing unlayered, every export target present, every
//      component stylesheet self-contained and generated, never hand-listed.
import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import * as L from './lib.mjs';

const { SRC, DIST } = L;
const errors = [];
const fail = (m) => errors.push(m);
const rel = (f) => path.relative(L.ROOT, f);

// ── 1. Layers ───────────────────────────────────────────────────────────────
const EXPECTED = ['void.reset', 'void.tokens', 'void.themes', 'void.type', 'void.components', 'void.patterns', 'void.a11y'];
const statement = L.readLayersStatement();
const order = statement.replace(/^@layer\s+|;$/g, '').split(',').map((s) => s.trim());
if (order.filter((n) => n.startsWith('void.')).join() !== EXPECTED.join()) fail(`src/layers.css: the void.* layers must be ${EXPECTED.join(', ')} in that order (got ${order.filter((n) => n.startsWith('void.')).join(', ')})`);
const iv = order.indexOf(EXPECTED[0]);
const before = order.slice(0, iv).join();
const after = order.slice(iv + EXPECTED.length).join();
if (before !== 'theme,base') fail('src/layers.css: `theme, base` must come before the void layers, so a framework reset (Tailwind preflight) sits under the theme whichever stylesheet loads first');
if (after !== 'components,utilities') fail('src/layers.css: `components, utilities` must come after the void layers, so an application\'s own layers sit over the theme');

const LAYER_OF = (file) => {
  if (/^(primitives|knobs|tokens)\.css$/.test(file)) return 'void.tokens';
  if (file === 'reset.css') return 'void.reset';
  if (file === 'type.css') return 'void.type';
  if (file === 'forced-colors.css') return 'void.a11y';
  if (file === 'pre-upgrade.css' || file.startsWith('components/')) return 'void.components';
  if (/^(patterns|media|app-shell)\//.test(file)) return 'void.patterns';
  return undefined;
};
const imports = L.indexImports();
const seen = new Map();
for (const { file, layer } of imports) {
  seen.set(file, (seen.get(file) ?? 0) + 1);
  if (!fs.existsSync(path.join(SRC, file))) fail(`src/core.css imports ${file}, which does not exist`);
  const want = LAYER_OF(file);
  if (file === 'layers.css') continue;
  if (!want) fail(`src/core.css imports ${file}: no layer is defined for it in scripts/check.mjs`);
  else if (layer !== want) fail(`src/core.css: ${file} must be imported with layer(${want}), not ${layer ? `layer(${layer})` : 'no layer'}`);
}
const SKIP = new Set(['index.css', 'core.css', 'layers.css', 'base.css']);
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const srcFiles = walk(SRC).filter((f) => f.endsWith('.css')).map((f) => path.relative(SRC, f));
for (const f of srcFiles) {
  if (SKIP.has(f) || f.startsWith('themes/')) continue;
  const n = seen.get(f) ?? 0;
  if (n !== 1) fail(`src/${f} is imported ${n} times by src/core.css (it must be exactly once, or it is never built)`);
}
for (const f of srcFiles) {
  if (f === 'layers.css') continue;
  const text = L.stripComments(L.read(path.join(SRC, f)));
  if (/@layer\b/.test(text)) fail(`src/${f} declares @layer: the layer comes from how src/core.css imports the file`);
  if (!/^(index|core)\.css$/.test(f) && /@import\b/.test(text)) fail(`src/${f} uses @import: only src/core.css and src/index.css compose files`);
}

// ── 2. Scoping ──────────────────────────────────────────────────────────────
// A selector may name a theme element (`void-*`, `.void-*`) or an opt-in
// attribute of the theme. Everything else would restyle an application's own
// markup, so it is only allowed where the file is the documented base, or the
// rule only declares custom properties.
const OPT_IN = /\[data-(void-[a-z-]+|theme|shape|anim-speed)\b/;
const GLOBAL_OK = new Set(['base.css']);
const APP_SHELL_CLASS = /^\.(detail|info-grid|subtable|modal-actions)/;
for (const f of srcFiles) {
  if (GLOBAL_OK.has(f) || f.startsWith('themes/') || ['layers.css', 'index.css', 'core.css'].includes(f)) continue;
  for (const { selector, text, rule } of L.selectorsOf(L.read(path.join(SRC, f)), f)) {
    if (L.tagsOfSelector(selector).size > 0 || L.classesOfSelector(selector).size > 0 || OPT_IN.test(text)) continue;
    // App-shell layout classes are opt-in by class name (unprefixed: the framework scaffolds use them).
    if (f.startsWith('app-shell/') && APP_SHELL_CLASS.test(text)) continue;
    // Custom properties on :root are the tokens themselves; they style nothing.
    const customOnly = rule.nodes.every((n) => n.type !== 'decl' || n.prop.startsWith('--'));
    if (customOnly) continue;
    fail(`src/${f}: \`${text}\` matches elements outside the theme. Scope it to a void-* element, or put it in base.css`);
  }
}
{
  // The generated reset must be current.
  const tags = [...L.allStyledTags()].sort();
  const current = L.read(path.join(SRC, 'reset.css'));
  if (!current.includes(L.resetCss(tags))) fail('src/reset.css is stale: run `mise run theme:generate` (the scoped reset lists every void-* tag the theme styles)');
}

// ── 3. !important ───────────────────────────────────────────────────────────
// Inside a layer, `!important` inverts: an earlier layer's important beats a
// later layer's, and any layered important beats an application's unlayered
// important. So each one has to be a deliberate invariant, never a convenience.
const IMPORTANT_OK = new Map([
  ['tokens.css|--void-anim-scale', 'the OS reduced-motion preference wins over every knob, however it was set'],
  ['reset.css|outline', 'forced colours: a real focus outline wins over every `outline: none`'],
  ['components/progress.css|width', 'beats the inline width the component writes (indeterminate and reduced motion)'],
  ['components/gauge.css|stroke-width', 'beats the stroke-width the component sets on its SVG paths'],
  ['components/table.css|mask-image', 'beats the scroll fade the component sets inline while focused'],
  ['components/overlay.css|translate', 'reduced motion beats the transform the component sets inline'],
  ['components/overlay.css|scale', 'reduced motion beats the transform the component sets inline'],
  ['patterns/shell.css|display', 'data-void-hide is a utility: it must win over any display rule'],
]);
for (const f of srcFiles) {
  postcss.parse(L.read(path.join(SRC, f)), { from: f }).walkDecls((d) => {
    if (d.important && !IMPORTANT_OK.has(`${f}|${d.prop}`)) fail(`src/${f}:${d.source.start.line} \`${d.prop}: … !important\` is not in the allowlist in scripts/check.mjs. Inside a layer it beats an application's own !important; do not add one without a reason`);
  });
}

// ── 4. Built output ─────────────────────────────────────────────────────────
if (!fs.existsSync(path.join(DIST, 'void.css'))) fail('dist/ is missing: run the theme build first');
else {
  const dist = walk(DIST).filter((f) => f.endsWith('.css') && !f.endsWith('.min.css'));
  for (const f of dist) {
    const root = postcss.parse(L.read(f), { from: f });
    for (const node of root.nodes) {
      if (node.type === 'comment') continue;
      const ok = node.type === 'atrule' && (node.name === 'layer' || node.name === 'property' || node.name === 'keyframes');
      if (!ok) fail(`${rel(f)}:${node.source?.start.line}: unlayered ${node.type === 'rule' ? `rule \`${node.selector}\`` : `@${node.name}`} (everything the theme ships is in a layer)`);
    }
    const first = root.nodes.find((n) => n.type === 'atrule');
    const norm = (x) => x.replace(/\s+/g, ' ').replace(/;$/, '').replace(/, /g, ',');
    if (!first || first.name !== 'layer' || norm(first.toString()) !== norm(statement)) fail(`${rel(f)}: must open with the layer order statement`);
    if (/@import\b/.test(L.read(f))) fail(`${rel(f)} contains @import: a published stylesheet must be a single file`);
  }

  const exp = JSON.parse(L.read(path.join(DIST, 'exports.json')));
  const names = L.componentNames().filter((n) => !L.SHARED.has(n));
  const built = fs.readdirSync(path.join(DIST, 'components')).filter((f) => f.endsWith('.css') && !f.endsWith('.min.css')).map((f) => f.replace(/\.css$/, ''));
  for (const n of names) if (!built.includes(n)) fail(`no dist/components/${n}.css for src/components/${n}.css`);
  for (const n of built) if (!names.includes(n)) fail(`dist/components/${n}.css has no source`);
  for (const n of names) {
    for (const suffix of ['.css', '.min.css']) if (!fs.existsSync(path.join(DIST, 'components', n + suffix))) fail(`dist/components/${n}${suffix} is missing`);
    // Self-contained: the stylesheet of a component and of what it renders.
    const own = exp.components[n];
    if (!own) fail(`dist/exports.json has no entry for component ${n}`);
  }

  // Every registered tag has a stylesheet, or is listed as intentionally unstyled.
  const NO_STYLE = new Set(['void-error-fallback']);
  const styled = new Set();
  for (const f of srcFiles) for (const t of L.tagsOfCss(L.read(path.join(SRC, f)), f)) styled.add(t);
  for (const [tag, mod] of L.registeredTags()) if (!styled.has(tag) && !NO_STYLE.has(tag)) fail(`<${tag}> (components/${mod}.ts) is registered but nothing in the theme styles it`);

  // package.json exports resolve to files the build produces.
  const pkg = JSON.parse(L.read(path.join(L.ROOT, 'package.json')));
  for (const [key, target] of Object.entries(pkg.exports)) {
    const t = typeof target === 'string' ? target : target.default;
    if (t.includes('*')) {
      const dir = path.dirname(path.join(L.ROOT, t));
      if (!fs.existsSync(dir)) fail(`package.json exports["${key}"] -> ${t}: directory does not exist`);
    } else if (!fs.existsSync(path.join(L.ROOT, t))) fail(`package.json exports["${key}"] -> ${t}: file does not exist`);
  }
  for (const key of ['./components/*', './patterns/*', './themes/*']) if (!pkg.exports[key]) fail(`package.json exports["${key}"] is missing`);
  if (!pkg.files?.includes('dist') || !pkg.files?.includes('src')) fail('package.json "files" must include both dist (the built stylesheets) and src (the sources)');
  if (fs.existsSync(path.join(DIST, 'void.min.css.map'))) fail('dist/void.min.css.map exists: the packaging lint rejects source maps');
}

if (errors.length) {
  console.error(errors.map((e) => `ERROR: ${e}`).join('\n'));
  process.exit(1);
}
console.log('Theme lint passed: layers in order, every file in its layer, nothing global outside the base, important uses justified, built output layered and complete');
