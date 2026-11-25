// SPDX-License-Identifier: MIT
// Thin wrapper over the `voidable` binary (tools/voidable): the same ref,
// check, snippet and skill an agent gets from the CLI or `voidable mcp`.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { VOIDABLE_BIN } from './paths.mjs';

export function assertBinary() {
  if (!existsSync(VOIDABLE_BIN)) {
    throw new Error(`voidable binary not found at ${VOIDABLE_BIN}; run \`mise run evals:setup\` (or set VOIDABLE_BIN)`);
  }
}

function run(args, input) {
  assertBinary();
  const r = spawnSync(VOIDABLE_BIN, args, { input, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.error) throw r.error;
  return { code: r.status ?? 1, stdout: r.stdout, stderr: r.stderr };
}

/** `voidable ref` without a tag (the index) or with one. Unknown tags return the CLI's error text. */
export function ref(tag) {
  const r = run(tag ? ['ref', tag] : ['ref']);
  return r.code === 0 ? r.stdout : (r.stderr || r.stdout).trim();
}

/** Dialects `voidable check --lang` understands, by output format. */
export const CHECK_LANG = { html: 'html', react: 'jsx', svelte: 'svelte', vue: 'vue', erb: 'erb', heex: 'heex', blade: 'blade' };

/** `voidable check --format json` on a source string. Returns the findings array. */
export function check(source, lang, filename = 'input') {
  const r = run(['check', '--format', 'json', '--lang', lang, '-'], source);
  if (r.code > 1) throw new Error(`voidable check failed: ${r.stderr}`);
  const out = r.stdout.trim();
  const findings = out ? JSON.parse(out) : [];
  return findings.map((f) => ({ ...f, file: filename }));
}

/** The text form the MCP tool returns ("ok" or one problem per line). */
export function checkText(source, lang) {
  const r = run(['check', '--lang', lang, '-'], source);
  if (r.code > 1) return (r.stderr || r.stdout).trim();
  return r.code === 0 ? 'ok' : r.stdout.trim().replaceAll('<stdin>', 'input');
}

export function snippet(tag, lang = 'html') {
  const r = run(['gen', 'snippet', tag, '--lang', lang]);
  return r.code === 0 ? r.stdout : (r.stderr || r.stdout).trim();
}

export function version() {
  return execFileSync(VOIDABLE_BIN, ['--version'], { encoding: 'utf8' }).trim();
}

/** The generated Agent Skill as { 'SKILL.md': text, 'references/...': text }. */
export function skillFiles() {
  const dir = mkdtempSync(join(tmpdir(), 'voidable-skill-'));
  const target = join(dir, 'voidable');
  const r = run(['skill', 'install', '--dir', target]);
  if (r.code !== 0) throw new Error(`voidable skill install failed: ${r.stderr}`);
  const files = {};
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else files[relative(target, p).split('\\').join('/')] = readFileSync(p, 'utf8');
    }
  };
  walk(target);
  return files;
}
