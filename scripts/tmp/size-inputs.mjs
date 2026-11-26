// Temporary (#54): which modules make up a bundle, by bytes in the minified output. Run on the build host.
import { createRequire } from 'node:module';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
const root = process.cwd();
const esbuild = createRequire(join(root, 'tests/browser/package.json'))('esbuild');
for (const [name, contents] of [['button', `import '@voidable/ui/components/button';`], ['root', `import '@voidable/ui';`]]) {
  const out = await esbuild.build({ stdin: { contents, resolveDir: join(root, 'tests/browser'), loader: 'js' }, bundle: true, minify: true, format: 'esm', write: false, legalComments: 'none', logLevel: 'silent', metafile: true });
  const gz = (gzipSync(out.outputFiles[0].contents, { level: 9 }).length / 1024).toFixed(1);
  const inputs = Object.entries(out.metafile.outputs)[0][1].inputs;
  const rows = Object.entries(inputs).map(([f, v]) => [f.replace(/^.*node_modules\//, 'nm/'), v.bytesInOutput]).sort((a, b) => b[1] - a[1]);
  console.log(`== ${name}: ${gz} kB gzipped, ${out.outputFiles[0].contents.length} bytes minified, ${rows.length} modules`);
  for (const [f, b] of rows.slice(0, name === 'button' ? 40 : 25)) console.log(String(b).padStart(7), f);
}
