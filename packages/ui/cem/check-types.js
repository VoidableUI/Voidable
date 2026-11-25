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
// dist/types/<name>.d.ts, plus dist/angular/index.d.ts (the form-control accessor).
const entries = ['types/elements', 'types/react', 'types/solid', 'types/solid2', 'types/svelte', 'types/vue', 'angular/index'];

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

// Solid 2 cannot share node_modules with the Solid 1 that ui itself depends on, so
// its typings are checked against the Solid 2 install of the solid2 type-test package.
const solid2 = resolve(root, 'type-tests/solid2/node_modules');
const pathsFor = (name) =>
  name === 'types/solid2'
    ? { '@solidjs/web': [resolve(solid2, '@solidjs/web')], 'solid-js': [resolve(solid2, 'solid-js')] }
    : undefined;

let failed = 0;
for (const name of entries) {
  const file = resolve(root, 'dist', `${name}.d.ts`);
  const program = ts.createProgram([file], { ...options, paths: pathsFor(name) });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length) {
    failed += diagnostics.length;
    console.error(`[cem] dist/${name}.d.ts does not typecheck:`);
    console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, host));
  }
}
if (failed) {
  console.error(`[cem] ${failed} type error(s) in generated typings`);
  process.exit(1);
}
console.log(`[cem] generated typings typecheck: ${entries.map((e) => `${e}.d.ts`).join(', ')}`);
