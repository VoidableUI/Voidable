// SPDX-License-Identifier: MIT
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { TASKS } from './paths.mjs';
import { FORMATS } from './formats.mjs';

/** The pilot: one task per kind of difficulty, across formats. */
export const PILOT = ['sign-in-html', 'confirm-dialog-html', 'data-table-react', 'tabs-heex', 'settings-erb'];

export async function loadTasks(ids) {
  const files = readdirSync(TASKS).filter((f) => f.endsWith('.mjs')).sort();
  const tasks = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(join(TASKS, f)).href);
    const task = mod.default;
    validate(task, f);
    tasks.push(task);
  }
  if (!ids || ids.length === 0) return tasks;
  const want = ids.flatMap((id) => (id === 'pilot' ? PILOT : [id]));
  const byId = new Map(tasks.map((t) => [t.id, t]));
  return want.map((id) => {
    const t = byId.get(id);
    if (!t) throw new Error(`unknown task ${id}`);
    return t;
  });
}

export function validate(task, file = task.id) {
  const need = ['id', 'title', 'format', 'components', 'prompt', 'checks'];
  for (const k of need) if (task[k] === undefined) throw new Error(`${file}: task is missing ${k}`);
  if (!FORMATS[task.format]) throw new Error(`${file}: unknown format ${task.format}`);
  if (`${task.id}.mjs` !== file && file.endsWith('.mjs')) throw new Error(`${file}: file name must be <id>.mjs`);
  const ids = new Set();
  for (const c of task.checks) {
    if (!c.id || !c.title || typeof c.run !== 'function') throw new Error(`${file}: every check needs id, title and run`);
    if (ids.has(c.id)) throw new Error(`${file}: duplicate check id ${c.id}`);
    if (['static', 'render', 'console', 'layout', 'a11y', 'wrote-file'].includes(c.id)) throw new Error(`${file}: check id ${c.id} is reserved`);
    ids.add(c.id);
  }
  if (/void-|voidable_|\bslot=/i.test(task.prompt)) throw new Error(`${file}: the prompt must not mention Voidable specifics`);
}
