// SPDX-License-Identifier: MIT
// Score every task's reference solution (solutions/<task>.<ext>) with the
// same scorer the agents get. A reference solution is what a careful author
// who knows the library writes, so:
//   - an assertion it fails is either a broken task or a library defect; the
//     report marks it "library-blocked" and leaves it out of the agent score
//   - a task whose solution passes everything proves its checks are passable
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { launch, startServer } from './browser.mjs';
import { CALIBRATION } from './paths.mjs';
import { scoreCase } from './score.mjs';
import { readSolution } from './stub.mjs';

export async function calibrate(tasks, { write = true, log = console.log } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'voidable-calibrate-'));
  const server = await startServer(root);
  const browser = await launch();
  const out = { generatedAt: new Date().toISOString(), tasks: {} };
  try {
    for (const task of tasks) {
      const s = await scoreCase({ task, source: readSolution(task), caseDir: join(root, task.id), casesRoot: root, server, browser });
      const failed = s.assertions.filter((a) => !a.pass);
      out.tasks[task.id] = {
        passed: s.passed,
        total: s.total,
        failed: Object.fromEntries(failed.map((a) => [a.id, a.detail])),
        findings: s.findings.map((f) => `${f.rule} ${f.tag}${f.attr ? ` ${f.attr}` : ''}`),
        axe: s.axe.filter((v) => v.impact === 'serious' || v.impact === 'critical').flatMap((v) => v.owners.map((o) => `${v.id}|${o}`)),
        notes: s.notes,
        usedTags: s.usedTags,
      };
      log(`${task.id}: ${s.passed}/${s.total}${failed.length ? `  FAILED ${failed.map((a) => `${a.id}: ${a.detail}`).join(' | ')}` : ''}${s.notes.length ? `  notes: ${s.notes.join('; ')}` : ''}`);
    }
  } finally {
    await browser.close();
    await server.close();
  }
  // axe violations on <void-*> elements in a reference solution are library
  // defects; agents are not scored on them (see report.mjs adjust()).
  out.libraryAxe = [...new Set(Object.values(out.tasks).flatMap((t) => t.axe.filter((k) => !k.endsWith('|null'))))].sort();
  if (write) writeFileSync(CALIBRATION, JSON.stringify(out, null, 2) + '\n');
  return out;
}
