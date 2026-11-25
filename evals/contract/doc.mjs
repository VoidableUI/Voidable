// SPDX-License-Identifier: MIT
// Render contract/contract.mjs as evals/CONTRACT.md.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { EVALS } from '../lib/paths.mjs';
import { CONTRACT } from './contract.mjs';

const esc = (s) => String(s).replace(/\|/g, '\\|');

export function contractMarkdown() {
  const L = [
    '# Selector and state contract',
    '',
    '<!-- Generated from evals/contract/contract.mjs by `mise run evals -- contract`. Edit that file, not this one. -->',
    '',
    'How to find every Voidable element and read its state the way a user, an agent driving a browser, or a test does: by role, accessible name, attributes and `void-*` events, without calling component JavaScript. `evals/test/contract.test.mjs` checks this table against the Custom Elements Manifest (every element listed; every handle marked "reflected" is a reflected attribute) and in Chromium (every host role; one interaction per interactive element changes the listed attributes and fires its event). The agent evals write their checks against these handles.',
    '',
    '**Role** is the ARIA role on the element itself; "inner" means only a rendered descendant has one. **Gaps** are places where a test cannot find the element or observe its state reliably today. They are findings for the library, not workarounds.',
    '',
    '| Element | Role | Name from | State handles | Gaps |',
    '|---|---|---|---|---|',
  ];
  for (const [tag, c] of Object.entries(CONTRACT).sort(([a], [b]) => a.localeCompare(b))) {
    L.push(`| \`${tag}\` | ${c.role ?? '—'} | ${esc(c.name)} | ${c.state.map(esc).join('<br>') || '—'} | ${(c.gaps || []).map(esc).join('<br>') || '—'} |`);
  }
  const gaps = Object.entries(CONTRACT).flatMap(([tag, c]) => (c.gaps || []).map((g) => `- \`${tag}\`: ${g}`));
  L.push('', `## Gaps (${gaps.length})`, '', ...gaps, '');
  return L.join('\n');
}

export function writeContractDoc() {
  const p = join(EVALS, 'CONTRACT.md');
  writeFileSync(p, contractMarkdown());
  return p;
}
