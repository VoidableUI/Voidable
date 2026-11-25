// Storybook argTypes generated from the Custom Elements Manifest, so a control's options,
// type, description and default always match the component the library ships.
//
//   argTypes: argTypesFor('void-button')
//   argTypes: argTypesFor('void-card', { label: { control: 'text' } })   // a story-only arg
//
// Every attribute becomes a control: a union of string literals is a select (inline-radio
// for three or fewer options), a boolean, a number, anything else text. Events become
// actions, and public properties that are not attributes are listed under "properties"
// (only those a control can set are editable). The second argument holds overrides merged
// on top of the generated entry, for what the manifest cannot know: a story-only arg, or a
// control deliberately hidden with `control: false`. Never put `options` or a control type
// there for a real attribute; `mise run lint:manifest` rejects it.
import elements from 'virtual:voidable-manifest';
import type { ElementSpec } from './manifest-vite';

export type ArgTypeEntry = Record<string, unknown>;
export type ArgTypeOverrides = Record<string, ArgTypeEntry>;

const quoted = /^'([^']*)'$/;

/** The members of a union type text, without `undefined` and `null`. */
function unionParts(type: string): string[] {
  return type
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s && s !== 'undefined' && s !== 'null');
}

/**
 * The control for a type text, or null when no control fits (objects, arrays, mixed unions
 * such as `boolean | number`). A union of string literals is a select, or inline-radio for
 * three or fewer options.
 */
function controlFor(type: string): { control: { type: string } | null; options?: string[] } {
  const parts = unionParts(type);
  const literals = parts.map((p) => quoted.exec(p)?.[1]);
  if (parts.length > 0 && literals.every((l) => l !== undefined)) {
    const options = literals as string[];
    return { control: { type: options.length <= 3 ? 'inline-radio' : 'select' }, options };
  }
  if (parts.length === 1 && parts[0] === 'boolean') return { control: { type: 'boolean' } };
  if (parts.length === 1 && parts[0] === 'number') return { control: { type: 'number' } };
  if (parts.length === 1 && parts[0] === 'string') return { control: { type: 'text' } };
  return { control: null };
}

const onName = (event: string) =>
  'on' + event.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');

function generate(spec: ElementSpec): Record<string, ArgTypeEntry> {
  const out: Record<string, ArgTypeEntry> = {};
  for (const a of spec.attributes) {
    // An attribute no control fits (a mixed union) takes text: any value can be typed in.
    const { control, options } = controlFor(a.type);
    out[a.field] = {
      name: a.name,
      description: a.description,
      control: control ?? { type: 'text' },
      ...(options ? { options } : {}),
      table: {
        category: 'attributes',
        type: { summary: a.type },
        ...(a.default !== undefined ? { defaultValue: { summary: a.default } } : {}),
      },
    };
  }
  for (const p of spec.properties) {
    if (out[p.name]) continue;
    const { control, options } = controlFor(p.type);
    out[p.name] = {
      description: p.description,
      control: control ?? false,
      ...(options ? { options } : {}),
      table: {
        category: 'properties',
        type: { summary: p.type },
        ...(p.default !== undefined ? { defaultValue: { summary: p.default } } : {}),
      },
    };
  }
  for (const e of spec.events) {
    out[onName(e.name)] = {
      name: e.name,
      description: e.description,
      action: e.name,
      control: false,
      table: { category: 'events', type: { summary: e.type } },
    };
  }
  return out;
}

/**
 * Storybook argTypes for a component, from the manifest. Throws for a tag the manifest does
 * not list; the Vite plugin reports the same thing at build time, before any story runs.
 */
export function argTypesFor(tag: string, overrides: ArgTypeOverrides = {}): ArgTypeEntry {
  const spec = (elements as Record<string, ElementSpec>)[tag];
  if (!spec) {
    throw new Error(
      `argTypesFor('${tag}'): not in the Custom Elements Manifest. Check the tag name, or rebuild the library (mise run build).`,
    );
  }
  const merged = generate(spec);
  for (const [key, entry] of Object.entries(overrides)) {
    merged[key] = { ...merged[key], ...entry };
  }
  return merged;
}
