// SPDX-License-Identifier: MIT
// Run one agent attempt at one task under one condition, through the
// Anthropic TypeScript SDK's tool runner (client.beta.messages.toolRunner).
//
// Modes:
//   live    real API; needs ANTHROPIC_API_KEY. The exchange is recorded to a cassette.
//   replay  answers from a cassette recorded earlier (offline, free, exact).
//   stub    a local scripted agent (lib/stub.mjs); also recorded, so it can be replayed.
import Anthropic from '@anthropic-ai/sdk';
import { basename } from 'node:path';
import { buildContext, userMessage } from './conditions.mjs';
import { recordingFetch, replayFetch, saveCassette, loadCassette } from './cassette.mjs';
import { stubFetch } from './stub.mjs';
import { FORMATS } from './formats.mjs';

export const DEFAULT_MODEL = 'claude-haiku-5-5';
export const MODELS = ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5', 'claude-fable-5-2'];

/**
 * @param {object} o
 * @param {object} o.task
 * @param {string} o.condition
 * @param {string} [o.model]
 * @param {'live'|'replay'|'stub'} o.mode
 * @param {string} o.cassette path to write (live, stub) or read (replay)
 * @param {string} [o.effort] output_config.effort
 * @param {number} [o.maxIterations]
 * @param {object} [o.cache] shared context cache (index, skill)
 * @param {object} [o.stubOptions]
 */
export async function runAgent(o) {
  const model = o.model || DEFAULT_MODEL;
  const ws = { files: {}, log: [] };
  const { system, tools } = buildContext(o.condition, o.task, ws, o.cache);
  const entries = [];
  let fetchImpl;
  let apiKey = 'offline';
  if (o.mode === 'live') {
    apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('live mode needs ANTHROPIC_API_KEY in the environment');
    fetchImpl = recordingFetch(globalThis.fetch, entries);
  } else if (o.mode === 'replay') {
    fetchImpl = replayFetch(loadCassette(o.cassette).entries);
  } else if (o.mode === 'stub') {
    fetchImpl = recordingFetch(stubFetch(o.task, o.stubOptions), entries);
  } else {
    throw new Error(`unknown mode ${o.mode}`);
  }
  // The key is passed explicitly so a stray local profile is never used, and
  // it is never written anywhere: cassettes keep request bodies, not headers.
  const client = new Anthropic({ apiKey, fetch: fetchImpl, maxRetries: o.mode === 'live' ? 4 : 0 });

  const usage = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };
  let turns = 0;
  let toolCalls = 0;
  let stopReason = null;
  let error = null;
  const started = Date.now();
  try {
    const runner = client.beta.messages.toolRunner({
      model,
      max_tokens: 16000,
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      tools,
      messages: [{ role: 'user', content: userMessage(o.task) }],
      output_config: { effort: o.effort || 'medium' },
      max_iterations: o.maxIterations || 24,
      thread: false,
    });
    for await (const message of runner) {
      turns++;
      for (const k of Object.keys(usage)) usage[k] += message.usage?.[k] || 0;
      toolCalls += message.content.filter((b) => b.type === 'tool_use').length;
      stopReason = message.stop_reason;
    }
  } catch (e) {
    // A fetch that throws (replay divergence) surfaces as a connection error; report its cause.
    const cause = e?.cause?.message ? ` (${e.cause.message})` : '';
    error = e instanceof Anthropic.APIError ? `API ${e.status ?? 'connection'}: ${e.message}${cause}` : String(e?.message || e) + cause;
  }
  if (o.mode !== 'replay' && o.cassette) {
    saveCassette(o.cassette, { task: o.task.id, condition: o.condition, model, mode: o.mode, effort: o.effort || 'medium' }, entries);
  }

  const want = o.task.file || FORMATS[o.task.format].file;
  const written = Object.keys(ws.files);
  const pick = written.find((p) => p === want) || written.find((p) => basename(p) === want) || written.at(-1);
  return {
    model,
    mode: o.mode,
    output: pick ? ws.files[pick] : null,
    outputPath: pick || null,
    pathMismatch: Boolean(pick && pick !== want),
    files: written,
    usage,
    turns,
    toolCalls,
    toolLog: ws.log,
    stopReason,
    error,
    ms: Date.now() - started,
  };
}
