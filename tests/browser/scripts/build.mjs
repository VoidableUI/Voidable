// SPDX-License-Identifier: MIT
//
// Bundles the BUILT packages (packages/*/dist, resolved through the workspace
// links in node_modules) into classic scripts the test pages load. Nothing
// here reads packages/*/src: the suite tests what is published.
//
// Output goes to tests/browser/.build/, served at /build/.
import * as esbuild from 'esbuild';
import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '.build');
const require = createRequire(join(root, 'package.json'));

const uiDist = require.resolve('@voidable/ui');
if (!existsSync(uiDist)) {
  console.error('packages/ui/dist is missing: run `mise run build` first.');
  process.exit(1);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const common = {
  bundle: true,
  absWorkingDir: root,
  logLevel: 'warning',
  legalComments: 'none',
  define: { 'process.env.NODE_ENV': '"production"' },
};

/** An entry given as source text, so each global is spelled out here. */
const iife = (name, contents) =>
  esbuild.build({
    ...common,
    format: 'iife',
    stdin: { contents, resolveDir: root, loader: 'js' },
    outfile: join(out, `${name}.js`),
  });

await Promise.all([
  // The root entry, as a consumer importing '@voidable/ui' gets it.
  // The shipped languages register themselves; a page uses one through its lang (specs/i18n.spec.ts).
  iife('ui', `import * as ui from '@voidable/ui'; import '@voidable/ui/messages/fr'; import '@voidable/ui/messages/ar'; window.VoidUI = ui;`),
  // The testing entry, as a test build would load it: it starts the data-void-ready watcher.
  iife('testing', `import '@voidable/ui/testing';`),
  esbuild.build({
    ...common,
    entryPoints: [require.resolve('@voidable/theme')],
    outfile: join(out, 'theme.css'),
  }),
  esbuild.build({
    ...common,
    entryPoints: [require.resolve('@voidable/theme/skins/loft.css')],
    outfile: join(out, 'loft.css'),
  }),
  esbuild.build({
    ...common,
    entryPoints: [require.resolve('@voidable/theme/skins/slab.css')],
    outfile: join(out, 'slab.css'),
  }),
  // Turbo 8 starts Turbo Drive on import and sets window.Turbo.
  iife('turbo', `import '@hotwired/turbo';`),
  iife('hotwire', `import { VoidTurbo } from '@voidable/ui-hotwire'; window.VoidTurbo = VoidTurbo;`),
  iife('morphdom', `import morphdom from 'morphdom'; window.morphdom = morphdom;`),
  iife('liveview', `import { VoidDOM, VoidHooks } from '@voidable/ui-liveview'; window.VoidLV = { VoidDOM, VoidHooks };`),
  // Alpine is not started here: the page registers hooks first.
  iife(
    'alpine',
    `import Alpine from 'alpinejs'; import morph from '@alpinejs/morph';
     import { VoidableAlpine, registerLivewireHooks } from '@voidable/ui-alpine';
     Alpine.plugin(morph); window.Alpine = Alpine; window.VoidAlpine = { VoidableAlpine, registerLivewireHooks };`,
  ),
  esbuild.build({
    ...common,
    format: 'iife',
    entryPoints: [join(root, 'src/react-app.tsx')],
    outfile: join(out, 'react-app.js'),
    jsx: 'automatic',
    // One React, as in an installed app: the workspace-linked wrapper would
    // otherwise resolve its own development copy.
    alias: Object.fromEntries(['react', 'react-dom'].map((p) => [p, dirname(require.resolve(`${p}/package.json`))])),
  }),
]);

copyFileSync(require.resolve('axe-core/axe.min.js'), join(out, 'axe.js'));
copyFileSync(join(root, 'src/harness.js'), join(out, 'harness.js'));
copyFileSync(join(root, 'src/morph-harness.js'), join(out, 'morph-harness.js'));
console.log('browser test bundles written to', out);
