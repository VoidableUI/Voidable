#!/usr/bin/env node
// Build step after cem/generate.js: compile each generated dist/types/*.d.ts
// (and, through its imports, every component declaration file) with library
// checking on, one program per framework so their JSX namespaces do not
// collide. A generation that produces invalid types fails the build here
// instead of shipping.
import ts from 'typescript';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entries = ['elements', 'react', 'solid', 'svelte', 'vue'];

const options = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  strict: true,
  noEmit: true,
  skipLibCheck: false,
  types: [],
};

const host = {
  getCanonicalFileName: (f) => f,
  getCurrentDirectory: () => root,
  getNewLine: () => '\n',
};

let failed = 0;
for (const name of entries) {
  const file = resolve(root, 'dist/types', `${name}.d.ts`);
  const program = ts.createProgram([file], options);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length) {
    failed += diagnostics.length;
    console.error(`[cem] dist/types/${name}.d.ts does not typecheck:`);
    console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, host));
  }
}
if (failed) {
  console.error(`[cem] ${failed} type error(s) in generated typings`);
  process.exit(1);
}
console.log(`[cem] generated typings typecheck: types/{${entries.join(',')}}.d.ts`);
