#!/usr/bin/env node
// Generate src/parts.generated.tsx: one React wrapper per CSS-only part
// (#52) of every @voidable/ui component, from the `voidParts` the Custom
// Elements Manifest records (packages/ui/cem/supplement.js). A part has no
// behaviour, events or properties, so its wrapper only renders the tag, maps
// booleans to present/absent attributes (React 18 would write "false") and
// forwards the ref. Parts that are registered elements (accordion items,
// dropdown menu items) keep their hand-written wrappers in components.tsx.
// Build artefact; not committed (see .gitignore).

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(resolve(root, 'package.json'));
let manifestPath;
try {
  manifestPath = require.resolve('@voidable/ui/custom-elements.json');
} catch {
  manifestPath = resolve(root, '../ui/dist/custom-elements.json');
}
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

const pascal = (tag) => tag.replace(/^void-/, '').replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase());
const tsType = (text) => (text === 'boolean' ? 'boolean' : text === 'number' ? 'number' : 'string');

const parts = [];
for (const mod of manifest.modules) {
  for (const decl of mod.declarations ?? []) {
    if (!decl.voidParts) continue;
    const visit = (owner, list) => {
      for (const part of list) {
        if (part.cssOnly) parts.push({ ...part, owner });
        if (part.parts) visit(part.tag, part.parts);
      }
    };
    visit(decl.tagName, decl.voidParts.parts);
  }
}
parts.sort((a, b) => a.tag.localeCompare(b.tag));
if (!parts.length) throw new Error(`no CSS-only parts in ${manifestPath}`);

const lines = parts.map((p) => {
  const attrs = (p.attributes ?? []).map((a) => `  /** ${a.description.replace(/\*\//g, '*\\/')} */\n  ${a.name}?: ${tsType(a.type?.text)};`);
  const props = attrs.length ? `{\n${attrs.join('\n')}\n}` : '{}';
  return `/** ${p.description.replace(/\*\//g, '*\\/')} Renders \`<${p.tag}>\`, a part of \`<${p.owner}>\`. */
export const ${pascal(p.tag)} = part<${props}>('${p.tag}', '${pascal(p.tag)}');`;
});

const out = `// Generated from @voidable/ui's custom-elements.json by scripts/parts.mjs. Do not edit.
import React, { forwardRef } from 'react';

type PartProps<P> = P &
  Omit<React.HTMLAttributes<HTMLElement>, keyof P> & {
    children?: React.ReactNode;
  };

/** A CSS-only part: the tag itself, with booleans written as present or absent attributes. */
function part<P = object>(tag: string, displayName: string) {
  const Part = forwardRef<HTMLElement, PartProps<P>>((props, ref) => {
    const out: Record<string, unknown> = { ref };
    for (const [key, value] of Object.entries(props as Record<string, unknown>)) {
      if (key === 'className') out.class = value;
      else if (typeof value === 'boolean' && !key.startsWith('aria-')) out[key] = value ? '' : undefined;
      else out[key] = value;
    }
    return React.createElement(tag, out);
  });
  Part.displayName = displayName;
  return Part;
}

${lines.join('\n\n')}

/** The tag of every part wrapper above. */
export const partTags = ${JSON.stringify(parts.map((p) => p.tag))} as const;
`;

mkdirSync(resolve(root, 'src'), { recursive: true });
writeFileSync(resolve(root, 'src/parts.generated.tsx'), out);
console.log(`[react] ${parts.length} part wrappers -> src/parts.generated.tsx`);
