// SPDX-License-Identifier: MIT
// Render contract/contract.mjs as evals/CONTRACT.md.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { EVALS } from '../lib/paths.mjs';
import { CONTRACT } from './contract.mjs';
import { VALUE_REFLECTION } from './value.mjs';

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
  const entries = Object.entries(VALUE_REFLECTION).sort(([a], [b]) => a.localeCompare(b));
  const followed = entries.filter(([, v]) => !v.excluded);
  const typed = followed.filter(([, v]) => v.user).map(([t]) => `\`${t}\``);
  const scripted = followed.filter(([, v]) => !v.user).map(([t]) => `\`${t}\``);
  const secret = followed.filter(([, v]) => v.secret).map(([t]) => `\`${t}\``);
  L.push(
    '',
    '## Value reflection',
    '',
    'Every control with a `value` reflects it to the `value` attribute whenever it changes, whether the user changed it or a script set the property, and setting the attribute sets the property, so `[value="..."]` selectors, server-side assertions and an agent reading the DOM see the current value. A scalar is its string form; a list value (multiselect, checkbox group, tags input) is a JSON array (`value=\'["a","b"]\'`); a boolean-like state keeps its boolean attribute (`checked`, `open`, `pressed`). `void-change` does not fire for an attribute or property set. A control that wraps a native input keeps that input and the form value in step, and the form reset target stays the value the control started with. The rule is in `evals/contract/value.mjs`; the test fails for a control that has a `value` and neither follows it nor is excluded below.',
    '',
    `- Changed by a user step and by a property set, in Chromium (${typed.length}): ${typed.join(', ')}.`,
    `- Only a property and an attribute set, in Chromium (${scripted.length}): ${scripted.join(', ')}; their value is configuration or is set by script, not changed by the user.`,
    `- Withheld while it is a secret (${secret.length}): ${secret.join(', ')}. A \`type="password"\` field and a \`mask\`ed PIN input keep their text out of the attribute (readable by every script, devtools panel, DOM snapshot and session recorder); there the attribute stays the initial value.`,
    ...entries.filter(([, v]) => v.excluded).map(([t, v]) => `- Excluded, \`${t}\`: ${v.excluded}`),
  );
  L.push('', `## Gaps (${gaps.length})`, '', ...gaps, '');
  return L.join('\n');
}

export function writeContractDoc() {
  const p = join(EVALS, 'CONTRACT.md');
  writeFileSync(p, contractMarkdown());
  return p;
}
