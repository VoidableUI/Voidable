#!/usr/bin/env node
// SPDX-License-Identifier: MIT
//
// Cross-compile, package and checksum the `voidable` command-line tool.
//
//   VERSION=0.8.0 node scripts/release/binaries.mjs build    # normally through binaries.sh
//   node scripts/release/binaries.mjs verify <dir>            # checksums.txt against the archives
//
// `build` expects the Go embed directory to be filled already (binaries.sh
// stamps the version, builds @voidable/ui and the theme, and runs
// `mise run build:assets` first), so the binaries carry the assets of the
// version being released. Output under $OUT/binaries:
//
//   dist/   voidable_<os>_<arch>.tar.gz (.zip for windows) and checksums.txt: what is released
//   raw/    the bare executables, only for measuring and testing
//
// Plain `go build`, CGO off, -trimpath, stripped, no build id: the same source,
// the same Go and the same assets give the same bytes. The build date is the
// commit's date (SOURCE_DATE_EPOCH), not the wall clock, and archives carry
// fixed owners, modes and times, so a rebuild reproduces every archive.
// Needs GNU tar, gzip and zip (every GitHub Ubuntu runner has them).
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT, SEMVER } from './lib.mjs';

export const TARGETS = [
  { os: 'linux', arch: 'amd64' },
  { os: 'linux', arch: 'arm64' },
  { os: 'darwin', arch: 'amd64' },
  { os: 'darwin', arch: 'arm64' },
  { os: 'windows', arch: 'amd64' },
  { os: 'windows', arch: 'arm64' },
];

const GO_DIR = 'tools/voidable';

/** `linux/amd64` -> { os, arch }; throws on a target that is not released. */
export function parseTarget(s) {
  const t = TARGETS.find((x) => `${x.os}/${x.arch}` === s);
  if (!t) throw new Error(`unknown target ${s}; one of ${TARGETS.map((x) => `${x.os}/${x.arch}`).join(', ')}`);
  return t;
}

/**
 * The archive of one target. The name carries no version so that
 * releases/latest/download/<name> works without asking an API what "latest"
 * is; the version is the release tag and the directory inside the archive.
 */
export function archiveName({ os, arch }) {
  return `voidable_${os}_${arch}.${os === 'windows' ? 'zip' : 'tar.gz'}`;
}

/** The directory every archive unpacks to. */
export function archiveDir(version, { os, arch }) {
  return `voidable_${version}_${os}_${arch}`;
}

export function executableName(os) {
  return os === 'windows' ? 'voidable.exe' : 'voidable';
}

/** The -ldflags string: strip symbols and the build id, inject version, commit, date. */
export function ldflags({ version, commit, date }) {
  for (const [k, v] of Object.entries({ version, commit, date })) {
    if (!v || /\s/.test(v)) throw new Error(`${k} must be a non-empty string without whitespace, got ${JSON.stringify(v)}`);
  }
  return `-s -w -buildid= -X main.Version=${version} -X main.Commit=${commit} -X main.Date=${date}`;
}

/** RFC 3339 UTC from a Unix timestamp in seconds. */
export function buildDate(epoch) {
  if (!/^\d+$/.test(String(epoch))) throw new Error(`not a Unix timestamp: ${epoch}`);
  return new Date(Number(epoch) * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** `sha256sum`-format text, sorted by name so the file is reproducible. */
export function checksumsText(entries) {
  return entries
    .slice()
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .map((e) => `${e.sha256}  ${e.name}\n`)
    .join('');
}

/** Inverse of checksumsText: name -> sha256. Rejects anything that is not `<64 hex>  <name>`. */
export function parseChecksums(text) {
  const out = new Map();
  for (const line of text.split('\n')) {
    if (!line) continue;
    const m = /^([0-9a-f]{64}) [ *](\S+)$/.exec(line);
    if (!m) throw new Error(`malformed checksums line: ${line}`);
    if (out.has(m[2])) throw new Error(`duplicate checksum for ${m[2]}`);
    out.set(m[2], m[1]);
  }
  return out;
}

export function sha256File(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

/** Check every archive in dir against checksums.txt and the other way round. Returns the problems. */
export function verifyDir(dir, targets = TARGETS) {
  const problems = [];
  const file = join(dir, 'checksums.txt');
  if (!existsSync(file)) return [`${file} is missing`];
  let sums;
  try {
    sums = parseChecksums(readFileSync(file, 'utf8'));
  } catch (e) {
    return [e.message];
  }
  const want = targets.map(archiveName);
  for (const name of want) {
    if (!sums.has(name)) problems.push(`checksums.txt has no entry for ${name}`);
    else if (!existsSync(join(dir, name))) problems.push(`${name} is listed but missing`);
    else if (sha256File(join(dir, name)) !== sums.get(name)) problems.push(`${name} does not match its checksum`);
  }
  for (const name of sums.keys()) if (!want.includes(name)) problems.push(`checksums.txt lists unexpected ${name}`);
  return problems;
}

function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed (${r.status ?? r.signal})`);
  return r.stdout;
}

const fmtSize = (n) => `${(n / 1048576).toFixed(1)} MiB`;

function commitFacts() {
  const git = (a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim();
  return {
    commit: process.env.COMMIT || git(['rev-parse', 'HEAD']),
    epoch: process.env.SOURCE_DATE_EPOCH || git(['log', '-1', '--format=%ct']),
  };
}

/** Pack one target's staging directory deterministically. */
function pack(stageParent, dirName, target, out, epoch) {
  const base = join(stageParent, dirName);
  // Fixed times on the tree, then a name-sorted file list.
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? [join(d, e.name), ...walk(join(d, e.name))] : [join(d, e.name)]));
  const t = new Date(Number(epoch) * 1000);
  for (const p of [base, ...walk(base)]) utimesSync(p, t, t);
  const archive = join(out, archiveName(target));
  rmSync(archive, { force: true });
  if (target.os === 'windows') {
    const list = walk(base).map((p) => p.slice(stageParent.length + 1)).sort();
    sh('zip', ['-X', '-q', '-9', archive, dirName, ...list.filter((p) => p !== dirName)], { cwd: stageParent, env: { ...process.env, TZ: 'UTC' } });
  } else {
    sh(
      'sh',
      ['-c', 'tar --sort=name --format=gnu --owner=0 --group=0 --numeric-owner --mtime="@$1" -cf - -C "$2" "$3" | gzip -n -9 > "$4"', 'pack', String(epoch), stageParent, dirName, archive],
    );
  }
  return archive;
}

export function build({ version, out, targets = TARGETS, go = process.env.GO ? [process.env.GO] : ['mise', 'x', '--', 'go'] }) {
  if (!SEMVER.test(version)) throw new Error(`not a semantic version: ${version}`);
  const { commit, epoch } = commitFacts();
  const date = buildDate(epoch);
  const flags = ldflags({ version, commit, date });
  const dist = join(out, 'binaries', 'dist');
  const raw = join(out, 'binaries', 'raw');
  rmSync(join(out, 'binaries'), { recursive: true, force: true });
  mkdirSync(dist, { recursive: true });
  mkdirSync(raw, { recursive: true });
  const stage = mkdtempSync(join(tmpdir(), 'voidable-binaries-'));
  const [goBin, ...goArgs] = go;
  const rows = [];
  try {
    for (const target of targets) {
      const t0 = Date.now();
      const exe = executableName(target.os);
      const rawDir = join(raw, `${target.os}_${target.arch}`);
      mkdirSync(rawDir, { recursive: true });
      sh(goBin, [...goArgs, 'build', '-trimpath', '-tags', 'assets', '-ldflags', flags, '-o', join(rawDir, exe), '.'], {
        cwd: join(ROOT, GO_DIR),
        env: { ...process.env, CGO_ENABLED: '0', GOOS: target.os, GOARCH: target.arch, GOFLAGS: '-mod=readonly' },
      });
      const seconds = (Date.now() - t0) / 1000;

      const dirName = archiveDir(version, target);
      const dir = join(stage, dirName);
      mkdirSync(dir, { recursive: true });
      copyFileSync(join(rawDir, exe), join(dir, exe));
      chmodSync(join(dir, exe), 0o755);
      copyFileSync(join(ROOT, 'LICENSE.md'), join(dir, 'LICENSE.md'));
      copyFileSync(join(ROOT, GO_DIR, 'release', 'README.txt'), join(dir, 'README.txt'));
      chmodSync(join(dir, 'LICENSE.md'), 0o644);
      chmodSync(join(dir, 'README.txt'), 0o644);
      const archive = pack(stage, dirName, target, dist, epoch);
      rows.push({ target, seconds, binary: statSync(join(rawDir, exe)).size, archive: statSync(archive).size });
    }
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
  const entries = targets.map((t) => ({ name: archiveName(t), sha256: sha256File(join(dist, archiveName(t))) }));
  writeFileSync(join(dist, 'checksums.txt'), checksumsText(entries));
  const problems = verifyDir(dist, targets);
  if (problems.length) throw new Error(problems.join('\n'));
  return { rows, commit, date, dist, raw };
}

/** Run the host's binary through the checks that prove it carries the stamped assets. */
export function selfCheck({ version, raw, commit }) {
  const os = { linux: 'linux', darwin: 'darwin' }[process.platform];
  const arch = { x64: 'amd64', arm64: 'arm64' }[process.arch];
  if (!os || !arch) return 'skipped (host platform is not a release target)';
  const exe = join(raw, `${os}_${arch}`, executableName(os));
  if (!existsSync(exe)) return `skipped (${os}/${arch} was not built)`;
  const v = execFileSync(exe, ['version'], { encoding: 'utf8' });
  if (!v.startsWith(`voidable ${version}\n`) || !v.includes(`commit:   ${commit}\n`) || !v.includes(`manifest: @voidable/ui ${version}\n`) || !v.includes('assets:   embedded\n')) {
    throw new Error(`voidable version prints the wrong build facts:\n${v}`);
  }
  const dir = mkdtempSync(join(tmpdir(), 'voidable-selfcheck-'));
  try {
    execFileSync(exe, ['install', '--dir', dir], { stdio: 'ignore' });
    const installed = readFileSync(join(dir, 'VERSION'), 'utf8').trim();
    if (installed !== version) throw new Error(`install wrote assets of ${installed}, expected ${version}`);
    for (const f of ['ui/index.js', 'ui/autoloader.js', 'theme/void.min.css']) {
      const src = join(ROOT, f.startsWith('theme') ? 'packages/theme/dist/void.min.css' : `packages/ui/dist/${f.slice(3)}`);
      if (!readFileSync(join(dir, f)).equals(readFileSync(src))) throw new Error(`installed ${f} differs from the build in this checkout`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  return `ok (${os}/${arch}: version, commit, manifest and installed assets all at ${version})`;
}

function report({ rows, dist }, check) {
  const lines = ['target             binary      archive     build'];
  for (const r of rows) lines.push(`${`${r.target.os}/${r.target.arch}`.padEnd(18)} ${fmtSize(r.binary).padEnd(11)} ${fmtSize(r.archive).padEnd(11)} ${r.seconds.toFixed(1)}s`);
  lines.push(`checksums.txt lists ${rows.length} archives; self-check: ${check}`);
  const text = lines.join('\n');
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) {
    writeFileSync(process.env.GITHUB_STEP_SUMMARY, `### Binaries\n\`\`\`\n${text}\n\`\`\`\n`, { flag: 'a' });
  }
  return dist;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const [cmd, arg] = process.argv.slice(2);
    if (cmd === 'build') {
      const version = process.env.VERSION;
      if (!version) throw new Error('set VERSION');
      const out = process.env.OUT || join(ROOT, 'release-artifacts');
      const targets = process.env.TARGETS ? process.env.TARGETS.split(',').map(parseTarget) : TARGETS;
      const result = build({ version, out, targets });
      report(result, selfCheck({ version, raw: result.raw, commit: result.commit }));
    } else if (cmd === 'verify') {
      const problems = verifyDir(arg ?? '.');
      if (problems.length) throw new Error(problems.join('\n'));
      console.log(`ok: ${TARGETS.length} archives match checksums.txt`);
    } else {
      throw new Error('usage: binaries.mjs build | verify <dir>');
    }
  } catch (e) {
    console.error(`binaries: ${e.message}`);
    process.exit(1);
  }
}
