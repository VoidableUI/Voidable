// SPDX-License-Identifier: MIT
//
// Merges screen-reader run files into docs/src/data/screen-reader-results.json,
// which the accessibility statement renders ("Last verified"). Usage:
//
//   mise run test:screen-readers:record -- <file-or-folder>...
//
// where each argument is a run file (VoiceOver-webkit.json, NVDA-chromium.json)
// or a folder to search for them: the folders of the artifacts downloaded from a
// run of the "Screen readers" workflow. A run replaces the earlier one for the
// same screen reader, browser and runner image; failed runs are recorded too,
// because the statement shows what the last run found, not only successes.
// The file is committed by a maintainer: nothing in CI writes to the repository.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const target = join(here, '..', '..', '..', 'docs', 'src', 'data', 'screen-reader-results.json');

const args = process.argv.slice(2);
if (!args.length) {
  console.error('usage: mise run test:screen-readers:record -- <run file or folder>...');
  process.exit(2);
}

function* runFiles(path) {
  const p = resolve(path);
  if (!existsSync(p)) throw new Error(`${path} does not exist`);
  if (statSync(p).isFile()) return yield p;
  for (const entry of readdirSync(p, { withFileTypes: true })) {
    const full = join(p, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'transcripts' || entry.name === 'node_modules') continue;
      yield* runFiles(full);
    } else if (/^(VoiceOver|NVDA)-[a-z]+\.json$/.test(entry.name)) yield full;
  }
}

const STATUSES = ['passed', 'flaky', 'failed', 'skipped'];
function validate(run, file) {
  const bad = (why) => {
    throw new Error(`${file}: ${why}`);
  };
  if (!['VoiceOver', 'NVDA'].includes(run.screenReader)) bad('screenReader must be VoiceOver or NVDA');
  for (const k of ['screenReaderVersion', 'browser', 'system', 'runnerImage', 'date', 'commit']) if (typeof run[k] !== 'string') bad(`${k} must be a string`);
  if (Number.isNaN(Date.parse(run.date))) bad('date is not a date');
  if (!Array.isArray(run.scenarios) || !run.scenarios.length) bad('no scenarios');
  for (const s of run.scenarios) if (typeof s.id !== 'string' || !STATUSES.includes(s.status)) bad(`bad scenario ${JSON.stringify(s)}`);
}

const existing = existsSync(target) ? JSON.parse(readFileSync(target, 'utf8')) : { runs: [] };
const key = (r) => [r.screenReader, r.browser, r.runnerImage.split(' ')[0]].join('|');
const byKey = new Map(existing.runs.map((r) => [key(r), r]));

let added = 0;
for (const arg of args) {
  for (const file of runFiles(arg)) {
    const run = JSON.parse(readFileSync(file, 'utf8'));
    validate(run, file);
    const before = byKey.get(key(run));
    if (!before || Date.parse(run.date) >= Date.parse(before.date)) {
      byKey.set(key(run), run);
      added++;
      console.log(`recorded ${run.screenReader} ${run.screenReaderVersion} in ${run.browser} on ${run.runnerImage}: ${run.counts.passed + run.counts.flaky} passed, ${run.counts.failed} failed`);
    }
  }
}
if (!added) {
  console.error('no run files found (looking for VoiceOver-<browser>.json and NVDA-<browser>.json)');
  process.exit(1);
}
const runs = [...byKey.values()].sort((a, b) => key(a).localeCompare(key(b)));
writeFileSync(target, JSON.stringify({ runs }, null, 2) + '\n');
console.log(`wrote ${target}`);
