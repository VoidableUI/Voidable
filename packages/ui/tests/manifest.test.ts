// Cross-checks dist/custom-elements.json against what Lit itself registered at
// runtime: every element class is imported and its `elementProperties` /
// `observedAttributes` (which include base classes and mixins) are the
// expectation. Nothing here shares logic with the analyzer plugins in cem/.
// Requires a prior build; `mise run test` depends on `mise run build`.
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import type { PropertyDeclaration, ReactiveElement } from 'lit';
import { ancestorEvents, extraAttributes } from '../cem/supplement.js';

// Registers every element (each module calls customElements.define).
const modules = import.meta.glob('../src/components/*.ts', { eager: true });

const root = resolve(__dirname, '..');
const manifestPath = resolve(root, 'dist/custom-elements.json');

interface ManifestMember {
  kind: string;
  name: string;
  type?: { text: string };
  default?: string;
  attribute?: string;
  reflects?: boolean;
  static?: boolean;
  privacy?: string;
  readonly?: boolean;
}
interface ManifestClass {
  kind: string;
  name: string;
  tagName?: string;
  members?: ManifestMember[];
  attributes?: { name: string; fieldName?: string; type?: { text: string }; default?: string }[];
  events?: { name: string; type?: { text: string } }[];
  superclass?: { name: string; module?: string };
}
interface Manifest {
  modules: { path: string; declarations?: ManifestClass[] }[];
}
type LitClass = typeof ReactiveElement & { elementProperties: Map<PropertyKey, PropertyDeclaration> };

/** Lit's attribute name for a reactive property (null when attribute: false). */
/** Standard HTML attributes whose camelCase DOM property has a one-word attribute. */
const NATIVE_ATTRIBUTES = new Set(['inputmode', 'enterkeyhint']);

function litAttribute(name: string, options: PropertyDeclaration): string | null {
  if (options.attribute === false) return null;
  if (typeof options.attribute === 'string') return options.attribute;
  return name.toLowerCase();
}

/** A manifest type text must be compatible with Lit's `type` converter hint. */
function typeMatchesConverter(text: string | undefined, converter: unknown): boolean {
  if (!text) return false;
  const parts = text.split('|').map((s) => s.trim());
  switch (converter) {
    case Boolean:
      return parts.includes('boolean');
    case Number:
      return parts.includes('number') || parts.every((p) => /^-?\d/.test(p));
    case String:
      return parts.some((p) => p === 'string' || /^'.*'$/.test(p));
    case Array:
      return parts.some((p) => p.endsWith('[]') || p.startsWith('Array<'));
    default:
      return true; // custom converter or untyped: any declared type is acceptable
  }
}

/** Evaluate a manifest default (source text) without module scope; undefined when it needs scope. */
function evaluateDefault(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: new Function(`return (${text});`)() };
  } catch {
    return { ok: false };
  }
}

/** Dispatched `void-*` event names per class, read from source (runtime cannot list them). */
function sourceEvents(): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const dir = resolve(root, 'src/components');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
    const sf = ts.createSourceFile(file, readFileSync(resolve(dir, file), 'utf8'), ts.ScriptTarget.Latest, true);
    const visit = (node: ts.Node, cls: string | null) => {
      const name = ts.isClassDeclaration(node) && node.name ? node.name.text : cls;
      if (
        name &&
        ts.isNewExpression(node) &&
        node.expression.getText() === 'CustomEvent' &&
        node.arguments?.[0] &&
        ts.isStringLiteralLike(node.arguments[0])
      ) {
        if (!out.has(name)) out.set(name, new Set());
        out.get(name)!.add(node.arguments[0].text);
      }
      ts.forEachChild(node, (child) => visit(child, name));
    };
    visit(sf, null);
  }
  return out;
}

describe('custom-elements.json', () => {
  if (!existsSync(manifestPath)) {
    it.fails('requires a build (run `mise run build`)', () => {
      throw new Error(`${manifestPath} not found`);
    });
    return;
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest;
  const declared = manifest.modules.flatMap((m) =>
    (m.declarations ?? []).filter((d) => d.tagName).map((d) => ({ module: m.path, decl: d })),
  );
  const byTag = new Map(declared.map((d) => [d.decl.tagName!, d]));

  // Tags registered by importing the component modules, and which module did it.
  const registered = new Map<string, { cls: LitClass; module: string }>();
  for (const [path, exports] of Object.entries(modules)) {
    for (const value of Object.values(exports as Record<string, unknown>)) {
      if (typeof value !== 'function') continue;
      const tag = customElements.getName?.(value as CustomElementConstructor);
      if (tag?.startsWith('void-')) {
        registered.set(tag, { cls: value as LitClass, module: path.replace('../src/', 'dist/').replace(/\.ts$/, '.js') });
      }
    }
  }
  const eventsBySource = sourceEvents();

  it('contains exactly the tags registered at runtime', () => {
    expect(registered.size).toBeGreaterThan(0);
    expect([...byTag.keys()].sort()).toEqual([...registered.keys()].sort());
    expect(declared.length).toBe(byTag.size); // no duplicate tags
  });

  it('documents slot="trigger" on every component with a projected trigger', () => {
    const dir = resolve(root, 'src/components');
    const withTrigger = readdirSync(dir)
      .filter((f) => f.endsWith('.ts'))
      .filter((f) => /triggerRegion\(\s*'trigger'/.test(readFileSync(resolve(dir, f), 'utf8')))
      .map((f) => `void-${f.replace(/\.ts$/, '')}`)
      .sort();
    expect(withTrigger).toEqual(['void-dropdown-menu', 'void-hover-card', 'void-popover']);
    for (const tag of withTrigger) {
      const slots = (byTag.get(tag)?.decl as { slots?: { name: string }[] } | undefined)?.slots ?? [];
      expect(slots.map((s) => s.name).sort(), tag).toEqual(['', 'trigger']);
    }
  });

  it('points modules and references at shipped dist files', () => {
    const shipped = (p: string) => p === 'dist/index.js' || p === 'dist/base.js' || /^dist\/components\/[^/]+\.js$/.test(p);
    for (const m of manifest.modules) expect(shipped(m.path), m.path).toBe(true);
    const refs: string[] = [];
    const walk = (v: unknown) => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') {
        const mod = (v as { module?: unknown }).module;
        if (typeof mod === 'string') refs.push(mod);
        Object.values(v).forEach(walk);
      }
    };
    walk(manifest.modules);
    for (const r of refs) expect(shipped(r), r).toBe(true);
  });

  it('ships no private, protected, internal or computed-key members', () => {
    for (const { decl } of declared) {
      for (const m of decl.members ?? []) {
        expect(m.privacy, `${decl.tagName}.${m.name}`).toBeUndefined();
        expect(m.name, `${decl.tagName}.${m.name}`).toMatch(/^[A-Za-z$][\w$]*$/);
        expect(m.name.startsWith('_'), `${decl.tagName}.${m.name}`).toBe(false);
      }
    }
  });

  describe.each([...registered.keys()].sort().map((tag) => [tag] as const))('%s', (tag) => {
    const { cls, module: runtimeModule } = registered.get(tag)!;
    const entry = byTag.get(tag);
    const decl = entry?.decl;
    const reactive = [...cls.elementProperties.entries()].filter(
      (e): e is [string, PropertyDeclaration] => typeof e[0] === 'string' && !e[1].state,
    );
    const supplemented = new Set((extraAttributes[tag as keyof typeof extraAttributes] ?? []).map((a) => a.name));

    it('maps to the registering class and module', () => {
      expect(decl?.name).toBe(cls.name);
      expect(entry?.module).toBe(runtimeModule);
    });

    it('has exactly the observed attributes', () => {
      const manifestAttrs = (decl?.attributes ?? []).map((a) => a.name).filter((n) => !supplemented.has(n));
      expect(manifestAttrs.sort()).toEqual([...(cls.observedAttributes ?? [])].sort());
    });

    it('records every reactive property with attribute, reflect flag, type and default', () => {
      const instance = document.createElement(tag) as unknown as Record<string, unknown>;
      for (const [name, options] of reactive) {
        const field = decl?.members?.find((m) => m.kind === 'field' && m.name === name);
        if (!field) {
          // Non-public reactive property (stripped from the published
          // manifest): its attribute is still public API and must be listed.
          const attr = litAttribute(name, options);
          expect(attr, `field ${name} is missing and has no attribute`).not.toBeNull();
          const entry = decl?.attributes?.find((a) => a.name === attr);
          expect(entry, `attribute ${attr} of non-public property ${name}`).toBeDefined();
          expect(entry!.fieldName, `attribute ${attr} links to a stripped field`).toBeUndefined();
          expect(typeMatchesConverter(entry!.type?.text, options.type), `${attr}.type ${entry!.type?.text}`).toBe(true);
          continue;
        }
        expect(field!.attribute ?? null, `${name}.attribute`).toBe(litAttribute(name, options));
        expect(Boolean(field!.reflects), `${name}.reflects`).toBe(Boolean(options.reflect));
        expect(typeMatchesConverter(field!.type?.text, options.type), `${name}.type ${field!.type?.text}`).toBe(true);
        if (field!.default !== undefined) {
          const evaluated = evaluateDefault(field!.default);
          if (evaluated.ok) expect(instance[name], `${name}.default ${field!.default}`).toEqual(evaluated.value);
        } else {
          expect(instance[name], `${name} has a runtime default but none in the manifest`).toBeUndefined();
        }
        const attr = litAttribute(name, options);
        if (attr) {
          expect(decl?.attributes?.find((a) => a.name === attr)?.fieldName, `attribute ${attr}`).toBe(name);
        }
      }
    });

    it('gives every multi-word property a kebab-case attribute (#40)', () => {
      for (const [name, options] of reactive) {
        const attr = litAttribute(name, options);
        if (attr === null || !/[A-Z]/.test(name)) continue;
        // Native HTML attributes keep their native spelling (`inputmode`, not `input-mode`).
        if (NATIVE_ATTRIBUTES.has(attr) && options.attribute === attr) continue;
        // Lit's default (the lowercased name, `maxsize`) is never what a user writes.
        // An explicit attribute that is not a kebab form (formAttr -> form) is deliberate.
        expect(attr, `${tag}.${name} uses Lit's lowercased default attribute`).not.toBe(name.toLowerCase());
        const kebab = name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
        if (attr === kebab) {
          const entry = decl?.attributes?.find((a) => a.name === kebab);
          expect(entry, `${tag} attribute ${kebab} in the manifest`).toBeDefined();
        }
      }
    });

    it('records every dispatched void-* event', () => {
      const own = eventsBySource.get(cls.name) ?? new Set<string>();
      const bubbled = ancestorEvents.filter((a) => a.tag === tag).flatMap((a) => a.events);
      expect((decl?.events ?? []).map((e) => e.name).sort()).toEqual([...new Set([...own, ...bubbled])].sort());
    });
  });
});
