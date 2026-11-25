// SPDX-License-Identifier: MIT
// A local stand-in for the Messages API, for testing the harness without a
// key. It plays a scripted agent: look up the task's components (when a ref
// tool exists), check the solution (when a check tool exists), write the
// task's reference solution, then stop. Token counts are estimated from
// byte length and are NOT model numbers.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SOLUTIONS } from './paths.mjs';
import { FORMATS } from './formats.mjs';
import { CHECK_LANG } from './voidable.mjs';

export function solutionPath(task) {
  const file = task.file || FORMATS[task.format].file;
  const ext = file.replace(/^[^.]*/, '');
  return join(SOLUTIONS, `${task.id}${ext}`);
}

export function readSolution(task) {
  const p = solutionPath(task);
  if (!existsSync(p)) throw new Error(`no reference solution for ${task.id} at ${p}`);
  return readFileSync(p, 'utf8');
}

/**
 * @param {object} task
 * @param {{ solution?: string }} [opts] override the content the stub writes
 */
export function stubFetch(task, opts = {}) {
  let n = 0;
  return async (url, init = {}) => {
    const req = JSON.parse(String(init.body));
    const names = new Set((req.tools || []).map((t) => t.name));
    const turns = req.messages.filter((m) => m.role === 'assistant').length;
    const content = opts.solution ?? readSolution(task);
    const file = task.file || FORMATS[task.format].file;
    const plan = [];
    if (names.has('voidable_ref')) {
      plan.push(task.components.slice(0, 2).map((tag) => ({ name: 'voidable_ref', input: { tag } })));
    }
    if (names.has('voidable_check')) plan.push([{ name: 'voidable_check', input: { markup: content, lang: CHECK_LANG[task.format] } }]);
    plan.push([{ name: 'write_file', input: { path: file, content } }]);
    const step = plan[turns];
    const blocks = step
      ? step.map((c) => ({ type: 'tool_use', id: `toolu_stub_${++n}`, name: c.name, input: c.input }))
      : [{ type: 'text', text: 'Done.' }];
    const message = {
      id: `msg_stub_${n}_${turns}`,
      type: 'message',
      role: 'assistant',
      model: req.model,
      content: blocks,
      stop_reason: step ? 'tool_use' : 'end_turn',
      stop_sequence: null,
      usage: {
        input_tokens: Math.ceil(JSON.stringify(req).length / 4),
        output_tokens: Math.ceil(JSON.stringify(blocks).length / 4),
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      },
    };
    return new Response(JSON.stringify(message), { status: 200, headers: { 'content-type': 'application/json', 'request-id': `req_stub_${n}` } });
  };
}
