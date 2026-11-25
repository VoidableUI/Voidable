// Node side of the manifest helper: a Vite plugin that makes the Custom Elements
// Manifest the library build writes (packages/ui/dist/custom-elements.json) available
// to the stories as the virtual module `virtual:voidable-manifest`, and fails the
// build when a story asks `argTypesFor('void-x')` for a tag the manifest does not know.
//
// The module carries a projection of the manifest, not the whole file (1.3 MB, most
// of it analyzer detail): per element the attributes, events and public properties,
// with their type text, default text and description. Browser-side consumers use
// `.storybook/manifest.ts`.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

export const MANIFEST_PATH = resolve(fileURLToPath(new URL('../../ui/dist/custom-elements.json', import.meta.url)));
const VIRTUAL_ID = 'virtual:voidable-manifest';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

export interface AttributeSpec {
  /** The HTML attribute name, e.g. `show-values`. */
  name: string;
  /** The property name the stories use as an arg key, e.g. `showValues`. */
  field: string;
  /** The type text as the analyzer wrote it, e.g. `'sm' | 'md' | 'lg'`. */
  type: string;
  /** The default as the analyzer wrote it, e.g. `'md'`, or undefined when there is none. */
  default?: string;
  description: string;
}

export interface EventSpec {
  name: string;
  type: string;
  description: string;
}

export interface PropertySpec {
  name: string;
  type: string;
  default?: string;
  description: string;
}

export interface ElementSpec {
  tag: string;
  attributes: AttributeSpec[];
  events: EventSpec[];
  properties: PropertySpec[];
}

// Public fields that are plumbing for the library, not something a story sets.
const INTERNAL_MEMBERS = new Set(['clientState', 'editState', 'labelTarget', 'formDisabled']);

const camel = (s: string) => s.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());

interface ManifestDeclaration {
  tagName?: string;
  attributes?: { name: string; fieldName?: string; type?: { text?: string }; default?: string; description?: string }[];
  events?: { name?: string; type?: { text?: string }; description?: string }[];
  members?: {
    kind?: string;
    name: string;
    attribute?: string;
    privacy?: string;
    static?: boolean;
    type?: { text?: string };
    default?: string;
    description?: string;
  }[];
}

/** Reduce a parsed Custom Elements Manifest to the elements the stories can use. */
export function project(manifest: { modules?: { declarations?: ManifestDeclaration[] }[] }): Record<string, ElementSpec> {
  const out: Record<string, ElementSpec> = {};
  for (const mod of manifest.modules ?? []) {
    for (const d of mod.declarations ?? []) {
      if (!d.tagName) continue;
      const attributes: AttributeSpec[] = (d.attributes ?? []).map((a) => ({
        name: a.name,
        field: a.fieldName ?? camel(a.name),
        type: a.type?.text ?? 'string',
        default: a.default,
        description: a.description ?? '',
      }));
      const events: EventSpec[] = (d.events ?? [])
        .filter((e) => e.name)
        .map((e) => ({ name: e.name as string, type: e.type?.text ?? '', description: e.description ?? '' }));
      const properties: PropertySpec[] = (d.members ?? [])
        .filter(
          (m) =>
            m.kind !== 'method' &&
            !m.attribute &&
            !m.static &&
            m.privacy !== 'private' &&
            m.privacy !== 'protected' &&
            !INTERNAL_MEMBERS.has(m.name) &&
            !!m.description,
        )
        .map((m) => ({ name: m.name, type: m.type?.text ?? '', default: m.default, description: m.description ?? '' }));
      out[d.tagName] = { tag: d.tagName, attributes, events, properties };
    }
  }
  return out;
}

function loadElements(): Record<string, ElementSpec> {
  if (!existsSync(MANIFEST_PATH)) {
    throw new Error(
      `Storybook: ${MANIFEST_PATH} is missing. The story controls are generated from the Custom Elements Manifest the library build writes; run \`mise run build\` first (mise run storybook_build and mise run storybook do this).`,
    );
  }
  return project(JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')));
}

// `argTypesFor('void-x')` in a story file, with a string literal tag.
const CALL = /argTypesFor\(\s*(['"`])([^'"`]+)\1/g;

export function voidManifestPlugin(): Plugin {
  let elements: Record<string, ElementSpec> | undefined;
  const get = () => (elements ??= loadElements());
  return {
    name: 'voidable-manifest',
    enforce: 'pre',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
      return undefined;
    },
    load(id) {
      if (id !== RESOLVED_ID) return undefined;
      this.addWatchFile(MANIFEST_PATH);
      return `export default ${JSON.stringify(get())};`;
    },
    transform(code, id) {
      if (!/\.stories\.[jt]sx?$/.test(id) || !code.includes('argTypesFor(')) return undefined;
      for (const m of code.matchAll(CALL)) {
        const tag = m[2];
        if (!get()[tag]) {
          this.error(
            `${id}: argTypesFor('${tag}') asks for a tag that is not in the Custom Elements Manifest (${MANIFEST_PATH}). ` +
              `Check the tag name, or rebuild the library (mise run build) if the component is new.`,
          );
        }
      }
      return undefined;
    },
  };
}
