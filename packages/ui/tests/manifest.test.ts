// Cross-checks dist/custom-elements.json (built by `cem analyze`, which parses
// with its own bundled TypeScript 5.x) against the component source parsed
// independently here with the repo's TypeScript. Requires a prior build;
// `mise run test` depends on `mise run build`.
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

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
}
interface ManifestClass {
  kind: string;
  name: string;
  tagName?: string;
  members?: ManifestMember[];
  attributes?: { name: string; fieldName?: string; type?: { text: string } }[];
  events?: { name: string; type?: { text: string } }[];
}
interface Manifest {
  modules: { path: string; declarations?: ManifestClass[] }[];
}

interface SourceProperty {
  name: string;
  attribute: string | null;
  reflects: boolean;
  type: string | null;
  initializer: string | null;
  litType: string | null;
}
interface SourceElement {
  tag: string;
  className: string;
  module: string;
  properties: SourceProperty[];
  events: Set<string>;
}

function optionValue(options: ts.ObjectLiteralExpression | undefined, key: string) {
  const prop = options?.properties.find(
    (p): p is ts.PropertyAssignment => ts.isPropertyAssignment(p) && p.name.getText() === key,
  );
  return prop?.initializer;
}

function readSource(): SourceElement[] {
  const dir = resolve(root, 'src/components');
  const out: SourceElement[] = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
    const module = `src/components/${file}`;
    const sf = ts.createSourceFile(file, readFileSync(resolve(dir, file), 'utf8'), ts.ScriptTarget.Latest, true);
    const classes = new Map<string, ts.ClassDeclaration>();
    const defines: [string, string][] = [];

    const visit = (node: ts.Node) => {
      if (ts.isClassDeclaration(node) && node.name) classes.set(node.name.text, node);
      if (
        ts.isCallExpression(node) &&
        node.expression.getText() === 'customElements.define' &&
        ts.isStringLiteralLike(node.arguments[0]) &&
        ts.isIdentifier(node.arguments[1])
      ) {
        defines.push([node.arguments[0].text, node.arguments[1].text]);
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);

    for (const [tag, className] of defines) {
      const cls = classes.get(className);
      if (!cls) throw new Error(`${module}: ${tag} registers unknown class ${className}`);
      const properties: SourceProperty[] = [];
      for (const member of cls.members) {
        const dec = ts.getDecorators(member as ts.HasDecorators)?.find(
          (d) => ts.isCallExpression(d.expression) && d.expression.expression.getText() === 'property',
        );
        if (!dec || !member.name || !ts.isPropertyDeclaration(member)) continue;
        const call = dec.expression as ts.CallExpression;
        const options = call.arguments.find(ts.isObjectLiteralExpression);
        const attr = optionValue(options, 'attribute');
        const name = member.name.getText();
        properties.push({
          name,
          attribute:
            attr && attr.kind === ts.SyntaxKind.FalseKeyword
              ? null
              : attr && ts.isStringLiteralLike(attr)
                ? attr.text
                : name.toLowerCase(), // Lit's default attribute name
          reflects: optionValue(options, 'reflect')?.kind === ts.SyntaxKind.TrueKeyword,
          type: member.type?.getText() ?? null,
          initializer: member.initializer?.getText() ?? null,
          litType: optionValue(options, 'type')?.getText() ?? null,
        });
      }
      const events = new Set<string>();
      const findEvents = (node: ts.Node) => {
        if (
          ts.isNewExpression(node) &&
          node.expression.getText() === 'CustomEvent' &&
          node.arguments?.[0] &&
          ts.isStringLiteralLike(node.arguments[0])
        ) {
          events.add(node.arguments[0].text);
        }
        ts.forEachChild(node, findEvents);
      };
      cls.members.forEach(findEvents);
      out.push({ tag, className, module, properties, events });
    }
  }
  return out;
}

const LIT_TYPES: Record<string, string> = {
  String: 'string',
  Number: 'number',
  Boolean: 'boolean',
  Array: 'unknown[]',
  Object: 'object',
};

/** Annotation, else the initializer's literal type, else Lit's `type` option. */
function expectedType(prop: SourceProperty): string | undefined {
  if (prop.type) return prop.type;
  const init = prop.initializer;
  if (init !== null) {
    if (/^(['"`]).*\1$/s.test(init)) return 'string';
    if (/^-?\d/.test(init)) return 'number';
    if (init === 'true' || init === 'false') return 'boolean';
  }
  return prop.litType ? LIT_TYPES[prop.litType] : undefined;
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
  const source = readSource();

  it('contains exactly the tags registered via customElements.define', () => {
    expect([...byTag.keys()].sort()).toEqual(source.map((s) => s.tag).sort());
    expect(declared.length).toBe(byTag.size); // no duplicate tags
  });

  it('covers every component module', () => {
    const modules = readdirSync(resolve(root, 'src/components')).filter((f) => f.endsWith('.ts'));
    expect(new Set(source.map((s) => s.module)).size).toBe(modules.length);
    expect(new Set(declared.map((d) => d.module)).size).toBe(modules.length);
  });

  describe.each(source.map((s) => [s.tag, s] as const))('%s', (_tag, el) => {
    const { module, decl } = byTag.get(el.tag)!;

    it('maps to the defining class and module', () => {
      expect(decl.name).toBe(el.className);
      expect(module).toBe(el.module);
    });

    it('records every @property with attribute, reflect flag, type and default', () => {
      const attributes = new Map((decl.attributes ?? []).map((a) => [a.name, a]));
      for (const prop of el.properties) {
        const field = decl.members?.find((m) => m.kind === 'field' && m.name === prop.name);
        expect(field, `field ${prop.name}`).toBeDefined();
        expect(field!.attribute ?? null, `${prop.name}.attribute`).toBe(prop.attribute);
        expect(Boolean(field!.reflects), `${prop.name}.reflects`).toBe(prop.reflects);
        expect(field!.default, `${prop.name}.default`).toBe(prop.initializer ?? undefined);
        expect(field!.type?.text, `${prop.name}.type`).toBe(expectedType(prop));
        if (prop.attribute) {
          expect(attributes.get(prop.attribute)?.fieldName, `attribute ${prop.attribute}`).toBe(prop.name);
        }
      }
      const attributeFields = el.properties.filter((p) => p.attribute).length;
      expect(decl.attributes?.length ?? 0).toBe(attributeFields);
      for (const attr of decl.attributes ?? []) {
        expect(attr.type?.text, `attribute ${attr.name} type`).toBeDefined();
      }
    });

    it('records every dispatched void-* event', () => {
      expect((decl.events ?? []).map((e) => e.name).sort()).toEqual([...el.events].sort());
    });
  });
});
