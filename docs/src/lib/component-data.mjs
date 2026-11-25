// The single data model behind the per-component pages, the index, the sidebar,
// llms.txt and the completeness lint.
//
// Everything here is read, never typed:
//   - the Custom Elements Manifest (packages/ui/dist/custom-elements.json):
//     descriptions, attributes, events, slots, allowed parents, required
//     children, attribute hints, form mixins;
//   - the `voidable` Go tool's snippets (`voidable gen snippet --all`): the
//     example per component in HTML, JSX, ERB, HEEx and Blade. The docs call the
//     built binary rather than re-implementing its generator, so a page and
//     `voidable gen snippet` cannot disagree;
//   - evals/contract/contract.mjs (role, accessible name, state handles);
//   - docs/src/data/keyboard.json and docs/src/data/component-notes.json, the
//     only hand-written inputs: keyboard tables and what a human supplies
//     (group, what children it takes, related components).
//
// Plain ESM with no Astro imports so astro.config.mjs, the lint and the page
// components share it.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { CONTRACT } from '../../../evals/contract/contract.mjs';

// Found from the working directory, not from this file: the build bundles this
// module into dist/, where a path relative to it points nowhere.
function findRoot() {
  let dir = process.cwd();
  while (!existsSync(join(dir, 'pnpm-workspace.yaml'))) {
    const parent = dirname(dir);
    if (parent === dir) throw new Error('component docs: could not find the repository root (pnpm-workspace.yaml)');
    dir = parent;
  }
  return dir;
}
export const ROOT = findRoot();
const MANIFEST = join(ROOT, 'packages/ui/dist/custom-elements.json');
const BINARY = join(ROOT, 'tools/voidable/build/voidable');

export const GROUPS = [
  { id: 'forms', label: 'Forms', blurb: 'Controls that collect or submit a value, and the field around them.' },
  { id: 'overlays', label: 'Overlays', blurb: 'Dialogs, menus and anchored surfaces that open above the page.' },
  { id: 'navigation', label: 'Navigation', blurb: 'Moving between pages, sections and steps.' },
  { id: 'data-display', label: 'Data display', blurb: 'Showing records, people, states and metrics.' },
  { id: 'feedback', label: 'Feedback', blurb: 'Telling the user what is happening or what went wrong.' },
  { id: 'layout', label: 'Layout', blurb: 'Containers, separators and disclosure.' },
  { id: 'charts', label: 'Charts', blurb: 'Data visualisation drawn in SVG.' },
];

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

/** Strip the quotes the analyzer leaves on a string default. */
function cleanDefault(d) {
  if (d == null) return undefined;
  const s = String(d).trim();
  const m = s.match(/^(['"`])(.*)\1$/s);
  return m ? m[2] : s;
}

/** Split a union type text such as `'sm' | 'md'` into its values, or null. */
function enumValues(text) {
  if (!text || !text.includes('|')) return null;
  const parts = text.split('|').map((s) => s.trim());
  const values = [];
  for (const p of parts) {
    const m = p.match(/^'([^']*)'$/);
    if (m) values.push(m[1]);
    else if (p === 'null' || p === 'undefined') continue;
    else return null;
  }
  return values.length ? values : null;
}

/** First paragraph of a JSDoc description, on one line. */
function firstParagraph(text) {
  if (!text) return '';
  return text.split(/\n\s*\n/)[0].replace(/\s*\n\s*/g, ' ').trim();
}

/** First sentence of a description, for the one-line summaries. */
function firstSentence(text) {
  const p = firstParagraph(text);
  const m = p.match(/^(.+?[.!?])(\s|$)/);
  return (m ? m[1] : p).replace(/[;:]$/, '.').trim();
}

/** `void-action-input` -> `Action input`. */
function titleFor(tag) {
  const words = tag.replace(/^void-/, '').split('-');
  const s = words.join(' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function eventDetailText(typeText) {
  const m = (typeText ?? '').match(/^CustomEvent<(.*)>$/s);
  return m ? m[1].trim() : '';
}

/**
 * Parse the fields of a detail type text like `{ value: string; date: Date }`
 * into rows. Falls back to no rows when the shape is not an object literal.
 */
function detailFields(detail) {
  const m = detail.match(/^\{\s*(.*?)\s*\}$/s);
  if (!m) return [];
  const rows = [];
  let depth = 0;
  let cur = '';
  for (const ch of m[1]) {
    if ('<({['.includes(ch)) depth++;
    if ('>)}]'.includes(ch)) depth--;
    if ((ch === ';' || ch === ',') && depth === 0) {
      rows.push(cur);
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) rows.push(cur);
  return rows
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => {
      const i = r.indexOf(':');
      return i < 0 ? { name: r, type: '' } : { name: r.slice(0, i).trim().replace(/\?$/, ''), type: r.slice(i + 1).trim() };
    });
}

let cache;

export function loadComponentData() {
  if (cache) return cache;
  if (!existsSync(MANIFEST)) {
    throw new Error(`component docs: ${MANIFEST} is missing. Build the library first: mise run build`);
  }
  if (!existsSync(BINARY)) {
    throw new Error(`component docs: ${BINARY} is missing. Build the voidable tool first: mise run voidable:binary`);
  }
  const manifest = readJson(MANIFEST);
  const snippets = JSON.parse(execFileSync(BINARY, ['gen', 'snippet', '--all'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
  const keyboard = readJson(join(ROOT, 'docs/src/data/keyboard.json'));
  const notes = readJson(join(ROOT, 'docs/src/data/component-notes.json'));
  cache = { manifest, snippets, keyboard, notes, components: [], byTag: new Map() };
  cache.version = manifest.version ?? '';

  const decls = [];
  for (const mod of manifest.modules) for (const d of mod.declarations ?? []) if (d.tagName) decls.push({ d, path: mod.path });
  decls.sort((a, b) => a.d.tagName.localeCompare(b.d.tagName));

  // Which tags may sit inside which: the inverse of voidParents.
  const childrenOf = {};
  for (const { d } of decls) for (const p of d.voidParents ?? []) (childrenOf[p] ??= []).push(d.tagName);


  // Storybook: each story file is named after its component and declares a title;
  // Storybook's story id is the title lower-cased with separators turned into dashes.
  const storyDir = join(ROOT, 'packages/storybook/stories');
  const stories = new Map();
  for (const f of readdirSync(storyDir)) {
    const m = f.match(/^(.+)\.stories\.ts$/);
    if (!m) continue;
    const title = readFileSync(join(storyDir, f), 'utf8').match(/title:\s*'([^']+)'/)?.[1];
    if (title) stories.set(m[1].replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase(), title.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  }

  for (const { d, path } of decls) {
    const tag = d.tagName;
    const note = { ...(notes[tag] ?? {}) };
    // Live-example overrides are HTML files, so voidable check validates them.
    const livePath = join(ROOT, 'docs/src/data/live', `${tag}.html`);
    if (existsSync(livePath)) note.live = readFileSync(livePath, 'utf8').trim();
    const fieldByAttr = new Map((d.members ?? []).filter((m) => m.attribute).map((m) => [m.attribute, m]));
    const attributes = (d.attributes ?? []).map((a) => {
      const field = fieldByAttr.get(a.name) ?? (d.members ?? []).find((m) => m.name === a.fieldName);
      const type = a.type?.text ?? field?.type?.text ?? 'string';
      const values = enumValues(type);
      const isBool = type === 'boolean';
      return {
        name: a.name,
        field: a.fieldName ?? field?.name,
        type,
        values,
        isBool,
        default: cleanDefault(a.default ?? field?.default),
        description: (a.description ?? field?.description ?? '').trim(),
        reflects: !!field?.reflects,
        falseString: a.falseString === true,
      };
    });
    const attrNames = new Set(attributes.map((a) => a.name));
    const properties = (d.members ?? [])
      .filter(
        (m) =>
          m.kind === 'field' &&
          !m.static &&
          !m.inheritedFrom &&
          !m.attribute &&
          m.privacy !== 'private' &&
          m.privacy !== 'protected' &&
          !m.name.startsWith('_') &&
          !attrNames.has(m.name),
      )
      .map((m) => ({ name: m.name, type: m.type?.text ?? '', default: cleanDefault(m.default), description: (m.description ?? '').trim(), readonly: !!m.readonly }));
    const methods = (d.members ?? [])
      .filter((m) => m.kind === 'method' && !m.inheritedFrom && m.privacy !== 'private' && m.privacy !== 'protected' && !m.name.startsWith('_') && !isLifecycle(m.name))
      .map((m) => ({
        name: m.name,
        static: !!m.static,
        signature: `${m.name}(${(m.parameters ?? []).map((p) => `${p.name}${p.optional ? '?' : ''}: ${p.type?.text ?? 'unknown'}`).join(', ')})`,
        returns: m.return?.type?.text ?? 'void',
        description: (m.description ?? '').trim(),
      }));
    const events = (d.events ?? []).map((e) => {
      const detail = eventDetailText(e.type?.text);
      return { name: e.name, detail, fields: detailFields(detail), description: (e.description ?? '').trim() };
    });
    const mixins = (d.mixins ?? []).map((m) => m.name);
    const form = mixins.includes('NativeFormControl') ? 'native' : mixins.includes('InternalsFormControl') ? 'internals' : null;

    const comp = {
      tag,
      className: d.name,
      module: path,
      title: titleFor(tag),
      slug: tag.replace(/^void-/, ''),
      group: note.group ?? null,
      description: firstParagraph(d.description),
      details: (d.description ?? '').split(/\n\s*\n/).slice(1).map((p) => p.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean),
      summary: firstSentence(d.description),
      attributes,
      properties,
      methods,
      events,
      slots: (d.slots ?? []).map((s) => ({ name: s.name, description: s.description ?? '' })),
      cssProperties: d.cssProperties ?? [],
      parents: d.voidParents ?? [],
      requires: d.voidRequires ?? [],
      children: childrenOf[tag] ?? [],
      hints: d.voidHints ?? {},
      hostAttributes: d.voidHostAttributes ?? [],
      mixins,
      form,
      note,
      story: stories.get(tag.replace(/^void-/, '')) ?? null,
      snippets: snippets[tag] ?? null,
      keyboard: keyboard[tag] ?? null,
    };
    cache.components.push(comp);
    cache.byTag.set(tag, comp);
  }
  return cache;
}

function isLifecycle(name) {
  return /^(connectedCallback|disconnectedCallback|render|updated|firstUpdated|willUpdate|createRenderRoot|attributeChangedCallback|adoptedCallback|form\w*Callback|performUpdate|requestUpdate|shouldUpdate)$/.test(name) || /^(void(Before|After)Morph|setHostAttribute|removeAttribute|setAttribute|toggleAttribute)/.test(name);
}

/** The accessibility contract rows (role, name, state, gaps) per tag. */
export const loadContract = () => CONTRACT;

/** Components grouped for the sidebar and the index, in GROUPS order. */
export function componentGroups() {
  const { components } = loadComponentData();
  return GROUPS.map((g) => ({ ...g, components: components.filter((c) => c.group === g.id) })).filter((g) => g.components.length);
}

/**
 * Common mistakes for one component, generated from what the manifest and the
 * checker know: guessed attributes (hints), closed value sets, booleans, parent
 * and child rules, kebab-case names, and the value-attribute trap on controls.
 * Each is { wrong, right } prose; `wrong` is shown as code.
 */
export function commonMistakes(c) {
  const out = [];
  for (const [attr, advice] of Object.entries(c.hints)) {
    out.push({ wrong: `<${c.tag} ${attr}="...">`, why: `There is no \`${attr}\` attribute on \`${c.tag}\`: ${advice.replace(/(<[a-z][^>]*>)/g, '`$1`')}.` });
  }
  for (const a of c.attributes) {
    if (a.values && a.values.length) {
      const bad = a.name === 'size' ? 'huge' : 'other';
      out.push({ wrong: `<${c.tag} ${a.name}="${bad}">`, why: `\`${a.name}\` takes only ${a.values.map((v) => `\`${v}\``).join(', ')}. Any other value is flagged by \`voidable check\` and by the development warnings.` });
    }
  }
  const bools = c.attributes.filter((a) => a.isBool);
  const falseOff = bools.filter((a) => a.falseString);
  const plain = bools.filter((a) => !a.falseString);
  if (plain.length) {
    const n = plain[0].name;
    out.push({ wrong: `<${c.tag} ${n}="false">`, why: `A boolean attribute is on whenever it is present. \`${n}="false"\` still turns it on: leave the attribute off to turn it off, or set the property (\`el.${plain[0].field ?? n} = false\`).` });
  }
  if (falseOff.length) {
    out.push({ wrong: `<${c.tag} ${falseOff[0].name}>`, why: `${falseOff.map((a) => `\`${a.name}\``).join(', ')} default${falseOff.length === 1 ? 's' : ''} to true here, so writing the bare attribute changes nothing; write \`${falseOff[0].name}="false"\` to turn it off.` });
  }
  for (const p of c.parents) {
    out.push({ wrong: `<${c.tag}> outside <${p}>`, why: `\`${c.tag}\` only works inside \`${p}\` (anywhere above it, not only as a direct child). Alone it does nothing.` });
  }
  for (const r of c.requires) {
    out.push({ wrong: `<${c.tag}></${c.tag}>`, why: `\`${c.tag}\` needs at least one \`${r}\` child; without one it renders nothing useful.` });
  }
  const kebab = c.attributes.filter((a) => a.name.includes('-'));
  if (kebab.length) {
    const a = kebab[0];
    const camel = a.name.replace(/-(\w)/g, (_, ch) => ch.toUpperCase());
    out.push({ wrong: `<${c.tag} ${camel}="...">`, why: `Attribute names are kebab-case in markup: write \`${a.name}\`. The camelCase name (\`${camel}\`) is the JavaScript property only.` });
  }
  if (c.form) {
    out.push({ wrong: `el.getAttribute('value')`, why: `The \`value\` attribute is the initial value only; it does not follow what the user types. Read \`el.value\`, or the submitted \`FormData\`, for the current value.` });
  }
  return out;
}
