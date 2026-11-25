// SPDX-License-Identifier: MIT
//
// Loaded first by every test page. Records uncaught errors and exposes
// readiness helpers so tests wait on the components, never on a clock.
(() => {
  const errors = (window.__errors = []);
  addEventListener('error', (e) => errors.push(String(e.message || e.error)));
  addEventListener('unhandledrejection', (e) => errors.push('unhandled rejection: ' + String(e.reason)));

  const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  /**
   * Resolves once every Lit element under `root` has finished updating
   * (repeated, because one update can schedule another), any chart or gauge
   * has finished drawing in, and two frames have been painted.
   */
  window.__settle = async (root = document) => {
    for (let round = 0; round < 6; round++) {
      const pending = [...root.querySelectorAll('*')].filter((el) => el.updateComplete && el.isUpdatePending);
      if (!pending.length && round > 0) break;
      await Promise.all([...root.querySelectorAll('*')].filter((el) => el.updateComplete).map((el) => el.updateComplete));
      await Promise.resolve();
    }
    // Charts and gauges draw in over ~700 ms and show intermediate values; wait for them to arrive.
    const drawing = () => [...root.querySelectorAll('*')].some((el) => el._phase === 'pre' || el._phase === 'animating');
    for (let i = 0; i < 120 && drawing(); i++) await frame();
    await frame();
  };
  window.__frame = frame;

  // Colour maths on rendered styles, for specs/theme.spec.ts.
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const cx = canvas.getContext('2d', { willReadFrequently: true });
  /** Any CSS colour (including color-mix and system colours) as [r, g, b, a]. */
  const rgba = (c) => {
    cx.clearRect(0, 0, 1, 1);
    cx.fillStyle = '#000';
    cx.fillStyle = c;
    cx.fillRect(0, 0, 1, 1);
    const d = cx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  };
  const over = (f, b) => [0, 1, 2].map((i) => f[i] * f[3] + b[i] * (1 - f[3])).concat(1);
  /** The opaque colour painted behind `el`: its own and its ancestors' backgrounds composited. */
  const bgOf = (el) => {
    const chain = [];
    for (let e = el; e; e = e.parentElement) chain.push(rgba(getComputedStyle(e).backgroundColor));
    let c = [255, 255, 255, 1];
    for (const layer of chain.reverse()) c = over(layer, c);
    return c;
  };
  const lum = (c) => {
    const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  const ratio = (a, b) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
  };
  const hex = (c) => '#' + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  window.__color = { rgba, over, bgOf, lum, ratio, hex };

  /**
   * What a user would notice about every void-* element under `root`, in
   * document order: its tag, child and descendant counts, rendered size and
   * visible text. Two renders of the same markup must give the same list.
   * With { structureOnly: true } it leaves out size and uses all text, so
   * client state (which tab or option is selected) does not count.
   */
  window.__signature = (root = document.body, { structureOnly = false } = {}) =>
    [...root.querySelectorAll('*')]
      .filter((e) => e.tagName.startsWith('VOID-'))
      .map((e) => {
        const r = e.getBoundingClientRect();
        const text = ((structureOnly ? e.textContent : e.innerText) || '').replace(/\s+/g, ' ').trim().slice(0, 80);
        const size = structureOnly ? '' : ` ${Math.round(r.width)}x${Math.round(r.height)}`;
        // Descendant counts follow client state (a check mark appears when checked), so structureOnly leaves them out.
        const count = structureOnly ? `${e.children.length}` : `${e.children.length}/${e.querySelectorAll('*').length}`;
        return `${e.tagName.toLowerCase()} ${count}${size} "${text}"`;
      });
})();
