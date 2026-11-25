// SPDX-License-Identifier: MIT
// Loaded first on every eval page (classic script, before any module).
// Records what the page would send to a server, so assertions can check the
// payload without a backend:
//   - every form submission that passes validation: its FormData (files as
//     {name, size, type}); the navigation itself is cancelled
//   - every fetch() call: URL, method and body; answered with 200 {}
(() => {
  const rec = { submits: [], fetches: [], errors: [] };
  window.__eval = rec;
  const entries = (fd) => {
    const out = {};
    for (const [k, v] of fd.entries()) {
      const val = typeof v === 'string' ? v : { file: v.name, size: v.size, type: v.type };
      (out[k] ||= []).push(val);
    }
    return out;
  };
  window.__evalEntries = entries;
  document.addEventListener(
    'submit',
    (e) => {
      const form = e.target;
      let fields = {};
      try {
        fields = entries(new FormData(form, e.submitter || undefined));
      } catch (err) {
        rec.errors.push(String(err));
      }
      rec.submits.push({ action: form.getAttribute('action'), method: (form.getAttribute('method') || 'get').toLowerCase(), fields, at: Date.now() });
      e.preventDefault();
    },
    true,
  );
  const body = (b) => {
    if (b == null) return null;
    if (typeof b === 'string') {
      try {
        return JSON.parse(b);
      } catch {
        const p = new URLSearchParams(b);
        return [...p.keys()].length ? Object.fromEntries(p) : b;
      }
    }
    if (b instanceof FormData) return entries(b);
    if (b instanceof URLSearchParams) return Object.fromEntries(b);
    return String(b);
  };
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    rec.fetches.push({ url, method: (init.method || 'GET').toUpperCase(), body: body(init.body), at: Date.now() });
    return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
  };
})();
