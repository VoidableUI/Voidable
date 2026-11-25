#!/usr/bin/env node
// SPDX-License-Identifier: MIT
//
// Release notes from the conventional commits since the previous release.
//
//   node scripts/release/notes.mjs 0.8.0 [previous-tag] [head]
//
// The previous tag defaults to the nearest vX.Y.Z tag. For the first unified
// release there is none, so it is the newest legacy per-package tag reachable
// from head (the plan job passes it), and the notes list what each package
// was at before.
import { classify } from './version.mjs';
import { SEMVER, compare, git, tryGit } from './lib.mjs';
import { legacyTags } from './version.mjs';

const SECTIONS = [
  ['minor', 'Features'],
  ['patch', 'Fixes'],
];

function commits(range) {
  const raw = git(['log', '--no-merges', '--format=%H%x1f%s%x1f%B%x1e', range]);
  return raw
    .split('\x1e')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [sha, subject, body] = s.split('\x1f');
      return { sha, subject, body };
    });
}

function breakingNotes(body) {
  const out = [];
  // A footer runs until a blank line, another trailer or the end of the message.
  const footer = /^BREAKING[ -]CHANGE: /m.exec(body);
  if (footer) {
    const rest = body.slice(footer.index + footer[0].length);
    const end = rest.search(/\n\s*\n|\n[A-Z][\w-]*(?: #|: )/);
    out.push((end < 0 ? rest : rest.slice(0, end)).replace(/\s*\n\s*/g, ' ').trim());
  }
  for (const m of body.matchAll(/^Breaking \(0\.x\): (.+(?:\n(?!\n).+)*)/gm)) out.push(m[1].replace(/\s*\n\s*/g, ' ').trim());
  return out;
}

export function render(version, previous, list, { legacy = [], repo = 'VoidableUI/Voidable' } = {}) {
  const lines = [];
  const groups = { major: [], minor: [], patch: [] };
  let other = 0;
  for (const c of list) {
    const level = classify(c.body || c.subject);
    const short = c.sha.slice(0, 7);
    const entry = `- ${c.subject} (${short})`;
    if (level === 'major') {
      groups.major.push({ entry, notes: breakingNotes(c.body || '') });
      // A breaking feat or fix is still listed under its type.
      const type = /^(\w+)/.exec(c.subject)?.[1];
      if (type === 'feat') groups.minor.push(entry);
      else if (['fix', 'perf', 'revert'].includes(type)) groups.patch.push(entry);
    } else if (level) groups[level].push(entry);
    else other++;
  }

  lines.push(`Every Voidable package is released at ${version}: the npm packages, \`voidable-hotwire\` (RubyGems), \`live_voidable\` (Hex) and \`voidable/laravel\` (Composer).`);
  lines.push('');
  if (legacy.length) {
    lines.push('This is the first unified release. Until now each package had its own version; they all move to one number from here on. Previous versions:');
    lines.push('');
    for (const t of legacy) lines.push(`- \`${t.prefix}\` ${t.version}`);
    lines.push('');
  }
  if (groups.major.length) {
    lines.push('## Breaking changes', '');
    for (const b of groups.major) {
      lines.push(b.entry);
      for (const n of b.notes) lines.push(`  - ${n}`);
    }
    lines.push('');
  }
  for (const [key, title] of SECTIONS) {
    if (!groups[key].length) continue;
    lines.push(`## ${title}`, '', ...groups[key], '');
  }
  if (other) lines.push(`Plus ${other} other commit${other === 1 ? '' : 's'} (documentation, tests, tooling).`, '');
  if (previous) lines.push(`**Full changelog**: https://github.com/${repo}/compare/${previous}...v${version}`, '');
  lines.push('## Install', '');
  lines.push('```bash');
  lines.push(`npm install @voidable/ui@${version} @voidable/theme@${version}`);
  lines.push('```', '');
  lines.push('Adapters, the gem, the Hex package and the Composer package take the same version, for example');
  lines.push(`\`gem "voidable-hotwire", "${version}"\` or \`{:live_voidable, "~> ${version}"}\`.`);
  return lines.join('\n') + '\n';
}

function main() {
  const [version, previousArg, head = 'HEAD'] = process.argv.slice(2);
  if (!SEMVER.test(version || '')) throw new Error('usage: notes.mjs <version> [previous-tag] [head]');
  const previous =
    previousArg ||
    tryGit(['describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*.[0-9]*.[0-9]*', `${head}^`]) ||
    tryGit(['describe', '--tags', '--abbrev=0', '--match', '*-v[0-9]*', head]);
  const range = previous ? `${previous}..${head}` : head;
  let legacy = [];
  if (!previous || !/^v\d/.test(previous)) {
    // First unified release: newest legacy tag per package reachable from head.
    const merged = (tryGit(['tag', '--merged', head]) || '').split('\n');
    const best = new Map();
    for (const t of legacyTags(merged)) {
      const cur = best.get(t.prefix);
      if (!cur || compare(t.version, cur.version) > 0) best.set(t.prefix, t);
    }
    legacy = [...best.values()].sort((a, b) => a.prefix.localeCompare(b.prefix));
  }
  process.stdout.write(render(version, previous, commits(range), { legacy }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (e) {
    console.error(`notes failed: ${e.message}`);
    process.exit(1);
  }
}
