#!/usr/bin/env node
// SPDX-License-Identifier: MIT
//
// Write the machine-readable reference an AI coding agent finds inside the
// installed package (#54), from the same data the `voidable` tool reads:
//
//   dist/llms.txt      what the library is, install, the composition rules, the
//                      conventions, one line per element, a pointer to
//   dist/reference.md  every element: parts, attributes with values, events
//                      with detail, slots, parents and a correct markup example
//
// Sources, all read here and none retyped: dist/custom-elements.json (written
// by the analyzer and cem/supplement.js), and the `voidable` tool's supplement
// (tools/voidable/.../supplement: canonical examples, and the CSS-only pattern
// elements, which are not in the manifest). The Go tool cannot be called from
// this build because it embeds this build's manifest; scripts/packaging/
// check-reference.mjs runs both and fails when they disagree.
//
// Exports `buildReference` so the packaging check and the tests can call it.

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const uiRoot = resolve(here, '..');
const SUPPLEMENT = resolve(uiRoot, '../../tools/voidable/internal/infra/embedded/data/supplement');

const split = (s, sep) => {
  const out = [];
  let depth = 0;
  let quote = '';
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      if (c === quote) quote = '';
      continue;
    }
    if ('\'"`'.includes(c)) quote = c;
    else if ('<{(['.includes(c)) depth++;
    else if ('>})]'.includes(c)) depth--;
    else if (c === sep && depth === 0) {
      out.push(s.slice(start, i));
      start = i + 1;
    }
  }
  out.push(s.slice(start));
  return out;
};

/** `'a' | 'b' | null` -> `a|b|null`; any other type text is kept. */
function typeText(text) {
  if (!text) return '';
  const parts = split(text.trim(), '|').map((p) => p.trim());
  const lits = parts.filter((p) => /^(['"]).*\1$/.test(p)).map((p) => p.slice(1, -1));
  const rest = parts.filter((p) => !/^(['"]).*\1$/.test(p) && p !== 'null' && p !== 'undefined');
  if (lits.length && !rest.length) return [...lits, ...(parts.some((p) => p === 'null' || p === 'undefined') ? ['null'] : [])].join('|');
  return text.trim();
}

const cleanDefault = (d) => {
  if (d == null) return '';
  const s = String(d).trim();
  const m = s.match(/^(['"`])(.*)\1$/s);
  const v = m ? m[2] : s;
  return ['', "''", 'null', 'undefined'].includes(v) ? '' : v;
};

const eventDetail = (type) => {
  const m = /^CustomEvent(?:<(.*)>)?$/s.exec((type ?? '').trim());
  if (!m) return type ?? '';
  const d = (m[1] ?? '').trim();
  if (!d) return '(no detail)';
  return d === 'Record<string, never>' ? '(no detail)' : d;
};

const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const code = (s) => (s ? `\`${esc(s)}\`` : '');

/** What replaces a built-in string on an element (voidMessages[].override), as a phrase. */
function overrideText(o) {
  if (!o) return '`registerMessages()` only';
  if (o.part) return `a \`<${o.part}>\` part you write`;
  return o.on ? `\`${o.attribute}\` on \`<${o.on}>\`` : `\`${o.attribute}\``;
}

function partRule(ps) {
  let rule = ps.children === 'parts' ? 'only these parts as children' : 'parts mixed with other content';
  if (ps.ordered) rule += ', in this order';
  if (ps.transparent?.length) rule += ` (a ${ps.transparent.join(', ')} may wrap them)`;
  return rule;
}

function partFlags(p) {
  const f = [];
  if (p.required) f.push('required');
  f.push(p.max === 1 ? 'one' : p.max > 1 ? `at most ${p.max}` : 'any number');
  if (p.control) f.push('wraps one control');
  if (p.cssOnly) f.push('CSS-only');
  return f.join(', ');
}

/** Read the manifest and the supplement into one flat, sorted list of elements. */
export function collectElements(manifest, supplement) {
  const elements = [];
  const partOf = new Map();
  const walk = (owner, list) => {
    for (const p of list) {
      partOf.set(p.tag, owner);
      if (p.parts) walk(p.tag, p.parts.parts ?? p.parts);
    }
  };
  for (const mod of manifest.modules) {
    for (const d of mod.declarations ?? []) {
      if (d.tagName && d.voidParts) walk(d.tagName, d.voidParts.parts);
    }
  }
  const seen = new Set();
  for (const mod of manifest.modules) {
    for (const d of mod.declarations ?? []) {
      if (d.kind !== 'class' || !d.tagName || seen.has(d.tagName)) continue;
      seen.add(d.tagName);
      const attrNames = new Set((d.attributes ?? []).map((a) => a.name));
      const props = (d.members ?? []).filter((m) => {
        if (m.kind !== 'field' || m.static || m.readonly || m.attribute || attrNames.has(m.attribute)) return false;
        if (m.privacy === 'private' || m.privacy === 'protected') return false;
        if (!/^[A-Za-z$][\w$]*$/.test(m.name) || m.name.startsWith('_')) return false;
        return !m.inheritedFrom || (m.inheritedFrom.module ?? '').startsWith('dist/components/');
      });
      elements.push({
        tag: d.tagName,
        description: (d.description ?? '').trim(),
        cssOnly: false,
        partOf: partOf.get(d.tagName),
        attributes: (d.attributes ?? []).map((a) => ({
          name: a.name,
          type: typeText(a.type?.text),
          default: cleanDefault(a.default),
          description: (a.description ?? '').trim(),
        })),
        props: props.map((m) => ({ name: m.name, type: m.type?.text ?? '', description: (m.description ?? '').trim() })),
        events: (d.events ?? []).filter((e) => e.name).map((e) => ({ name: e.name, detail: eventDetail(e.type?.text), description: (e.description ?? '').trim() })),
        slots: (d.slots ?? []).map((s) => ({ name: s.name ?? '', description: (s.description ?? '').trim() })),
        parents: d.voidParents ?? [],
        requires: d.voidRequires ?? [],
        hints: d.voidHints ?? {},
        parts: d.voidParts,
        messages: d.voidMessages ?? [],
      });
    }
  }
  // CSS-only parts of components (declared in voidParts) and the styled patterns.
  const addCss = (tag, description, attributes, parents, owner, parts) => {
    if (seen.has(tag)) return;
    seen.add(tag);
    elements.push({
      tag,
      description,
      cssOnly: true,
      partOf: owner,
      attributes: (attributes ?? []).map((a) => ({ name: a.name, type: typeText(a.type?.text ?? a.type), default: cleanDefault(a.default), description: (a.description ?? '').trim() })),
      props: [],
      events: [],
      slots: [],
      parents,
      requires: [],
      hints: {},
      parts,
    });
  };
  const visit = (owner, list) => {
    for (const p of list) {
      if (p.cssOnly) {
        const own = p.parts ? { children: p.children ?? 'any', ordered: p.ordered, transparent: p.transparent, parts: p.parts } : undefined;
        addCss(p.tag, p.description, p.attributes, [owner], owner, own);
      }
      if (p.parts) visit(p.tag, p.parts.parts ?? p.parts);
    }
  };
  for (const mod of manifest.modules) {
    for (const d of mod.declarations ?? []) {
      if (d.tagName && d.voidParts) visit(d.tagName, d.voidParts.parts);
    }
  }
  for (const s of supplement.styled ?? []) addCss(s.tag, s.description, s.attributes, s.parents ?? [], undefined);
  return elements.sort((a, b) => a.tag.localeCompare(b.tag));
}

/** A minimal correct example when the supplement has none: the skeleton, else the tag. */
function exampleFor(el, byTag, snippets) {
  let root = el;
  if (!snippets[el.tag]) {
    while (root.partOf && byTag.get(root.partOf)) root = byTag.get(root.partOf);
  }
  if (snippets[root.tag]) return snippets[root.tag].trim();
  if (root.parts?.skeleton) return root.parts.skeleton;
  const enumAttr = root.attributes.find((a) => a.type.includes('|') && !a.type.includes(' ') && a.type.split('|').some((v) => v !== a.default && v !== 'null'));
  if (enumAttr) {
    const v = enumAttr.type.split('|').find((x) => x !== enumAttr.default && x !== 'null');
    return `<${root.tag} ${enumAttr.name}="${v}"></${root.tag}>`;
  }
  return `<${root.tag}></${root.tag}>`;
}

function renderPartsTable(ps) {
  const lines = [`Parts (${partRule(ps)}):`, '', '| Part | | Description |', '|---|---|---|'];
  const rows = (list, depth) => {
    for (const p of list) {
      lines.push(`| ${'&emsp;'.repeat(depth)}\`<${p.tag}>\` | ${partFlags(p)} | ${esc(p.description)} |`);
      if (p.parts) rows(p.parts.parts ?? p.parts, depth + 1);
    }
  };
  rows(ps.parts, 0);
  lines.push('');
  return lines.join('\n');
}

function renderElement(el, byTag, snippets) {
  const out = [`## \`<${el.tag}>\``, '', el.description || '(no description)', ''];
  if (el.cssOnly) {
    out.push(
      el.partOf
        ? `CSS-only part of \`<${el.partOf}>\`: \`@voidable/theme\` styles it and nothing registers it. Write it as plain markup in every framework.`
        : 'CSS only: `@voidable/theme` styles this tag and nothing registers it, so it has no JavaScript, properties or events. Write it as plain markup in every framework.',
      '',
    );
  }
  if (el.parts) {
    out.push(renderPartsTable(el.parts));
    if (el.parts.skeleton) out.push(`Markup: \`${el.parts.skeleton}\``, '');
  }
  if (el.attributes.length) {
    out.push('| Attribute | Values | Default | Description |', '|---|---|---|---|');
    for (const a of el.attributes) out.push(`| \`${a.name}\` | ${code(a.type)} | ${code(a.default)} | ${esc(a.description)} |`);
    out.push('');
  }
  if (el.props.length) {
    out.push('Properties with no attribute (set in JavaScript):', '', '| Property | Type | Description |', '|---|---|---|');
    for (const p of el.props) out.push(`| \`${p.name}\` | ${code(p.type)} | ${esc(p.description)} |`);
    out.push('');
  }
  if (el.slots.length) {
    out.push('| Slot | Description |', '|---|---|');
    for (const s of el.slots) out.push(`| ${s.name ? `\`${s.name}\`` : '(default)'} | ${esc(s.description)} |`);
    out.push('');
  }
  if (el.events.length) {
    out.push('| Event | `detail` | Description |', '|---|---|---|');
    for (const e of el.events) out.push(`| \`${e.name}\` | ${code(e.detail)} | ${esc(e.description)} |`);
    out.push('');
  }
  if (el.messages?.length) {
    out.push('Words it writes itself (English; the language follows the closest `lang`, see the Translation guide at https://voidable.dev/guides/translation/):', '', '| Message | Default | Replaced by |', '|---|---|---|');
    for (const m of el.messages) out.push(`| \`${m.key}\` | ${esc(m.default)} | ${overrideText(m.override)} |`);
    out.push('');
  }
  if (el.parents.length) out.push(`Allowed inside: ${el.parents.map((p) => `\`<${p}>\``).join(', ')}.`, '');
  if (el.requires.length) out.push(`Needs at least one: ${el.requires.map((p) => `\`<${p}>\``).join(', ')}.`, '');
  const hints = Object.entries(el.hints);
  if (hints.length) {
    out.push('Attributes that do not exist (and what to write instead):', '');
    for (const [name, advice] of hints) out.push(`- \`${name}\`: ${advice}`);
    out.push('');
  }
  out.push('Example:', '', '```html', exampleFor(el, byTag, snippets), '```', '');
  return out.join('\n');
}

const firstSentence = (s) => {
  const t = (s ?? '').replace(/\s+/g, ' ').trim();
  const m = /^(.*?[.!?])(\s|$)/.exec(t);
  return m ? m[1] : t;
};

/**
 * @param {{ manifest: object, supplement: object, snippets: Record<string,string>, version: string }} input
 * @returns {{ llms: string, reference: string, tags: string[] }}
 */
export function buildReference({ manifest, supplement, snippets, version }) {
  const elements = collectElements(manifest, supplement);
  if (elements.length === 0) throw new Error('reference: the manifest holds no elements');
  const byTag = new Map(elements.map((e) => [e.tag, e]));
  const registered = elements.filter((e) => !e.cssOnly).length;

  const reference = [
    `# @voidable/ui ${version}: element reference`,
    '',
    `Generated from the package's Custom Elements Manifest. ${elements.length} elements (${registered} registered by JavaScript, ${elements.length - registered} CSS-only parts and patterns). Each section gives the parts, attributes with their allowed values, events with their \`detail\`, where the element may sit and a correct example. Start at \`llms.txt\` for the rules that apply to all of them.`,
    '',
    ...elements.map((e) => renderElement(e, byTag, snippets)),
  ].join('\n');

  const llms = [
    `# Voidable UI (@voidable/ui ${version})`,
    '',
    '> Lit 3 web components in the light DOM, `<void-*>` tags with no visual CSS of their own: `@voidable/theme` supplies every look through `--void-*` custom properties. They work in plain HTML, React, Vue, Svelte, Solid, Angular, Rails/Hotwire, Phoenix LiveView and Laravel/Livewire.',
    '',
    '## Install',
    '',
    '```sh',
    'npm install @voidable/ui @voidable/theme',
    '```',
    '',
    '```js',
    "import '@voidable/theme';  // the look (CSS)",
    "import '@voidable/ui';     // registers every element; or '@voidable/ui/components/button', or '@voidable/ui/autoloader'",
    '```',
    '',
    'Without the theme loaded the components are unstyled. Development warnings for misused markup: `import \'@voidable/ui/dev\'` (development only).',
    '',
    '## Composition rules',
    '',
    '- A component with regions takes explicit parts: plain `void-*` child tags named after the component (`<void-dialog-title>`, `<void-tabs-list>`). Write exactly the parts the element lists in `reference.md`, in the listed order where it says so. There is one way to write each component; the old implicit forms (`heading="..."`, `slot="trigger"`) are gone.',
    '- A trigger part wraps exactly one control (`<void-popover-trigger><void-button>Open</void-button></void-popover-trigger>`).',
    '- State lives on the parent as reflected attributes (`open`, `value`, `active`). Do not write wrapper `<div>`s or utility classes around parts.',
    '- Only `<void-dialog>` and `<void-drawer>` have a shadow root; everything else is light DOM, so your CSS, ids and framework bindings reach every node.',
    '- Some elements are CSS-only (patterns such as `<void-shell>`, and many parts): the theme styles them, no JavaScript registers them; write them as plain markup.',
    '',
    '## Conventions',
    '',
    '- Booleans are present or absent: `<void-button disabled>`. Never write `disabled="false"`; for a default-true boolean the reference says how to turn it off.',
    '- Events are `void-*` CustomEvents; read the value from `event.detail`. `void-change` always carries `detail.value`; text controls also fire `void-input` per edit. Overlays fire `void-open` and `void-close` with `detail.reason`; they do not bubble.',
    '- Only attributes listed in `reference.md` exist. A guessed attribute does nothing; the dev warnings and `voidable check` report it.',
    '- Sizes, variants and colours are enumerated attributes (`size="sm|md|lg"`, `variant`, `color`); a value outside the listed set is an error.',
    '',
    '## Where the full reference is',
    '',
    '- `@voidable/ui/reference.md` (`node_modules/@voidable/ui/dist/reference.md`): every element in full, generated from the manifest.',
    '- `@voidable/ui/custom-elements.json`: the Custom Elements Manifest it is generated from.',
    '- `@voidable/ui/llms.txt`: this file. The docs site serves the same in `/llms.txt` and `/llms-full.txt`: https://voidable.dev',
    '- `voidable ref <tag>` prints one element offline; `voidable check <file>` checks markup (https://voidable.dev/getting-started/for-agents/).',
    '',
    `## Elements (${registered})`,
    '',
    ...elements.filter((e) => !e.cssOnly).map((e) => `- \`<${e.tag}>\`: ${firstSentence(e.description) || '(no description)'}`),
    '',
    `## CSS-only parts and patterns (${elements.length - registered})`,
    '',
    'Styled by `@voidable/theme`, registered by no JavaScript; write them as plain markup. Each is described in `reference.md`.',
    '',
    elements.filter((e) => e.cssOnly).map((e) => `\`<${e.tag}>\``).join(', '),
    '',
  ].join('\n');

  return { llms, reference: `${reference}\n`, tags: elements.map((e) => e.tag) };
}

/** Load the committed supplement the Go tool also embeds. */
export function loadSupplement(dir = SUPPLEMENT) {
  const supplement = JSON.parse(readFileSync(join(dir, 'rules.json'), 'utf8'));
  const snippets = {};
  const sdir = join(dir, 'snippets');
  if (existsSync(sdir)) {
    for (const f of readdirSync(sdir)) if (f.endsWith('.html')) snippets[f.slice(0, -5)] = readFileSync(join(sdir, f), 'utf8');
  }
  return { supplement, snippets };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dist = resolve(uiRoot, 'dist');
  const manifest = JSON.parse(readFileSync(join(dist, 'custom-elements.json'), 'utf8'));
  const pkg = JSON.parse(readFileSync(join(uiRoot, 'package.json'), 'utf8'));
  const { llms, reference, tags } = buildReference({ manifest, ...loadSupplement(), version: pkg.version });
  mkdirSync(dist, { recursive: true });
  writeFileSync(join(dist, 'llms.txt'), llms);
  writeFileSync(join(dist, 'reference.md'), reference);
  console.log(`reference: ${tags.length} elements, llms.txt ${llms.length} bytes, reference.md ${reference.length} bytes`);
}
