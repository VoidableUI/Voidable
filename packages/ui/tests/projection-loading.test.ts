// SPDX-License-Identifier: MIT
//
// Projection (projection.ts, about 19 kB minified) is loaded only by the components that need it, not by every
// component through base.ts (#77). A component that renders gets the default ProjectionController only if
// projection.ts registered itself, so each one must import it.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const src = join(__dirname, '..', 'src');
const read = (p: string) => readFileSync(join(src, p), 'utf8');

describe('projection loading', () => {
  it('base.ts does not import projection.ts at run time', () => {
    const imports = read('base.ts').match(/^import .*$/gm) ?? [];
    for (const line of imports) {
      if (line.includes("'./projection.js'")) expect(line, line).toMatch(/^import type /);
    }
  });

  it('every component that renders imports projection.js, so it gets the default controller', () => {
    const missing: string[] = [];
    for (const file of readdirSync(join(src, 'components')).filter((f) => f.endsWith('.ts'))) {
      const text = read(`components/${file}`);
      const renders = /^\s*(protected |override |public )*render\s*\([^)]*\)\s*(:[^{]*)?\{/m.test(text);
      if (renders && !text.includes("projection.js'")) missing.push(file);
    }
    expect(missing).toEqual([]);
  });

  it('the @voidable/ui/base entry registers projection', () => {
    expect(read('base-entry.ts')).toContain('useProjection();');
  });
});
