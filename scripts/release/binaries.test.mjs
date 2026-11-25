// SPDX-License-Identifier: MIT
// The binary packaging helpers, and docs/public/install.sh against a local file
// server that mimics the GitHub release layout. Run with: mise run release:test
import assert from 'node:assert/strict';
import { execFile, execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import {
  TARGETS, archiveDir, archiveName, buildDate, checksumsText, executableName, ldflags, parseChecksums, parseTarget, sha256File, verifyDir,
} from './binaries.mjs';

const run = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const INSTALL = join(here, '..', '..', 'docs', 'public', 'install.sh');
const scratch = [];
const tmp = () => {
  const d = mkdtempSync(join(tmpdir(), 'voidable-binaries-test-'));
  scratch.push(d);
  return d;
};
after(() => scratch.forEach((d) => rmSync(d, { recursive: true, force: true })));

describe('naming and flags', () => {
  test('six targets, linux and darwin as tar.gz, windows as zip, none with a version in the name', () => {
    assert.equal(TARGETS.length, 6);
    assert.deepEqual(
      TARGETS.map(archiveName),
      ['voidable_linux_amd64.tar.gz', 'voidable_linux_arm64.tar.gz', 'voidable_darwin_amd64.tar.gz', 'voidable_darwin_arm64.tar.gz', 'voidable_windows_amd64.zip', 'voidable_windows_arm64.zip'],
    );
    assert.equal(archiveDir('1.2.3', { os: 'linux', arch: 'arm64' }), 'voidable_1.2.3_linux_arm64');
    assert.equal(executableName('windows'), 'voidable.exe');
    assert.equal(executableName('darwin'), 'voidable');
    assert.deepEqual(parseTarget('darwin/arm64'), { os: 'darwin', arch: 'arm64' });
    assert.throws(() => parseTarget('plan9/386'), /unknown target/);
  });

  test('ldflags strip, drop the build id and inject version, commit and date', () => {
    const f = ldflags({ version: '1.2.3', commit: 'abc', date: '2026-01-02T03:04:05Z' });
    assert.equal(f, '-s -w -buildid= -X main.Version=1.2.3 -X main.Commit=abc -X main.Date=2026-01-02T03:04:05Z');
    assert.throws(() => ldflags({ version: '1.2.3', commit: '', date: 'x' }), /commit/);
    assert.throws(() => ldflags({ version: '1 2', commit: 'a', date: 'x' }), /version/);
  });

  test('the build date is the commit date in UTC, not the clock', () => {
    assert.equal(buildDate('0'), '1970-01-01T00:00:00Z');
    assert.equal(buildDate(1767323045), '2026-01-02T03:04:05Z');
    assert.throws(() => buildDate('yesterday'), /Unix timestamp/);
  });
});

describe('checksums', () => {
  const a = 'a'.repeat(64);
  const b = 'b'.repeat(64);

  test('sha256sum format, sorted, and back', () => {
    const text = checksumsText([{ name: 'z.zip', sha256: b }, { name: 'a.tar.gz', sha256: a }]);
    assert.equal(text, `${a}  a.tar.gz\n${b}  z.zip\n`);
    assert.deepEqual([...parseChecksums(text)], [['a.tar.gz', a], ['z.zip', b]]);
  });

  test('malformed and duplicate lines are rejected', () => {
    assert.throws(() => parseChecksums('nothex  file\n'), /malformed/);
    assert.throws(() => parseChecksums(`${a}  f\n${b}  f\n`), /duplicate/);
  });

  test('verifyDir passes for a consistent directory and names every kind of problem', () => {
    const dir = tmp();
    const entries = [];
    for (const t of TARGETS) {
      writeFileSync(join(dir, archiveName(t)), `archive ${archiveName(t)}`);
      entries.push({ name: archiveName(t), sha256: sha256File(join(dir, archiveName(t))) });
    }
    writeFileSync(join(dir, 'checksums.txt'), checksumsText(entries));
    assert.deepEqual(verifyDir(dir), []);

    writeFileSync(join(dir, 'voidable_linux_amd64.tar.gz'), 'tampered');
    assert.match(verifyDir(dir).join('\n'), /voidable_linux_amd64\.tar\.gz does not match its checksum/);

    rmSync(join(dir, 'voidable_windows_arm64.zip'));
    assert.match(verifyDir(dir).join('\n'), /voidable_windows_arm64\.zip is listed but missing/);

    writeFileSync(join(dir, 'checksums.txt'), checksumsText(entries.slice(1)));
    assert.match(verifyDir(dir).join('\n'), /no entry for voidable_linux_amd64\.tar\.gz/);

    writeFileSync(join(dir, 'checksums.txt'), checksumsText([...entries, { name: 'extra.tar.gz', sha256: a }]));
    assert.match(verifyDir(dir).join('\n'), /unexpected extra\.tar\.gz/);

    assert.match(verifyDir(tmp()).join('\n'), /checksums\.txt is missing/);
  });
});

describe('install.sh', () => {
  let server;
  let base;
  let root; // served directory tree: latest/download/*, download/v1.2.3/*
  const requests = [];
  const FAKE = '#!/bin/sh\necho "voidable 1.2.3 (fake)"\n';

  /** Publish an archive for linux/amd64 holding a fake binary, plus checksums.txt, under a release path. */
  function release(path, { checksum } = {}) {
    const dir = join(root, path);
    mkdirSync(dir, { recursive: true });
    const stage = tmp();
    const inner = join(stage, 'voidable_1.2.3_linux_amd64');
    mkdirSync(inner);
    writeFileSync(join(inner, 'voidable'), FAKE, { mode: 0o755 });
    writeFileSync(join(inner, 'README.txt'), 'readme');
    execFileSync('tar', ['-czf', join(dir, 'voidable_linux_amd64.tar.gz'), '-C', stage, 'voidable_1.2.3_linux_amd64']);
    const sha = checksum ?? sha256File(join(dir, 'voidable_linux_amd64.tar.gz'));
    writeFileSync(join(dir, 'checksums.txt'), `${'0'.repeat(64)}  voidable_linux_arm64.tar.gz\n${sha}  voidable_linux_amd64.tar.gz\n`);
  }

  before(async () => {
    root = tmp();
    release('latest/download');
    release('download/v1.2.3');
    release('download/v9.9.9', { checksum: 'f'.repeat(64) }); // a release whose archive does not match its checksum
    server = createServer((req, res) => {
      requests.push(req.url);
      const file = join(root, decodeURIComponent(req.url.split('?')[0]));
      if (!file.startsWith(root) || !existsSync(file)) {
        res.writeHead(404).end('not found');
        return;
      }
      res.writeHead(200).end(readFileSync(file));
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
  });
  after(() => server.close());

  const env = (extra = {}) => ({
    PATH: process.env.PATH,
    HOME: tmp(),
    VOIDABLE_RELEASES_URL: base,
    VOIDABLE_OS: 'linux',
    VOIDABLE_ARCH: 'x86_64',
    ...extra,
  });
  const install = (args, e) => run('sh', [INSTALL, ...args], { env: e }).then(
    (r) => ({ code: 0, ...r }),
    (err) => ({ code: err.code, stdout: err.stdout, stderr: err.stderr }),
  );

  test('installs the latest release into ~/.local/bin and says what it did', async () => {
    const e = env();
    const r = await install([], e);
    assert.equal(r.code, 0, r.stderr);
    const bin = join(e.HOME, '.local', 'bin', 'voidable');
    assert.equal(readFileSync(bin, 'utf8'), FAKE);
    assert.match(r.stdout, /Downloading voidable_linux_amd64\.tar\.gz from the latest release \(linux\/amd64\)/);
    assert.match(r.stdout, /Checksum verified/);
    assert.match(r.stdout, new RegExp(`Installed ${e.HOME}/.local/bin/voidable`));
    assert.match(r.stdout, /not on your PATH/);
    assert.ok(requests.includes('/latest/download/voidable_linux_amd64.tar.gz'));
  });

  test('installs a given version (with or without the v) into a given directory', async () => {
    const dir = join(tmp(), 'nested', 'bin');
    for (const v of ['1.2.3', 'v1.2.3']) {
      const r = await install(['--version', v, '--dir', dir], env());
      assert.equal(r.code, 0, r.stderr);
      assert.equal(readFileSync(join(dir, 'voidable'), 'utf8'), FAKE);
    }
    assert.ok(requests.includes('/download/v1.2.3/voidable_linux_amd64.tar.gz'));
    const r = await install([], env({ VOIDABLE_VERSION: '1.2.3', VOIDABLE_INSTALL_DIR: dir, PATH: `${dir}:${process.env.PATH}` }));
    assert.equal(r.code, 0, r.stderr);
    assert.doesNotMatch(r.stdout, /not on your PATH/);
  });

  test('a checksum mismatch fails and installs nothing', async () => {
    const dir = join(tmp(), 'bin');
    const r = await install(['--version', '9.9.9', '--dir', dir], env());
    assert.notEqual(r.code, 0);
    assert.match(r.stderr, /checksum mismatch for voidable_linux_amd64\.tar\.gz/);
    assert.match(r.stderr, /nothing was installed/);
    assert.equal(existsSync(join(dir, 'voidable')), false);
  });

  test('fails clearly on a missing release, an unsupported platform and a bad version', async () => {
    const dir = join(tmp(), 'bin');
    let r = await install(['--version', '0.0.1', '--dir', dir], env());
    assert.notEqual(r.code, 0);
    assert.match(r.stderr, /could not download/);
    r = await install(['--dir', dir], env({ VOIDABLE_ARCH: 'riscv64' }));
    assert.match(r.stderr, /unsupported CPU riscv64/);
    r = await install(['--dir', dir], env({ VOIDABLE_OS: 'FreeBSD' }));
    assert.match(r.stderr, /unsupported OS FreeBSD/);
    r = await install(['--version', 'latest', '--dir', dir], env());
    assert.match(r.stderr, /not a version/);
    assert.equal(existsSync(join(dir, 'voidable')), false);
  });

  test('is POSIX sh: runs under dash when it is installed', async (t) => {
    try {
      execFileSync('dash', ['-c', 'true']);
    } catch {
      t.skip('dash is not installed');
      return;
    }
    const dir = join(tmp(), 'bin');
    const r = await run('dash', [INSTALL, '--dir', dir], { env: env() });
    assert.match(r.stdout, /Installed/);
  });
});
