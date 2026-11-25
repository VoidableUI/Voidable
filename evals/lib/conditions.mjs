// SPDX-License-Identifier: MIT
// Context conditions: what the agent knows about Voidable besides the task.
//
//   none   the package names only
//   ref    the `voidable ref` index in context plus a voidable_ref lookup tool
//   skill  the generated Agent Skill (SKILL.md) in context plus the tools an
//          agent with `voidable mcp` has: voidable_ref, voidable_check,
//          voidable_snippet, and reading the skill's reference files
//
// Every condition gets the same project description and the same write_file
// tool, so the only difference between conditions is Voidable knowledge.
import { betaTool } from '@anthropic-ai/sdk/helpers/beta/json-schema';
import * as voidable from './voidable.mjs';
import { FORMATS } from './formats.mjs';

export const CONDITIONS = ['none', 'ref', 'skill'];

export const CONDITION_LABELS = {
  none: '(a) package name only',
  ref: '(b) voidable ref index + lookup tool',
  skill: '(c) skill + ref/check/snippet tools (MCP equivalent)',
};

const BASE = `You are a coding agent working in an existing web application. Do the task the developer gives you.

The project's UI library is Void UI: the npm packages @voidable/ui (web components, the <void-*> elements) and @voidable/theme (its stylesheet).

Deliver your work by calling the write_file tool with the complete contents of the requested file. Write the whole file every time you call it; the last version written is the one that ships. When you are done, reply with one short sentence.`;

const SNIPPET_LANG = { html: 'html', react: 'jsx', svelte: 'html', vue: 'html', erb: 'erb', heex: 'heex', blade: 'html' };

/**
 * Build the system prompt and tools for one run.
 * @param {string} condition one of CONDITIONS
 * @param {object} task the task definition
 * @param {{files: Record<string,string>, log: Array<object>}} ws collects written files and tool calls
 * @param {{skill?: Record<string,string>, index?: string}} [cache] reused across runs
 */
export function buildContext(condition, task, ws, cache = {}) {
  if (!CONDITIONS.includes(condition)) throw new Error(`unknown condition ${condition}; expected ${CONDITIONS.join(', ')}`);
  const fmt = FORMATS[task.format];
  const parts = [BASE, `## Project\n\n${fmt.setup}`];
  const record = (name, input, output) => {
    ws.log.push({ tool: name, input, output: output.length > 4000 ? output.slice(0, 4000) + '…' : output });
    return output;
  };

  const tools = [
    betaTool({
      name: 'write_file',
      description: 'Write a file in the project. Pass the path relative to the project root and the complete file contents.',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Path relative to the project root.' },
          content: { type: 'string', description: 'Complete file contents.' },
        },
        required: ['path', 'content'],
        additionalProperties: false,
      },
      run: ({ path, content }) => {
        ws.files[path] = content;
        return record('write_file', { path, bytes: content.length }, `wrote ${content.length} bytes to ${path}`);
      },
    }),
  ];

  if (condition === 'ref' || condition === 'skill') {
    tools.push(
      betaTool({
        name: 'voidable_ref',
        description:
          'Reference for Void UI elements. Without tag: one line per element. With tag: attributes (types, allowed values, defaults), events with detail shapes, and an example.',
        inputSchema: {
          type: 'object',
          properties: { tag: { type: 'string', description: 'Element tag, e.g. void-select. Omit for the index.' } },
          additionalProperties: false,
        },
        run: ({ tag }) => record('voidable_ref', { tag }, voidable.ref(tag)),
      }),
    );
  }
  if (condition === 'ref') {
    cache.index ??= voidable.ref();
    parts.push(
      `## Void UI reference\n\nThis is the output of \`voidable ref\`, the library's element index. Call the voidable_ref tool with a tag for its attributes, events and an example.\n\n${cache.index}`,
    );
  }
  if (condition === 'skill') {
    cache.skill ??= voidable.skillFiles();
    const skill = cache.skill;
    const body = skill['SKILL.md'].replace(/^---[\s\S]*?---\n/, '');
    parts.push(
      `## Skill: voidable\n\nThe voidable skill is installed. Its SKILL.md follows; its reference files can be read with read_skill_file.\n\n${body}`,
    );
    tools.push(
      betaTool({
        name: 'voidable_check',
        description:
          'Validate markup that uses <void-*> elements: unknown elements/attributes, values outside the allowed set, boolean attributes set to "false", wrong parents. Returns one problem per line, or "ok".',
        inputSchema: {
          type: 'object',
          properties: {
            markup: { type: 'string', description: 'Source text to check.' },
            lang: { type: 'string', enum: Object.values(voidable.CHECK_LANG).filter((v, i, a) => a.indexOf(v) === i), description: 'Dialect of the markup (default html).' },
          },
          required: ['markup'],
          additionalProperties: false,
        },
        run: ({ markup, lang }) => record('voidable_check', { lang, bytes: markup.length }, voidable.checkText(markup, lang || 'html')),
      }),
      betaTool({
        name: 'voidable_snippet',
        description: 'Example usage of one element in html, jsx, heex (Phoenix function components) or erb (Rails + Stimulus).',
        inputSchema: {
          type: 'object',
          properties: {
            tag: { type: 'string', description: 'Element tag, e.g. void-dialog.' },
            lang: { type: 'string', enum: ['html', 'jsx', 'heex', 'erb'], description: 'Target language (default html).' },
          },
          required: ['tag'],
          additionalProperties: false,
        },
        run: ({ tag, lang }) => record('voidable_snippet', { tag, lang }, voidable.snippet(tag, lang || SNIPPET_LANG[task.format] || 'html')),
      }),
      betaTool({
        name: 'read_skill_file',
        description: 'Read a file of the voidable skill, e.g. references/wrong-usages.md or references/components/void-tabs.md.',
        inputSchema: {
          type: 'object',
          properties: { path: { type: 'string', description: 'Path inside the skill directory.' } },
          required: ['path'],
          additionalProperties: false,
        },
        run: ({ path }) => {
          const key = String(path).replace(/^\.?\/+/, '').replace(/^voidable\//, '');
          const out = skill[key] ?? `no such file: ${key}. Files: ${Object.keys(skill).filter((k) => !k.includes('/components/')).join(', ')}, references/components/<tag>.md`;
          return record('read_skill_file', { path: key }, out);
        },
      }),
    );
  }

  return { system: parts.join('\n\n'), tools };
}

/** The user message: the developer's request plus where the file goes. */
export function userMessage(task) {
  const fmt = FORMATS[task.format];
  return `${task.prompt.trim()}\n\nWrite it to \`${task.file || fmt.file}\`.`;
}
