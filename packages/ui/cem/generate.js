#!/usr/bin/env node
// Derive editor metadata, framework typings and a component summary from
// dist/custom-elements.json. Runs as the last step of `pnpm build` in
// packages/ui, after `vite build` (which empties dist/) and `cem analyze`.
//
// Outputs (all under dist/, all build artefacts, none committed):
//
//   custom-elements.json          written by the analyzer, not by this script
//   vscode.html-custom-data.json  VS Code HTML custom data (html.customData)
//   web-types.json                JetBrains web-types (package.json "web-types")
//   components.json               summary: component/tag counts and tag list
//   types/elements.d.ts           shared per-tag property and event maps
//   types/react.d.ts              React 19 JSX.IntrinsicElements augmentation
//   types/solid.d.ts              Solid JSX.IntrinsicElements augmentation
//   types/vue.d.ts                Vue GlobalComponents augmentation
//   types/svelte.d.ts             Svelte 5 SvelteHTMLElements augmentation
//
// Consuming the summary (e.g. from the docs site, which already depends on
// @voidable/ui via the workspace):
//
//   import summary from '@voidable/ui/components.json' with { type: 'json' };
//   summary.componentCount   // number of component modules
//   summary.tagCount         // number of registered custom element tags
//   summary.tags             // sorted tag names
//   summary.components       // [{ module, tags: [...] }]
//
// The import only resolves after `mise run build` (dist/ is not committed).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(resolve(dist, 'custom-elements.json'), 'utf8'));

const HEADER = 'Generated from custom-elements.json by packages/ui/cem/generate.js. Do not edit.';

// ---------------------------------------------------------------------------
// Collect elements
// ---------------------------------------------------------------------------

/**
 * @typedef {{ name: string, type?: string, default?: string, description?: string,
 *   reflects: boolean, fieldName?: string }} Attr
 * @typedef {{ name: string, type?: string, default?: string, description?: string,
 *   attribute?: string }} Prop
 * @typedef {{ name: string, type: string, description?: string }} Evt
 * @typedef {{ tagName: string, className: string, module: string, description?: string,
 *   attributes: Attr[], properties: Prop[], events: Evt[] }} El
 */

/** @type {El[]} */
const elements = [];
for (const mod of manifest.modules) {
  for (const decl of mod.declarations ?? []) {
    if (decl.kind !== 'class' || !decl.tagName) continue;
    const members = decl.members ?? [];
    const fields = new Map(members.filter((m) => m.kind === 'field').map((m) => [m.name, m]));
    elements.push({
      tagName: decl.tagName,
      className: decl.name,
      module: mod.path,
      description: decl.description || undefined,
      attributes: (decl.attributes ?? []).map((a) => {
        const field = a.fieldName ? fields.get(a.fieldName) : undefined;
        return {
          name: a.name,
          type: a.type?.text,
          default: a.default,
          description: a.description || field?.description || undefined,
          reflects: Boolean(field?.reflects),
          fieldName: a.fieldName,
        };
      }),
      // Public, writable instance properties: what frameworks may set.
      properties: members
        .filter(
          (m) =>
            m.kind === 'field' &&
            !m.static &&
            !m.readonly &&
            m.privacy !== 'private' &&
            m.privacy !== 'protected' &&
            !m.name.startsWith('_'),
        )
        .map((m) => ({
          name: m.name,
          type: m.type?.text,
          default: m.default,
          description: m.description || undefined,
          attribute: m.attribute,
        })),
      events: (decl.events ?? [])
        .filter((e) => e.name)
        .map((e) => ({ name: e.name, type: e.type?.text ?? 'CustomEvent', description: e.description })),
    });
  }
}
elements.sort((a, b) => a.tagName.localeCompare(b.tagName));

if (elements.length === 0) {
  throw new Error('custom-elements.json contains no custom elements; refusing to generate empty artefacts');
}

const write = (rel, content) => {
  const file = resolve(dist, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
};
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

/** `'a' | 'b'` -> ['a', 'b']; anything that is not a pure string-literal union -> null. */
function literalUnion(type) {
  if (!type) return null;
  const parts = type.split('|').map((s) => s.trim());
  if (!parts.every((p) => /^'[^']*'$/.test(p) || /^"[^"]*"$/.test(p))) return null;
  return parts.map((p) => p.slice(1, -1));
}
const isBoolean = (type) => type === 'boolean';

// ---------------------------------------------------------------------------
// VS Code HTML custom data
// https://github.com/microsoft/vscode-custom-data
// ---------------------------------------------------------------------------

function attrDescription(a) {
  const lines = [];
  if (a.description) lines.push(a.description);
  if (a.type) lines.push(`Type: \`${a.type}\``);
  if (a.default !== undefined) lines.push(`Default: \`${a.default}\``);
  if (a.reflects) lines.push('Reflected to the attribute.');
  return lines.join('\n\n') || undefined;
}

function elementDescription(el) {
  const lines = [];
  if (el.description) lines.push(el.description);
  if (el.events.length) {
    lines.push(`Events: ${el.events.map((e) => `\`${e.name}\``).join(', ')}`);
  }
  return lines.join('\n\n') || undefined;
}

write(
  'vscode.html-custom-data.json',
  json({
    $schema: 'https://raw.githubusercontent.com/microsoft/vscode-html-languageservice/main/docs/customData.schema.json',
    version: 1.1,
    tags: elements.map((el) => ({
      name: el.tagName,
      description: elementDescription(el) && { kind: 'markdown', value: elementDescription(el) },
      attributes: el.attributes.map((a) => {
        const values = literalUnion(a.type);
        const description = attrDescription(a);
        return {
          name: a.name,
          ...(description ? { description: { kind: 'markdown', value: description } } : {}),
          ...(isBoolean(a.type) ? { valueSet: 'v' } : {}),
          ...(values ? { values: values.map((name) => ({ name })) } : {}),
        };
      }),
    })),
  }),
);

// ---------------------------------------------------------------------------
// JetBrains web-types
// https://github.com/JetBrains/web-types
// ---------------------------------------------------------------------------

write(
  'web-types.json',
  json({
    $schema: 'https://raw.githubusercontent.com/JetBrains/web-types/master/schema/web-types.json',
    name: pkg.name,
    version: pkg.version,
    'js-types-syntax': 'typescript',
    'description-markup': 'markdown',
    contributions: {
      html: {
        elements: elements.map((el) => ({
          name: el.tagName,
          ...(el.description ? { description: el.description } : {}),
          source: { module: pkg.name, symbol: el.className },
          attributes: el.attributes.map((a) => ({
            name: a.name,
            ...(a.description ? { description: a.description } : {}),
            ...(a.default !== undefined ? { default: a.default } : {}),
            value: isBoolean(a.type)
              ? { kind: 'no-value', type: 'boolean' }
              : { kind: 'plain', type: a.type ?? 'string' },
          })),
          js: {
            properties: el.properties.map((p) => ({
              name: p.name,
              ...(p.description ? { description: p.description } : {}),
              ...(p.type ? { type: p.type } : {}),
              ...(p.default !== undefined ? { default: p.default } : {}),
            })),
            events: el.events.map((e) => ({
              name: e.name,
              ...(e.description ? { description: e.description } : {}),
              type: e.type,
            })),
          },
        })),
      },
    },
  }),
);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

const byModule = new Map();
for (const el of elements) {
  const name = el.module.replace(/^src\/components\//, '').replace(/\.ts$/, '');
  if (!byModule.has(name)) byModule.set(name, []);
  byModule.get(name).push(el.tagName);
}
const components = [...byModule.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([module, tags]) => ({ module, tags: tags.sort() }));

write(
  'components.json',
  json({
    $comment: HEADER,
    package: pkg.name,
    version: pkg.version,
    componentCount: components.length,
    tagCount: elements.length,
    eventNames: [...new Set(elements.flatMap((el) => el.events.map((e) => e.name)))].sort(),
    tags: elements.map((el) => el.tagName),
    components,
    elements: elements.map((el) => ({
      tag: el.tagName,
      className: el.className,
      module: el.module,
      attributes: el.attributes.length,
      properties: el.properties.length,
      events: el.events.map((e) => e.name),
    })),
  }),
);

// ---------------------------------------------------------------------------
// Framework typings (types only, no runtime)
// ---------------------------------------------------------------------------

/** dist/types/x.d.ts -> ../components/button.js */
const moduleSpecifier = (srcPath) => `../${srcPath.replace(/^src\//, '').replace(/\.ts$/, '.js')}`;

// Exported type names per module (interfaces/type aliases are not recorded in
// the manifest), so event detail types can be imported rather than guessed.
const exportedTypes = new Map();
for (const mod of manifest.modules) {
  const source = readFileSync(resolve(root, mod.path), 'utf8');
  const names = new Set();
  for (const m of source.matchAll(/^export\s+(?:interface|type|class)\s+(\w+)/gm)) names.add(m[1]);
  exportedTypes.set(mod.path, names);
}
const GLOBAL_TYPES = new Set([
  'CustomEvent', 'Record', 'Date', 'File', 'Array', 'Partial', 'Readonly', 'HTMLElement', 'Event',
]);

const imports = new Map(); // specifier -> Set<name>
const addImport = (specifier, name) => {
  if (!imports.has(specifier)) imports.set(specifier, new Set());
  imports.get(specifier).add(name);
};

/** Resolve referenced type names in an event type; fall back to plain CustomEvent. */
function resolveEventType(el, type) {
  const refs = [...type.matchAll(/\b[A-Z]\w*\b/g)].map((m) => m[0]).filter((n) => !GLOBAL_TYPES.has(n));
  for (const ref of refs) {
    const own = exportedTypes.get(el.module);
    if (own?.has(ref)) {
      addImport(moduleSpecifier(el.module), ref);
      continue;
    }
    const owner = manifest.modules.find((m) => exportedTypes.get(m.path)?.has(ref));
    if (owner) {
      addImport(moduleSpecifier(owner.path), ref);
      continue;
    }
    return 'CustomEvent<unknown>';
  }
  return type;
}

const q = (s) => `'${s}'`;
const camel = (s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const pascal = (s) => camel(s).replace(/^./, (c) => c.toUpperCase());

const elementLines = [];
const propLines = [];
const eventLines = [];
for (const el of elements) {
  addImport(moduleSpecifier(el.module), el.className);
  elementLines.push(`  ${q(el.tagName)}: ${el.className};`);
  propLines.push(
    el.properties.length
      ? `  ${q(el.tagName)}: Partial<Pick<${el.className}, ${el.properties.map((p) => q(p.name)).join(' | ')}>>;`
      : `  ${q(el.tagName)}: {};`,
  );
  eventLines.push(
    el.events.length
      ? `  ${q(el.tagName)}: { ${el.events.map((e) => `${q(e.name)}: ${resolveEventType(el, e.type)}`).join('; ')} };`
      : `  ${q(el.tagName)}: {};`,
  );
}

const importLines = [...imports.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([spec, names]) => `import type { ${[...names].sort().join(', ')} } from '${spec}';`);

write(
  'types/elements.d.ts',
  `// ${HEADER}
${importLines.join('\n')}

/** Every custom element registered by @voidable/ui, keyed by tag name. */
export interface VoidElementTagNameMap {
${elementLines.join('\n')}
}

/** Public, writable properties of each element (all optional, as set from markup). */
export interface VoidElementProperties {
${propLines.join('\n')}
}

/** \`void-*\` events dispatched by each element, keyed by event name. */
export interface VoidElementEvents {
${eventLines.join('\n')}
}

export type VoidTagName = keyof VoidElementTagNameMap;
`,
);

const perTag = (fn) => elements.map((el) => `      ${q(el.tagName)}: ${fn(el)};`).join('\n');
const eventHandlers = (el, keyFn) =>
  el.events.length
    ? `{ ${el.events.map((e) => `${q(keyFn(e.name))}?: (event: VoidElementEvents[${q(el.tagName)}][${q(e.name)}]) => void`).join('; ')} }`
    : '{}';
const typesImport = "import type { VoidElementTagNameMap, VoidElementProperties, VoidElementEvents } from './elements.js';";

// React 19 sets known properties on custom elements and maps `on<event>`
// props to addEventListener('<event>'), so `onvoid-change` listens to
// `void-change`. React 18 sets everything as attributes and ignores these
// handlers; use @voidable/ui-react there.
write(
  'types/react.d.ts',
  `// ${HEADER}
// Usage: import type {} from '@voidable/ui/types/react';  (React 19+)
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
${typesImport}

type VoidReactProps<T extends keyof VoidElementTagNameMap, H> =
  Omit<DetailedHTMLProps<HTMLAttributes<VoidElementTagNameMap[T]>, VoidElementTagNameMap[T]>, keyof VoidElementProperties[T]> &
  VoidElementProperties[T] &
  H;

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
${perTag((el) => `VoidReactProps<${q(el.tagName)}, ${eventHandlers(el, (n) => `on${n}`)}>`)}
    }
  }
}
`,
);

// Solid sets props on custom elements as properties; `on:<event>` attaches a
// native listener with the exact (case-sensitive) event name.
write(
  'types/solid.d.ts',
  `// ${HEADER}
// Usage: import type {} from '@voidable/ui/types/solid';
import type { JSX } from 'solid-js';
${typesImport}

type VoidSolidProps<T extends keyof VoidElementTagNameMap, H> =
  Omit<JSX.HTMLAttributes<VoidElementTagNameMap[T]>, keyof VoidElementProperties[T]> &
  VoidElementProperties[T] &
  H;

declare module 'solid-js' {
  namespace JSX {
    interface IntrinsicElements {
${perTag((el) => `VoidSolidProps<${q(el.tagName)}, ${eventHandlers(el, (n) => `on:${n}`)}>`)}
    }
  }
}
`,
);

// Svelte 5 sets props as properties when the element has them; `on<event>`
// attributes attach a listener for '<event>' (case preserved).
write(
  'types/svelte.d.ts',
  `// ${HEADER}
// Usage: import type {} from '@voidable/ui/types/svelte';  (Svelte 5+)
import type { HTMLAttributes } from 'svelte/elements';
${typesImport}

type VoidSvelteProps<T extends keyof VoidElementTagNameMap, H> =
  Omit<HTMLAttributes<VoidElementTagNameMap[T]>, keyof VoidElementProperties[T]> &
  VoidElementProperties[T] &
  H;

declare module 'svelte/elements' {
  interface SvelteHTMLElements {
${perTag((el) => `VoidSvelteProps<${q(el.tagName)}, ${eventHandlers(el, (n) => `on${n}`)}>`)}
  }
}
`.replace(/^ {6}'/gm, "    '"),
);

// Vue: the DefineCustomElement pattern from the Vue docs ("Non-Vue Web
// Components and TypeScript"). Templates use \`@void-change\`, which Vue
// compiles to an \`onVoidChange\` prop and Volar checks against \`$emit\`.
write(
  'types/vue.d.ts',
  `// ${HEADER}
// Usage: import type {} from '@voidable/ui/types/vue';
import type { EmitFn, HTMLAttributes, PublicProps } from 'vue';
${typesImport}

type VoidVueElement<T extends keyof VoidElementTagNameMap, H> = new () => VoidElementTagNameMap[T] & {
  /** @deprecated Template prop types only; do not read \`$props\` from an element ref. */
  $props: Omit<HTMLAttributes, keyof VoidElementProperties[T]> & VoidElementProperties[T] & H & PublicProps;
  /** @deprecated Template event types only; do not call \`$emit\` on an element ref. */
  $emit: EmitFn<{ [K in keyof VoidElementEvents[T]]: (event: VoidElementEvents[T][K]) => void }>;
};

declare module 'vue' {
  interface GlobalComponents {
${perTag((el) => `VoidVueElement<${q(el.tagName)}, ${eventHandlers(el, (n) => `on${pascal(n)}`)}>`).replace(/^ {6}'/gm, "    '")}
  }
}
`,
);

const eventCount = elements.reduce((n, el) => n + el.events.length, 0);
console.log(
  `[cem] ${elements.length} tags from ${components.length} modules, ` +
    `${elements.reduce((n, el) => n + el.attributes.length, 0)} attributes, ${eventCount} events -> ` +
    'vscode.html-custom-data.json, web-types.json, components.json, types/{elements,react,solid,svelte,vue}.d.ts',
);
