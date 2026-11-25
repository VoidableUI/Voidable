// Lint for component tokens and skins (mise run lint:component-tokens).
//
// Component tokens (build/component-tokens.js reads them from the CSS):
//   - a token documented in an `@tokens` comment that nothing reads;
//   - a token read with a fallback that no `@tokens` comment documents;
//   - a name outside the grammar --void-<component>-<part?>-<property>-<state?>;
//   - a component token the theme itself declares (it must stay unset, so one
//     declaration by an application wins).
//
// Skins (src/skins/*.css):
//   - anything but one rule `[data-void-skin="<file name>"]` of custom
//     properties: so no selector can name a component or its internals;
//   - an assignment to a knob (knobs belong to the theme), or to a property
//     that is neither a token of the theme nor a component token;
//   - an assignment that would undo a guarantee: a duration that ignores the
//     animation scale (reduced motion), a focus ring thinner than 2px, a
//     control height under 24px, half of the preferred-scheme pair;
//   - a skin that build/knobs.js does not list (the builder, the export and
//     the docs read that list).
//
// Contrast under a skin is lint:contrast's job; forced colours are in the
// a11y layer, above every skin.
import fs from 'node:fs';
import path from 'node:path';
import { readComponentTokens } from '../build/component-tokens.js';
import { evaluate, toPx } from '../build/css-eval.js';
import { knobs, skins as listedSkins } from '../build/knobs.js';
import { readSkin, skinTokens } from '../build/skins.js';
import { environment, readSource } from '../build/tokens.js';
import * as L from './lib.mjs';

const errors = [];
const fail = (m) => errors.push(m);
const src = (f) => L.read(path.join(L.SRC, f));

// ── Component tokens ────────────────────────────────────────────────────────
const declared = L.declaredTokens();
const { tokens, problems } = readComponentTokens(L.tokenFiles(), { owners: L.tokenOwners(), runtime: [...L.runtimeProperties()], defined: [...declared] });
for (const p of problems) fail(`src/${p}`);
const componentNames = new Set(tokens.map((t) => t.name));

// A role or semantic token must not shadow a component token's name, and the reverse.
for (const t of tokens) if (declared.has(t.name)) fail(`${t.name} is both a component token (src/${t.file}) and declared in the theme's tokens`);

// ── Skins ───────────────────────────────────────────────────────────────────
const source = readSource({ primitives: src('primitives.css'), knobs: src('knobs.css'), tokens: src('tokens.css') });
const knobNames = new Set(knobs.map((k) => k.name));
const files = L.listCss('skins');
for (const file of files) {
  const name = path.basename(file, '.css');
  let skin;
  try {
    skin = readSkin(src(file), name);
  } catch (e) {
    fail(`src/${file}: ${e.message}`);
    continue;
  }
  const set = skinTokens(skin);
  for (const [prop] of skin.declarations) {
    if (prop.startsWith('--_void-')) continue;
    if (knobNames.has(prop)) fail(`src/${file}: ${prop} is a knob. A skin leaves the knobs to the theme, so the two compose; assign the derived token instead`);
    else if (/^--void-preferred-scheme(-dark)?$/.test(prop)) continue;
    else if (!declared.has(prop) && !componentNames.has(prop)) fail(`src/${file}: ${prop} is not a token of the theme or a component token (mise run lint:component-tokens lists them in dist/component-tokens.json)`);
  }
  // The preferred scheme is a keyword and the same thing as a number.
  const kw = set['--void-preferred-scheme'];
  const num = set['--void-preferred-scheme-dark'];
  if ((kw === undefined) !== (num === undefined)) fail(`src/${file}: --void-preferred-scheme and --void-preferred-scheme-dark are set together (light with 0, dark with 1)`);
  else if (kw !== undefined && !((kw === 'light' && num === '0') || (kw === 'dark' && num === '1'))) fail(`src/${file}: --void-preferred-scheme: ${kw} goes with --void-preferred-scheme-dark: ${kw === 'light' ? 0 : 1}`);

  // Guarantees a token assignment could undo.
  const env = environment(source, { scheme: 'light', skin: set });
  const px = (prop) => {
    try {
      const v = evaluate(set[prop], env);
      return v.kind === 'dimension' ? toPx(v) : null;
    } catch {
      return null;
    }
  };
  for (const prop of Object.keys(set)) {
    if (/^--void-duration-/.test(prop) && !/var\(--void-anim-scale\)/.test(set[prop])) fail(`src/${file}: ${prop} must multiply by var(--void-anim-scale), or reduced motion no longer switches it off`);
    if (prop === '--void-anim-scale') fail(`src/${file}: --void-anim-scale is a knob and the user's reduced-motion preference`);
    if (prop === '--void-focus-ring-width' && (px(prop) ?? 0) < 2) fail(`src/${file}: --void-focus-ring-width must stay at least 2px`);
    if ((prop === '--void-control-height' || /^--void-[a-z0-9-]+-(height|size)$/.test(prop)) && !/^--void-(badge|tag)-/.test(prop)) {
      const h = px(prop);
      if (h !== null && h < 24) fail(`src/${file}: ${prop} is ${h}px; a control keeps at least 24px (WCAG 2.5.8)`);
    }
  }
  if (!listedSkins.some((s) => s.id === name)) fail(`src/${file}: add the skin to \`skins\` in build/knobs.js (the builder, the token export and the docs read that list)`);
  if (!/^\s*\/\* [A-Z][\w ]* — \S/.test(src(file))) fail(`src/${file}: start the file with a comment of the form \`/* Name — one line.\`, as a theme does`);
}
for (const s of listedSkins) if (!files.some((f) => path.basename(f, '.css') === s.id)) fail(`build/knobs.js lists the skin "${s.id}" but src/skins/${s.id}.css does not exist`);

// The built skins declare their tokens on every scope and name no component.
for (const file of files) {
  const built = path.join(L.DIST, file);
  if (!fs.existsSync(built)) continue;
  for (const { selector, text } of L.selectorsOf(L.read(built), built)) {
    if (L.tagsOfSelector(selector).size && !/:where\([^)]*void-(media|glass)/.test(text)) fail(`dist/${file}: \`${text}\` names a component`);
    if (L.classesOfSelector(selector).size) fail(`dist/${file}: \`${text}\` names a component's internals`);
  }
}

if (errors.length) {
  console.error(errors.map((e) => `ERROR: ${e}`).join('\n'));
  process.exit(1);
}
const owners = new Set(tokens.map((t) => t.component));
console.log(`Component-token lint passed: ${tokens.length} component tokens on ${owners.size} components and patterns, each documented, read and inside the grammar; ${files.length} skin(s) of token assignments only`);
