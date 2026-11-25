// Single source for numbers quoted across the docs site. Everything is derived
// from the repository at build time so the counts cannot drift.
//
// To re-point at a generated manifest, replace the body of `computeStats()`;
// consumers only use the exported `stats` constant.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
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

  // Latest @voidable/ui release: CI passes VOIDABLE_VERSION; locally use git tags.
  let version: string | undefined = process.env.VOIDABLE_VERSION || undefined;
  if (!version) {
    try {
      const tag = execSync("git tag --list 'ui-v[0-9]*' --sort=-v:refname", { cwd: root, encoding: 'utf8' })
        .split('\n')[0]
        .trim();
      if (tag) version = tag.replace(/^ui-/, '');
    } catch {
      /* no git available */
    }
  }

  // Gzipped size of the @voidable/ui build: CI passes VOIDABLE_BUNDLE_SIZE
  // (same calculation); locally compute it from packages/ui/dist if built.
  let bundleSize: string | undefined = process.env.VOIDABLE_BUNDLE_SIZE || undefined;
  if (!bundleSize) {
    const dist = join(root, 'packages/ui/dist');
    if (existsSync(dist)) {
      const js = readdirSyncRecursive(dist).filter((f) => f.endsWith('.js'));
      if (js.length) {
        const bytes = gzipSync(Buffer.concat(js.map((f) => readFileSync(f)))).length;
        bundleSize = `${(bytes / 1024).toFixed(1)} kB`;
      }
    }
  }

  return { components, elements: tags.size, adapters: adapters.length, adapterNames: adapters, version, bundleSize };
}

function readdirSyncRecursive(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? readdirSyncRecursive(join(dir, e.name)) : [join(dir, e.name)],
  );
}

export const stats = computeStats();
