// SPDX-License-Identifier: MIT
// Record and replay Messages API traffic through the SDK's `fetch` option.
//
// A cassette is the list of request bodies and responses of one agent run.
// Request headers are never stored (they carry the API key). Replaying a
// cassette drives the real SDK tool runner and the real tools, so a recorded
// run re-scores exactly, offline and free.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const KEEP_HEADERS = ['content-type', 'request-id'];

/** Wrap a fetch so every exchange is appended to `entries`. */
export function recordingFetch(inner, entries) {
  return async (url, init = {}) => {
    const res = await inner(url, init);
    const body = await res.clone().text();
    const headers = {};
    for (const h of KEEP_HEADERS) {
      const v = res.headers.get(h);
      if (v) headers[h] = v;
    }
    entries.push({
      path: new URL(String(url)).pathname,
      request: init.body ? JSON.parse(String(init.body)) : null,
      status: res.status,
      headers,
      body,
    });
    return res;
  };
}

/** A fetch that answers from `entries` in order and fails on anything unexpected. */
export function replayFetch(entries) {
  let i = 0;
  return async (url, init = {}) => {
    const path = new URL(String(url)).pathname;
    const e = entries[i++];
    if (!e) throw new Error(`cassette exhausted: request ${i} to ${path} was not recorded`);
    if (e.path !== path) throw new Error(`cassette mismatch at request ${i}: recorded ${e.path}, got ${path}`);
    const req = init.body ? JSON.parse(String(init.body)) : null;
    if (e.request && req && e.request.messages?.length !== req.messages?.length) {
      throw new Error(`cassette mismatch at request ${i}: recorded ${e.request.messages?.length} messages, got ${req.messages?.length}`);
    }
    return new Response(e.body, { status: e.status, headers: e.headers });
  };
}

export function saveCassette(file, meta, entries) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify({ meta, entries }, null, 1) + '\n');
}

export function loadCassette(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}
