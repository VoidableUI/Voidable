// SPDX-License-Identifier: MIT
//
// Gzipped size of what an application ships, measured the way
// tests/browser/specs/perf.spec.ts measures it: bundle and minify the import with
// esbuild (Lit included), gzip at level 9. Prints JSON on stdout:
//
//   { "root": 59.5, "smallest": 8.1, "smallestName": "divider", "components": 66 }
//
// `root` is `import '@voidable/ui'` (every component), `smallest` the cheapest
// `import '@voidable/ui/components/<name>'`, both in kB. Needs the built
// @voidable/ui (packages/ui/dist). esbuild comes from tests/browser, where the
// performance suite already depends on it.
import { createRequire } from 'node:module';
import { readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const esbuild = createRequire(join(root, 'tests/browser/package.json'))('esbuild');
const resolveDir = join(root, 'tests/browser');

const size = async (contents) => {
  const out = await esbuild.build({
    stdin: { contents, resolveDir, loader: 'js' },
    bundle: true,
    minify: true,
    format: 'esm',
    write: false,
    legalComments: 'none',
    logLevel: 'silent',
  });
  return gzipSync(out.outputFiles[0].contents, { level: 9 }).length / 1024;
};

const names = readdirSync(join(root, 'packages/ui/dist/components'))
  .filter((f) => f.endsWith('.js'))
  .map((f) => f.slice(0, -3));

let smallest = Infinity;
let smallestName = '';
for (const name of names) {
  const kb = await size(`import '@voidable/ui/components/${name}';`);
  if (kb < smallest) {
    smallest = kb;
    smallestName = name;
  }
}

const round = (n) => Math.round(n * 10) / 10;
console.log(
  JSON.stringify({
    root: round(await size(`import '@voidable/ui';`)),
    smallest: round(smallest),
    smallestName,
    components: names.length,
  }),
);
