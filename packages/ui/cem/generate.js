#!/usr/bin/env node
// Derive editor metadata, framework typings and a component summary from
// dist/custom-elements.json. Runs in the @voidable/ui build after `vite build`
// (which empties dist/) and `cem analyze`; `node cem/check-types.js` then
// compiles the generated .d.ts files so a bad generation fails the build.
//
// Outputs (all under dist/, all build artefacts, none committed); see
// ./USAGE.md for how consumers use them:
//
//   custom-elements.json          written by the analyzer, not by this script
//   vscode.html-custom-data.json  VS Code HTML custom data (html.customData)
//   web-types.json                JetBrains web-types (package.json "web-types")
//   components.json               summary: component/tag counts and tag list
//   types/elements.d.ts           shared per-tag property, attribute and event maps
//   types/react.d.ts              React 19 JSX.IntrinsicElements augmentation
//   types/solid.d.ts              Solid 1 JSX.IntrinsicElements augmentation
//   types/solid2.d.ts             Solid 2 (@solidjs/web) JSX.IntrinsicElements augmentation
//   types/vue.d.ts                Vue GlobalComponents augmentation
//   types/svelte.d.ts             Svelte 5 SvelteHTMLElements augmentation
//   angular/index.{js,d.ts}       Angular ControlValueAccessor for the form controls (runtime)

import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(resolve(dist, 'custom-elements.json'), 'utf8'));

const HEADER = 'Generated from custom-elements.json by packages/ui/cem/generate.js. Do not edit.';
const IDENTIFIER = /^[A-Za-z$][\w$]*$/;

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
 *   attributes: Attr[], properties: Prop[], extraAttributes: Attr[], events: Evt[] }} El
 */

/**
 * A member frameworks may set on the element: a public, writable, plainly
 * named instance field that is either a reactive property (has an attribute)
 * or declared by the component itself (e.g. `data` on charts). Fields inherited
 * from the base class that are not reactive properties are DOM plumbing.
 */
function isSettable(m) {
  if (m.kind !== 'field' || m.static || m.readonly) return false;
  if (m.privacy === 'private' || m.privacy === 'protected') return false;
  if (!IDENTIFIER.test(m.name) || m.name.startsWith('_')) return false;
  if (m.attribute) return true;
  return !m.inheritedFrom || (m.inheritedFrom.module ?? '').startsWith('dist/components/');
}

/** @type {El[]} */
const elements = [];
for (const mod of manifest.modules) {
  for (const decl of mod.declarations ?? []) {
    if (decl.kind !== 'class' || !decl.tagName) continue;
    const members = decl.members ?? [];
    const fields = new Map(members.filter((m) => m.kind === 'field').map((m) => [m.name, m]));
    const attributes = (decl.attributes ?? []).map((a) => {
      const field = a.fieldName ? fields.get(a.fieldName) : undefined;
      return {
        name: a.name,
        type: a.type?.text,
        default: a.default,
        description: a.description || field?.description || undefined,
        reflects: Boolean(field?.reflects),
        fieldName: a.fieldName,
      };
    });
    elements.push({
      tagName: decl.tagName,
      className: decl.name,
      module: mod.path,
      description: decl.description || undefined,
      attributes,
      // Attributes with no backing property (from cem/supplement.js).
      extraAttributes: attributes.filter((a) => !a.fieldName),
      properties: members.filter(isSettable).map((m) => ({
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

// CSS-only parts (#52): `void-*` tags styled by the theme that no class
// registers, declared in the parent's `voidParts`. Editors and typed JSX need
// them (tag, attributes, description) like any element; they have no class
// (typed as HTMLElement), no properties and no events, and they do not count
// as components.
/** @type {(El & { cssOnly: true, owner: string })[]} */
const partElements = [];
for (const mod of manifest.modules) {
  for (const decl of mod.declarations ?? []) {
    if (!decl.voidParts) continue;
    const visit = (owner, list) => {
      for (const part of list) {
        if (part.cssOnly) {
          const attributes = (part.attributes ?? []).map((a) => ({
            name: a.name,
            type: a.type?.text,
            description: a.description,
            reflects: false,
          }));
          partElements.push({
            tagName: part.tag,
            className: undefined,
            module: mod.path,
            description: `${part.description} A CSS-only part of <${owner}>${part.required ? ' (required)' : ''}.`,
            attributes,
            extraAttributes: attributes,
            properties: [],
            events: [],
            cssOnly: true,
            owner,
          });
        }
        if (part.parts) visit(part.tag, part.parts);
      }
    };
    visit(decl.tagName, decl.voidParts.parts);
  }
}
/** Registered elements and CSS-only parts, for editor data and typings. */
const allElements = [...elements, ...partElements].sort((a, b) => a.tagName.localeCompare(b.tagName));

const write = (rel, content) => {
  const file = resolve(dist, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
};
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

/**
 * `'a' | 'b' | null` -> ['a', 'b']; null/undefined members are dropped (an
 * absent attribute already means null). Anything else -> null.
 */
function literalUnion(type) {
  if (!type) return null;
  const parts = type
    .split('|')
    .map((s) => s.trim())
    .filter((p) => p !== 'null' && p !== 'undefined');
  if (!parts.length || !parts.every((p) => /^'[^']*'$/.test(p) || /^"[^"]*"$/.test(p))) return null;
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
    tags: allElements.map((el) => ({
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
        elements: allElements.map((el) => ({
          name: el.tagName,
          ...(el.description ? { description: el.description } : {}),
          ...(el.className ? { source: { module: pkg.name, symbol: el.className } } : {}),
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
  const name = el.module.replace(/^dist\/components\//, '').replace(/\.js$/, '');
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
    // CSS-only parts: tags the theme styles inside a component, not components.
    parts: partElements.map((el) => ({ tag: el.tagName, owner: el.owner })),
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

/** dist/components/button.js -> ../components/button.js (from dist/types/). */
const moduleSpecifier = (distModule) => `../${distModule.replace(/^dist\//, '')}`;

// Exported type names per source file (interfaces/type aliases are not in the
// manifest), so event detail types can be imported rather than guessed. Every
// src/*.ts has a declaration file at the same path under dist/.
function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : path.endsWith('.ts') ? [path] : [];
  });
}
const exportedTypes = new Map(); // dist specifier -> Set<name>
for (const file of sourceFiles(resolve(root, 'src'))) {
  const names = new Set();
  for (const m of readFileSync(file, 'utf8').matchAll(/^export\s+(?:declare\s+)?(?:interface|type|class)\s+(\w+)/gm)) {
    names.add(m[1]);
  }
  const rel = relative(resolve(root, 'src'), file).split('\\').join('/');
  exportedTypes.set(`../${rel.replace(/\.ts$/, '.js')}`, names);
}
const GLOBAL_TYPES = new Set([
  'CustomEvent', 'Record', 'Date', 'File', 'Array', 'Partial', 'Readonly', 'HTMLElement', 'Event',
]);

const imports = new Map(); // specifier -> Set<name>
const addImport = (specifier, name) => {
  if (!imports.has(specifier)) imports.set(specifier, new Set());
  imports.get(specifier).add(name);
};

/** Resolve referenced type names in an event type; fall back to CustomEvent<unknown>. */
function resolveEventType(el, type) {
  const refs = [...type.matchAll(/\b[A-Z]\w*\b/g)].map((m) => m[0]).filter((n) => !GLOBAL_TYPES.has(n));
  for (const ref of refs) {
    const own = moduleSpecifier(el.module);
    const spec = exportedTypes.get(own)?.has(ref)
      ? own
      : [...exportedTypes.entries()].find(([, names]) => names.has(ref))?.[0];
    if (!spec) return 'CustomEvent<unknown>';
    addImport(spec, ref);
  }
  return type;
}

const q = (s) => `'${s}'`;
const camel = (s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const pascal = (s) => camel(s).replace(/^./, (c) => c.toUpperCase());

const elementLines = [];
const propLines = [];
const attrLines = [];
const eventLines = [];
for (const el of allElements) {
  if (el.className) addImport(moduleSpecifier(el.module), el.className);
  elementLines.push(`  ${q(el.tagName)}: ${el.className ?? 'HTMLElement'};`);
  const pick = el.properties.length
    ? `Partial<Pick<${el.className}, ${el.properties.map((p) => q(p.name)).join(' | ')}>>`
    : '{}';
  const extra = el.extraAttributes.length
    ? ` & { ${el.extraAttributes.map((a) => `${q(a.name)}?: ${a.type ?? 'string'}`).join('; ')} }`
    : '';
  propLines.push(`  ${q(el.tagName)}: ${pick}${extra};`);
  attrLines.push(
    `  ${q(el.tagName)}: ${el.attributes.length ? el.attributes.map((a) => q(a.name)).join(' | ') : 'never'};`,
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

/** Every custom element registered by @voidable/ui and every CSS-only part (HTMLElement), keyed by tag name. */
export interface VoidElementTagNameMap {
${elementLines.join('\n')}
}

/**
 * Public, writable properties of each element (all optional, as set from
 * markup), plus attributes that have no backing property.
 */
export interface VoidElementProperties {
${propLines.join('\n')}
}

/** HTML attribute names of each element. */
export interface VoidElementAttributeNames {
${attrLines.join('\n')}
}

/** \`void-*\` events dispatched by (or bubbling through) each element, keyed by event name. */
export interface VoidElementEvents {
${eventLines.join('\n')}
}

export type VoidTagName = keyof VoidElementTagNameMap;
`,
);

const perTag = (fn, indent = '      ') => allElements.map((el) => `${indent}${q(el.tagName)}: ${fn(el)};`).join('\n');
const eventHandlers = (el, keyFn) =>
  el.events.length
    ? `{ ${el.events.map((e) => `${q(keyFn(e.name))}?: (event: VoidElementEvents[${q(el.tagName)}][${q(e.name)}]) => void`).join('; ')} }`
    : '{}';
const typesImport =
  "import type { VoidElementTagNameMap, VoidElementProperties, VoidElementAttributeNames, VoidElementEvents } from './elements.js';";

// React 19 sets known properties on custom elements, passes `class` through as
// an attribute and maps `on<event>` props to addEventListener('<event>'), so
// `onvoid-change` listens to `void-change`. React 18 sets everything as
// attributes and ignores these handlers, so under @types/react 18 every tag
// resolves to a type whose only (required) key names the requirement.
write(
  'types/react.d.ts',
  `// ${HEADER}
// Usage: import type {} from '@voidable/ui/types/react';  (React 19+)
import type { DetailedHTMLProps, HTMLAttributes, ReactElement } from 'react';
${typesImport}

// @types/react 19 types ReactElement props as \`unknown\`; 18 used \`any\`.
type IsAny<T> = 0 extends 1 & T ? true : false;
type VoidRequiresReact19 = { '@voidable/ui/types/react requires React 19 and @types/react >= 19': never };

type VoidReactProps<T extends keyof VoidElementTagNameMap, H> =
  IsAny<ReactElement['props']> extends true
    ? VoidRequiresReact19
    : Omit<DetailedHTMLProps<HTMLAttributes<VoidElementTagNameMap[T]>, VoidElementTagNameMap[T]>, keyof VoidElementProperties[T]> &
        VoidElementProperties[T] &
        { class?: string } &
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

// Solid sets props on custom elements as properties; \`on:<event>\` attaches a
// native listener with the exact (case-sensitive) event name. \`prop:\`,
// \`attr:\` and \`bool:\` force property, attribute or boolean-attribute writes.
// Plain camelCase names do not reach the element (the compiler lowercases the
// attribute name, so \`showValues\` becomes \`showvalues\`), so only
// all-lowercase properties are typed as plain props; camelCase ones need
// \`prop:\` (checked in a browser against Solid 1.9).
write(
  'types/solid.d.ts',
  `// ${HEADER}
// Usage: import type {} from '@voidable/ui/types/solid';
import type { JSX } from 'solid-js';
${typesImport}

type VoidSolidPlain<P> = { [K in keyof P as K extends Lowercase<K & string> ? K : never]?: P[K] };

type VoidSolidNamespaced<T extends keyof VoidElementTagNameMap> =
  { [K in keyof VoidElementProperties[T] & string as \`prop:\${K}\`]?: VoidElementProperties[T][K] } &
  { [K in VoidElementAttributeNames[T] as \`attr:\${K}\`]?: string | number | boolean | null } &
  { [K in VoidElementAttributeNames[T] as \`bool:\${K}\`]?: boolean };

type VoidSolidProps<T extends keyof VoidElementTagNameMap, H> =
  Omit<JSX.HTMLAttributes<VoidElementTagNameMap[T]>, keyof VoidElementProperties[T]> &
  VoidSolidPlain<VoidElementProperties[T]> &
  VoidSolidNamespaced<T> &
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

// Svelte 5 sets props as properties when the element has them; \`on<event>\`
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
${perTag((el) => `VoidSvelteProps<${q(el.tagName)}, ${eventHandlers(el, (n) => `on${n}`)}>`, '    ')}
  }
}
`,
);

// Vue: the DefineCustomElement pattern from the Vue docs ("Non-Vue Web
// Components and TypeScript"). Templates use \`@void-change\`, which Vue
// compiles to an \`onVoidChange\` prop and Volar checks against \`$emit\`.
// Vue's HTMLAttributes has no \`slot\`, which light-DOM children of these
// elements routinely carry.
write(
  'types/vue.d.ts',
  `// ${HEADER}
// Usage: import type {} from '@voidable/ui/types/vue';
import type { EmitFn, HTMLAttributes, PublicProps } from 'vue';
${typesImport}

type VoidVueElement<T extends keyof VoidElementTagNameMap, H> = new () => VoidElementTagNameMap[T] & {
  /** @deprecated Template prop types only; do not read \`$props\` from an element ref. */
  $props: Omit<HTMLAttributes, keyof VoidElementProperties[T]> & VoidElementProperties[T] & { slot?: string } & H & PublicProps;
  /** @deprecated Template event types only; do not call \`$emit\` on an element ref. */
  $emit: EmitFn<{ [K in keyof VoidElementEvents[T]]: (event: VoidElementEvents[T][K]) => void }>;
};

declare module 'vue' {
  interface GlobalComponents {
${perTag((el) => `VoidVueElement<${q(el.tagName)}, ${eventHandlers(el, (n) => `on${pascal(n)}`)}>`, '    ')}
  }
}
`,
);

// Solid 2 moved the JSX namespace from 'solid-js' to '@solidjs/web', removed
// the `on:` namespace (custom events need a `ref` that calls addEventListener,
// typed through `VoidElementEvents`) and sets plain attributes as HTML
// attributes: only strings, numbers and booleans survive that, so object and
// array properties are typed as `prop:` only and a plain `data={...}` is a type
// error instead of a silent no-op. Plain camelCase names are lowercased by the
// compiler (as in Solid 1), so those need `prop:` too.
write(
  'types/solid2.d.ts',
  `// ${HEADER}
// Usage: import type {} from '@voidable/ui/types/solid2';  (Solid 2+)
import type { JSX } from '@solidjs/web';
${typesImport}

type VoidSolid2Primitive = string | number | boolean;
type VoidSolid2Plain<P> = {
  [K in keyof P as K extends Lowercase<K & string> ? (NonNullable<P[K]> extends VoidSolid2Primitive ? K : never) : never]?: P[K];
};

type VoidSolid2Props<T extends keyof VoidElementTagNameMap> =
  Omit<JSX.HTMLAttributes<VoidElementTagNameMap[T]>, keyof VoidElementProperties[T] | \`prop:\${string}\`> &
  VoidSolid2Plain<VoidElementProperties[T]> &
  { [K in keyof VoidElementProperties[T] & string as \`prop:\${K}\`]?: VoidElementProperties[T][K] };

declare module '@solidjs/web' {
  namespace JSX {
    interface IntrinsicElements {
${perTag((el) => `VoidSolid2Props<${q(el.tagName)}>`)}
    }
  }
}
`,
);

// ---------------------------------------------------------------------------
// Angular forms integration (runtime, not types)
// ---------------------------------------------------------------------------
//
// Angular's template type checker never sees custom element bindings, so there
// is nothing to type. What the typings cannot give Angular is forms support:
// ngModel, formControl and formControlName need a ControlValueAccessor, and the
// stock ones only fit native <input>/<select>. One component-agnostic directive
// serves every Void form control; the per-tag facts it needs (which property
// holds the value, which `void-*` event carries the new one, what an empty
// value is) are derived here from the manifest: an element is a form control
// when it uses the NativeFormControl or InternalsFormControl mixin and fires
// `void-change`, and the detail key of that event names the value.

/** Value written for `null`, from the TypeScript type of the detail key. */
function emptyValueFor(type) {
  if (/\[\]$/.test(type)) return '[]';
  if (type === 'boolean') return 'false';
  if (type === 'number') return '0';
  return "''";
}

/** @type {Record<string, { prop: string, key: string, events: string[], empty: string }>} */
const formControls = {};
for (const mod of manifest.modules) {
  for (const decl of mod.declarations ?? []) {
    if (decl.kind !== 'class' || !decl.tagName) continue;
    if (!(decl.mixins ?? []).some((m) => m.name === 'NativeFormControl' || m.name === 'InternalsFormControl')) continue;
    const change = (decl.events ?? []).find((e) => e.name === 'void-change');
    if (!change) continue;
    const fields = new Set((decl.members ?? []).filter((m) => m.kind === 'field').map((m) => m.name));
    const detail = Object.fromEntries(
      [...(change.type?.text ?? '').matchAll(/(\w+): ([^;}]+?)\s*(?:;|\})/g)].map((m) => [m[1], m[2]]),
    );
    // A boolean control carries its state under the attribute's name beside `value` (#23): bind that.
    // A radio is driven by its group, so it is not bound on its own.
    const key = decl.tagName === 'void-radio' ? null : ['checked', 'value', 'values'].find((k) => k in detail);
    const prop = key === 'values' ? 'value' : key;
    if (!key || !fields.has(prop)) continue;
    formControls[decl.tagName] = {
      prop,
      key,
      events: (decl.events ?? []).map((e) => e.name).filter((n) => n === 'void-input' || n === 'void-change'),
      empty: emptyValueFor(detail[key].replace(/\s+/g, ' ').split('|')[0].trim()),
    };
  }
}
const controlTags = Object.keys(formControls).sort();
if (controlTags.length === 0) throw new Error('no form controls found in the manifest');
const controlSelector = controlTags
  .flatMap((t) => [`${t}[ngModel]`, `${t}[formControl]`, `${t}[formControlName]`])
  .join(', ');
const controlTable = controlTags
  .map((t) => `  ${q(t)}: { prop: ${q(formControls[t].prop)}, key: ${q(formControls[t].key)}, empty: () => ${formControls[t].empty} },`)
  .join('\n');
const controlListeners = [...new Set(controlTags.flatMap((t) => formControls[t].events))]
  .sort()
  .map((n) => `${q(n)}: 'handleEvent($event)'`)
  .join(', ');

const fill = (file) =>
  readFileSync(resolve(root, 'cem', file), 'utf8')
    .replaceAll('@@HEADER@@', HEADER)
    .replaceAll('@@TABLE@@', controlTable)
    .replaceAll('@@SELECTOR@@', controlSelector)
    .replaceAll('@@LISTENERS@@', controlListeners)
    .replaceAll('@@COUNT@@', String(controlTags.length));
write('angular/index.js', fill('angular-accessor.js.template'));
write('angular/index.d.ts', fill('angular-accessor.d.ts.template'));

const eventCount = elements.reduce((n, el) => n + el.events.length, 0);
console.log(
  `[cem] ${elements.length} tags from ${components.length} modules, ` +
    `${elements.reduce((n, el) => n + el.attributes.length, 0)} attributes, ${eventCount} events -> ` +
    'vscode.html-custom-data.json, web-types.json, components.json, types/{elements,react,solid,solid2,svelte,vue}.d.ts, ' +
    `angular/index.{js,d.ts} (${controlTags.length} form controls)`,
);
