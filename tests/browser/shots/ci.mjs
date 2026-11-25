// SPDX-License-Identifier: MIT
//
// The pull request path of visual regression (the `visual` job of ci.yml).
//
//   BASE_SHA=<the commit the pull request is against> node shots/ci.mjs [--out DIR]
//
// There are no stored baselines. The job photographs the base commit and the
// head (this checkout) on the same machine, with the same browser, and
// compares: a difference between two renderings made side by side is a
// difference the change made, whatever the machine draws like. The before/after
// gallery is the artefact; the job's verdict is:
//
//   - The change touches the theme, a component, the reference pages or the
//     lockfile: a visual difference is expected. The job reports it (summary and
//     gallery) and passes. Reviewing the gallery is the reviewer's job.
//   - It touches none of these: a visual difference is an accident. The job
//     fails, unless a commit in the pull request carries the trailer
//     `Visual-Change: <reason>`, which says it is intended.
//
// The full matrix is photographed when something that can change the look
// changed; otherwise the smoke subset (a few pages in the default theme and
// Loft), which is enough to catch an accident from anywhere else.
import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { compare } from './compare.mjs';
import { TOOLING_ROOT } from './lib.mjs';

/** Paths where a change is expected to move pixels. */
export const EXPECTED = ['packages/theme/', 'packages/ui/src/', 'packages/storybook/stories/reference/'];
/** Paths that can move pixels without being the point of the change: the full matrix runs, a difference still fails. */
export const FULL_ONLY = ['pnpm-lock.yaml', 'packages/ui/package.json'];

const git = (...args) => execFileSync('git', args, { cwd: TOOLING_ROOT, encoding: 'utf8' }).trim();

export function decide(changedFiles, messages) {
  const touches = (list) => changedFiles.some((f) => list.some((p) => (p.endsWith('/') ? f.startsWith(p) : f === p)));
  const expected = touches(EXPECTED);
  const acknowledged = /^Visual-Change:\s*\S/im.test(messages);
  return {
    expected,
    acknowledged,
    full: expected || touches(FULL_ONLY),
    reason: expected ? 'it changes the theme, a component or the reference pages' : acknowledged ? 'a commit carries a Visual-Change trailer' : null,
  };
}

async function main() {
  const base = process.env.BASE_SHA;
  if (!base) throw new Error('BASE_SHA is required: the commit the pull request is against');
  const out = process.argv.includes('--out') ? resolve(process.argv[process.argv.indexOf('--out') + 1]) : join(TOOLING_ROOT, 'tmp/shots/compare');
  const files = git('diff', '--name-only', base, 'HEAD').split('\n').filter(Boolean);
  const messages = git('log', '--format=%B', `${base}..HEAD`);
  const d = decide(files, messages);
  console.log(`${files.length} changed file(s); ${d.full ? 'full matrix' : 'smoke subset'}; a visual difference is ${d.expected || d.acknowledged ? `expected (${d.reason})` : 'not expected'}.`);

  const summary = await compare([base, '--out', out, ...(d.full ? ['--stories'] : ['--smoke'])]);
  const verdict = summary.changed === 0 && summary.added === 0 && summary.removed === 0 ? 'identical' : d.expected || d.acknowledged ? 'expected' : 'unexpected';
  const lines = [
    '### Visual review',
    '',
    `${d.full ? 'Full matrix' : 'Smoke subset'}: ${summary.total} images, ${summary.changed} changed, ${summary.added} new, ${summary.removed} removed. Base ${summary.base.sha}, head ${summary.head.sha}, photographed on this runner.`,
    '',
    verdict === 'identical' ? 'No pixel differs.' : verdict === 'expected' ? `Differences are expected: ${d.reason}. Open the gallery in the \`visual-review\` artifact of this run (unzip it, open \`index.html\`) and look at the changed images before approving.` : 'This pull request changes the look of the reference pages but touches nothing that is meant to (packages/theme, packages/ui/src, the reference pages). If the change is intended, add a `Visual-Change: <why>` trailer to a commit message; otherwise find what moved the pixels. The gallery is in the `visual-review` artifact.',
  ];
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n\n${summaryTable(out)}\n`);
  console.log(`\n${lines.join('\n')}`);
  if (verdict === 'unexpected') {
    console.error(`::error title=Unexpected visual change::${summary.changed} image(s) differ. See the visual-review artifact; add a Visual-Change trailer if intended.`);
    process.exit(1);
  }
}

function summaryTable(out) {
  try {
    return readFileSync(join(out, 'summary.md'), 'utf8');
  } catch {
    return '';
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await main();
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }
}
