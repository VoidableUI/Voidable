// SPDX-License-Identifier: MIT
//
// Photographs two refs and builds the before/after gallery.
//
//   node shots/compare.mjs <base-ref> [<head-ref>] [--out DIR] [--keep] [capture filters]
//
// Each ref is checked out in a temporary git worktree, installed and built
// there (`mise run build`), and photographed by THIS checkout's tooling: the ref
// does not need to contain any of the screenshot code. When <head-ref> is
// omitted the head is the current working tree (it must be built already; the
// mise task does that). The filters are the ones `mise run shots` takes
// (--page, --theme, --skin, --scheme, --width, --smoke, --jobs).
//
// Output (default tmp/shots/compare): base/, head/ (captures), gallery/ (open
// gallery/index.html), summary.json and summary.md (what changed, worst first).
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { capture, parseArgs as parseCapture } from './capture.mjs';
import { buildGallery } from './gallery.mjs';
import { TOOLING_ROOT } from './lib.mjs';

const git = (args, cwd = TOOLING_ROOT) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

/** Splits the command line into refs, our own options and the capture filters. */
function parse(argv) {
  const refs = [];
  const own = { out: join(TOOLING_ROOT, 'tmp/shots/compare'), keep: false, title: null };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') own.out = resolve(argv[++i]);
    else if (a === '--title') own.title = argv[++i];
    else if (a === '--keep') own.keep = true;
    else if (a === '--smoke' || a === '--stories') rest.push(a);
    else if (a.startsWith('--')) rest.push(a, argv[++i]);
    else refs.push(a);
  }
  if (refs.length < 1 || refs.length > 2) throw new Error('usage: compare.mjs <base-ref> [<head-ref>] [--out DIR] [--keep] [filters]');
  return { refs, own, rest };
}

function run(cmd, args, cwd, env = {}) {
  const r = spawnSync(cmd, args, { cwd, stdio: ['ignore', 'inherit', 'inherit'], env: { ...process.env, ...env } });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed in ${cwd}`);
}

/** A worktree of `ref`, built. Returns its path. */
function checkout(ref, dir) {
  console.log(`\n== ${ref}: check out, install, build`);
  git(['worktree', 'add', '--detach', dir, ref]);
  // The worktree's own mise.toml is not trusted by default; its tasks are the repository's.
  run('mise', ['trust', dir], dir);
  run('mise', ['run', 'build'], dir, { MISE_TASK_RUN_AUTO_INSTALL: 'false' });
  return dir;
}

export async function compare(argv) {
  const { refs, own, rest } = parse(argv);
  const [baseRef, headRef] = refs;
  const sha = (r) => git(['rev-parse', '--short=10', `${r}^{commit}`]);
  const baseSha = sha(baseRef);
  const headSha = headRef ? sha(headRef) : `${sha('HEAD')}${git(['status', '--porcelain']) ? '+worktree' : ''}`;
  rmSync(own.out, { recursive: true, force: true });
  mkdirSync(own.out, { recursive: true });
  const scratch = mkdtempSync(join(tmpdir(), 'void-shots-'));
  const made = [];
  try {
    const baseRoot = checkout(baseRef, join(scratch, 'base'));
    made.push(baseRoot);
    let headRoot = TOOLING_ROOT;
    if (headRef) {
      headRoot = checkout(headRef, join(scratch, 'head'));
      made.push(headRoot);
    }
    for (const [name, root] of [['base', baseRoot], ['head', headRoot]]) {
      console.log(`\n== photograph ${name} (${root})`);
      const opts = parseCapture(['--out', join(own.out, name), '--root', root, ...rest]);
      const { failures } = await capture(opts);
      if (failures.length) throw new Error(`the ${name} capture had ${failures.length} problem(s)`);
    }
    console.log('\n== gallery');
    const data = await buildGallery({
      head: join(own.out, 'head'),
      base: join(own.out, 'base'),
      out: join(own.out, 'gallery'),
      title: own.title || `${baseRef} to ${headRef ?? 'working tree'}`,
      baseLabel: `${baseRef} (${baseSha})`.slice(0, 40),
      headLabel: `${headRef ?? 'working tree'} (${headSha})`.slice(0, 40),
      webp: false,
    });
    const changed = data.items.filter((i) => i.status === 'changed');
    const summary = {
      base: { ref: baseRef, sha: baseSha },
      head: { ref: headRef ?? 'working tree', sha: headSha },
      ...data.summary,
      changed_images: changed.map((i) => ({ page: i.page, look: i.look, scheme: i.scheme, width: i.width, ratio: Number(i.ratio.toFixed(5)) })),
    };
    writeFileSync(join(own.out, 'summary.json'), `${JSON.stringify(summary, null, 1)}\n`);
    const md = [
      `${data.summary.changed} of ${data.summary.total} images changed (${data.summary.added} new, ${data.summary.removed} removed, ${data.summary.same} identical): \`${baseRef}\` (${baseSha}) to \`${headRef ?? 'working tree'}\` (${headSha}).`,
      '',
      ...(changed.length ? ['| Image | Changed area |', '| --- | --- |', ...changed.slice(0, 15).map((i) => `| ${i.page} / ${i.look} / ${i.scheme} / ${i.width}px | ${(i.ratio * 100).toFixed(2)}% |`), ...(changed.length > 15 ? [`| and ${changed.length - 15} more | |`] : [])] : []),
    ].join('\n');
    writeFileSync(join(own.out, 'summary.md'), `${md}\n`);
    console.log(`\n${md}\n\nopen ${join(own.out, 'gallery/index.html')}`);
    return summary;
  } finally {
    if (!own.keep) {
      for (const dir of made) {
        try {
          git(['worktree', 'remove', '--force', dir]);
        } catch {
          rmSync(dir, { recursive: true, force: true });
        }
      }
      git(['worktree', 'prune']);
      rmSync(scratch, { recursive: true, force: true });
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await compare(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
