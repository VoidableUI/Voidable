// Keeps story controls in step with the Custom Elements Manifest (run by `mise run lint:manifest`).
//
// Fails when a story file for a component:
//   1. declares an argTypes entry for a real attribute of that component with a hand-written
//      `options` or control (the manifest already generates those; see .storybook/manifest.ts);
//   2. gives an `args` value for a string-union attribute that is not one of the union's values.
//
// Stories are read as text and their object literals evaluated, so a story that builds its
// args dynamically is reported rather than silently passed.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const MANIFEST = join(ROOT, 'packages/ui/dist/custom-elements.json');
const STORIES = join(ROOT, 'packages/storybook/stories');

if (!existsSync(MANIFEST)) {
  console.error(`ERROR: ${MANIFEST} not found; run \`mise run build\` first`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const elements = new Map();
for (const mod of manifest.modules) {
  for (const d of mod.declarations ?? []) {
    if (!d.tagName) continue;
    const attrs = new Map();
    for (const a of d.attributes ?? []) {
      const field = a.fieldName ?? a.name.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
      attrs.set(a.name, { name: a.name, field, type: a.type?.text ?? '' });
    }
    elements.set(d.tagName, attrs);
  }
}

/** The values of a string-literal union type text, or null when the type is not one. */
function stringUnion(type) {
  const parts = type
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s && s !== 'undefined' && s !== 'null');
  if (!parts.length) return null;
  const values = parts.map((p) => /^'([^']*)'$/.exec(p)?.[1]);
  return values.every((v) => v !== undefined) ? values : null;
}

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** The balanced `{ ... }` starting at or after `from`, or null. */
function braceBlock(src, from) {
  const open = src.indexOf('{', from);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return src.slice(open, i + 1);
  }
  return null;
}

const failures = [];
const warnings = [];
const fail = (file, msg) => failures.push(`${file}: ${msg}`);

for (const file of readdirSync(STORIES).filter((f) => /\.stories\.[jt]sx?$/.test(f)).sort()) {
  const src = stripComments(readFileSync(join(STORIES, file), 'utf8'));
  const helperTag = src.match(/argTypesFor\(\s*'([^']+)'/)?.[1];
  const tag = helperTag ?? src.match(/^\s*component:\s*'(void-[^']+)'/m)?.[1];
  const attrs = tag ? elements.get(tag) : undefined;
  if (!attrs) continue;

  // 1. argTypes: a real attribute must not carry its own options or control.
  for (const m of src.matchAll(/argTypes:\s*/g)) {
    // Either a literal object, or the overrides (second argument) of argTypesFor(tag, { ... }).
    const rest = src.slice(m.index + m[0].length);
    let text = null;
    if (rest.startsWith('argTypesFor(')) {
      const comma = rest.indexOf(',');
      if (comma < 0 || rest.indexOf(')') < comma) continue; // no overrides
      text = braceBlock(rest, comma);
    } else if (rest.startsWith('{')) {
      text = braceBlock(rest, 0);
    }
    if (!text) continue;
    let obj;
    try {
      obj = vm.runInNewContext(`(${text})`);
    } catch {
      warnings.push(`${file}: could not evaluate the argTypes overrides; check them by hand`);
      continue;
    }
    for (const [key, entry] of Object.entries(obj)) {
      const attr = [...attrs.values()].find((a) => a.field === key || a.name === key);
      if (!attr || !entry || typeof entry !== 'object') continue;
      const control = entry.control;
      const hand = entry.options !== undefined || (control !== undefined && control !== false);
      if (hand) {
        fail(file, `argTypes.${key} overrides the manifest for ${tag} attribute "${attr.name}" (options or control); delete it, the manifest generates it`);
      }
    }
  }

  // 2. args: string-union attributes take only the union's values.
  for (const m of src.matchAll(/\bargs:\s*\{/g)) {
    const text = braceBlock(src, m.index);
    let obj;
    try {
      obj = vm.runInNewContext(`(${text})`);
    } catch {
      warnings.push(`${file}: could not evaluate an args block; check it by hand`);
      continue;
    }
    for (const [key, value] of Object.entries(obj)) {
      const attr = [...attrs.values()].find((a) => a.field === key || a.name === key);
      if (!attr || typeof value !== 'string') continue;
      const values = stringUnion(attr.type);
      if (values && !values.includes(value)) {
        fail(file, `args.${key} = '${value}' is not a value of ${tag} "${attr.name}" (${values.map((v) => `'${v}'`).join(' | ')})`);
      }
    }
  }
}

for (const w of warnings) console.warn(`WARNING: ${w}`);
if (failures.length) {
  console.error(`ERROR: ${failures.length} story control problem(s):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log('Story controls lint passed: every argTypes override and args value agrees with the manifest');
