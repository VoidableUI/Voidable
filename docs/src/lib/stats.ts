// Single source for numbers quoted across the docs site. Everything is derived
// from the repository at build time so the counts cannot drift.
//
// To re-point at a generated manifest, replace the body of `computeStats()`;
// consumers only use the exported `stats` constant.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { execFileSync, execSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';

function findRepoRoot(): string {
  let dir = process.cwd();
  while (!existsSync(join(dir, 'pnpm-workspace.yaml'))) {
    const parent = dirname(dir);
    if (parent === dir) throw new Error('stats: could not find repository root (pnpm-workspace.yaml)');
    dir = parent;
  }
  return dir;
}

function walkTs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walkTs(join(dir, e.name)) : e.name.endsWith('.ts') ? [join(dir, e.name)] : [],
  );
}

function computeStats() {
  const root = findRepoRoot();
  const uiSrc = resolve(root, 'packages/ui/src');

  // Component files: one per top-level file in src/components.
  const components = readdirSync(join(uiSrc, 'components')).filter((f) => f.endsWith('.ts')).length;

  // Custom elements: unique tags passed to customElements.define().
  const tags = new Set<string>();
  for (const file of walkTs(uiSrc)) {
    for (const m of readFileSync(file, 'utf8').matchAll(/customElements\.define\(\s*['"]([^'"]+)['"]/g)) {
      tags.add(m[1]);
    }
  }

  // Adapter packages: published npm packages named @voidable/ui-*.
  const adapters: string[] = [];
  for (const dir of readdirSync(join(root, 'packages'))) {
    const pj = join(root, 'packages', dir, 'package.json');
    if (!existsSync(pj)) continue;
    const pkg = JSON.parse(readFileSync(pj, 'utf8'));
    if (!pkg.private && /^@voidable\/ui-/.test(pkg.name)) adapters.push(pkg.name);
  }
  adapters.sort();

  // Latest release. Every package shares one version, tagged vX.Y.Z. The
  // release workflow passes VOIDABLE_VERSION; locally use the newest tag.
  let version: string | undefined = process.env.VOIDABLE_VERSION || undefined;
  if (!version) {
    try {
      const tag = execSync("git tag --list 'v[0-9]*.[0-9]*.[0-9]*' --sort=-v:refname", { cwd: root, encoding: 'utf8' })
        .split('\n')[0]
        .trim();
      if (tag) version = tag;
    } catch {
      /* no git available */
    }
  }
  if (version && !version.startsWith('v')) version = `v${version}`;
  // Bare number for install snippets ("0.8.0"); undefined before the first release.
  const versionNumber = version && /^v\d+\.\d+\.\d+$/.test(version) ? version.slice(1) : undefined;

  // Gzipped size of what an app ships (the whole library, and the cheapest single
  // component), measured by scripts/release/bundle-size.mjs on the built
  // packages/ui/dist the way the performance suite measures it (Lit included,
  // minified). Undefined, so the home page omits the figure, when @voidable/ui is
  // not built or esbuild is not installed.
  let bundleSize: string | undefined;
  let smallestComponentSize: string | undefined;
  if (existsSync(join(root, 'packages/ui/dist/components'))) {
    try {
      const out = execFileSync(process.execPath, [join(root, 'scripts/release/bundle-size.mjs')], { cwd: root, encoding: 'utf8' });
      const sizes = JSON.parse(out) as { root: number; smallest: number };
      bundleSize = `${sizes.root.toFixed(1)} kB`;
      smallestComponentSize = `${sizes.smallest.toFixed(1)} kB`;
    } catch {
      /* no figure rather than a wrong one */
    }
  }

  // Themes and skins: one file each in packages/theme/src/themes and /skins.
  const cssFiles = (dir: string) => readdirSync(resolve(root, 'packages/theme/src', dir)).filter((f) => f.endsWith('.css'));
  const themes = cssFiles('themes').length;
  const skins = cssFiles('skins').length;

  return {
    themes,
    skins,
    components,
    elements: tags.size,
    adapters: adapters.length,
    adapterNames: adapters,
    version,
    versionNumber,
    bundleSize,
    smallestComponentSize,
  };
}

export const stats = computeStats();
