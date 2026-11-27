// SPDX-License-Identifier: MIT
//
// A stacked void-table borrows its own font-size as the breakpoint (#142), so everything inside it must set the
// size back: the rule that does it has to exist outside the container query, for every child of the host.
// The real-browser proof is tests/browser/specs/table-stack-font.spec.ts.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'components', 'table.css'), 'utf8');

/** The declarations of the rule whose selector list contains `selector`, at the top level of the file. */
function topLevelRule(selector) {
  let depth = 0;
  let start = 0;
  for (let i = 0; i < css.length; i++) {
    if (css[i] === '{') {
      if (depth === 0) {
        const sel = css.slice(start, i).replace(/\/\*[\s\S]*?\*\//g, '').trim();
        if (sel.split(',').map((s) => s.trim()).includes(selector)) return css.slice(i + 1, css.indexOf('}', i));
      }
      depth++;
    } else if (css[i] === '}') {
      depth--;
      if (depth === 0) start = i + 1;
    }
  }
  return null;
}

test('the stack host takes the breakpoint as its font-size', () => {
  assert.match(topLevelRule('void-table[stack]') ?? '', /font-size:\s*var\(--_void-table-stack-at\)/);
});

test('every child of a stacked table sets the font-size back to the body size', () => {
  const rule = topLevelRule('void-table[stack] > *');
  assert.ok(rule, 'a top-level rule for void-table[stack] > * is missing');
  assert.match(rule, /font-size:\s*var\(--void-type-body-size\)/);
});
