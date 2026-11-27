// SPDX-License-Identifier: MIT
//
// The touch-target growth follows `any-pointer: coarse` (#106), never `pointer: coarse`: a touch laptop or a
// tablet with a mouse reports a fine primary pointer and still has a finger. Playwright cannot emulate
// `any-pointer` apart from `pointer`, so the browser spec checks both match under emulated touch and this
// test keeps the primary-pointer query out of the sources.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const files = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : e.name.endsWith('.css') ? [join(dir, e.name)] : []));

test('no theme rule is gated on the primary pointer', () => {
  const bad = files(SRC).filter((f) => /@media[^{]*[( ]pointer:\s*coarse/.test(readFileSync(f, 'utf8')));
  assert.deepEqual(bad, []);
});

test('the hit-target knob is set under any-pointer: coarse and off with data-hit-target="off"', () => {
  const css = readFileSync(join(SRC, 'primitives.css'), 'utf8');
  assert.match(css, /@media \(any-pointer: coarse\) \{\s*:root \{ --void-hit-target: 2\.75rem; \}/);
  assert.match(css, /:root\[data-hit-target="off"\] \{ --void-hit-target: 0px; \}/);
});
