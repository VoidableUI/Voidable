// SPDX-License-Identifier: MIT
// What a task's checks get as `t`: the Playwright page plus helpers that find
// things the way a user (or an agent driving a browser) does, by role, label
// and visible text, never by Voidable internals.

export class CheckError extends Error {}

export function fail(msg) {
  throw new CheckError(msg);
}

export function ok(cond, msg) {
  if (!cond) fail(msg);
}

const short = (v) => {
  const s = v instanceof RegExp ? String(v) : JSON.stringify(v);
  return s && s.length > 200 ? s.slice(0, 200) + '…' : s;
};

export class T {
  /** @param {import('playwright-core').Page} page */
  constructor(page, origin, ctx) {
    this.page = page;
    this.origin = origin;
    this.ctx = ctx; // { navigations: string[], notes: string[] }
    this.timeout = 4000;
  }

  note(msg) {
    if (!this.ctx.notes.includes(msg)) this.ctx.notes.push(msg);
  }

  role(role, opts) {
    return this.page.getByRole(role, opts);
  }
  label(text, opts) {
    return this.page.getByLabel(text, opts);
  }
  text(text, opts) {
    return this.page.getByText(text, opts);
  }

  /** Wait until the first match is visible; fail with `what` otherwise. */
  async visible(locator, what, timeout = this.timeout) {
    const shown = locator.filter({ visible: true }).first();
    try {
      await shown.waitFor({ state: 'visible', timeout });
    } catch {
      const n = await locator.count().catch(() => 0);
      fail(`${what}: ${n ? `${n} match(es) but none visible` : 'not found'}`);
    }
    return shown;
  }

  /** Wait until nothing matching is visible. */
  async hidden(locator, what, timeout = this.timeout) {
    const deadline = Date.now() + timeout;
    for (;;) {
      const n = await locator.count();
      let anyVisible = false;
      for (let i = 0; i < n; i++) if (await locator.nth(i).isVisible()) anyVisible = true;
      if (!anyVisible) return;
      if (Date.now() > deadline) fail(`${what}: still visible`);
      await this.page.waitForTimeout(100);
    }
  }

  async settle() {
    await this.page.evaluate(settleInPage);
  }

  /**
   * Type into the control a label names. If the labelled element is a host
   * that cannot be typed into, type into its first editable descendant and
   * note that the label points at a non-editable element.
   */
  async fill(labelText, value, opts = {}) {
    const el = await this.visible(this.label(labelText, opts), `field labelled ${short(labelText)}`);
    const editable = await el.evaluate((e) => e.matches('input, textarea, select, [contenteditable=""], [contenteditable=true]')).catch(() => false);
    try {
      if (!editable) throw new Error('not editable');
      await el.fill(value, { timeout: this.timeout });
    } catch {
      const inner = el.locator('input:not([type=hidden]), textarea, [contenteditable=""], [contenteditable=true]').first();
      if (!(await inner.count())) fail(`field labelled ${short(labelText)} cannot be typed into`);
      this.note(`label ${short(labelText)} names a non-editable element; typed into its inner control`);
      await inner.fill(value);
    }
    return el;
  }

  /**
   * Choose a date in the control a label names, the way a user would: type
   * it when the control takes typing (a native date or text input), else open
   * it and click the day in the calendar, paging months until it shows.
   * @param {string|RegExp} labelText
   * @param {string} iso YYYY-MM-DD
   */
  async pickDate(labelText, iso) {
    const el = await this.visible(this.label(labelText), `date field labelled ${short(labelText)}`);
    const [y, m, d] = iso.split('-').map(Number);
    const typed = await el.evaluate((e) => e instanceof HTMLInputElement && !e.readOnly && !e.disabled).catch(() => false);
    if (typed) {
      const type = await el.getAttribute('type');
      await el.fill(type === 'date' ? iso : `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}/${y}`);
      await el.press('Tab').catch(() => {});
      await this.settle();
      return;
    }
    await el.click();
    await this.settle();
    const day = new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const target = this.page.getByRole('button', { name: new RegExp(day.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) });
    for (let i = 0; i < 24; i++) {
      if (await target.first().isVisible().catch(() => false)) {
        await target.first().click();
        await this.settle();
        return;
      }
      const next = this.page.getByRole('button', { name: /next month/i });
      if (!(await next.first().isVisible().catch(() => false))) break;
      await next.first().click();
      await this.settle();
    }
    fail(`could not pick ${iso} in the date field labelled ${short(labelText)}`);
  }

  /**
   * Pick an option the way a user would, whatever the control: a native or
   * wrapped <select> (by label), a radio or segmented button (by name), or a
   * listbox/combobox (open it, then click the option).
   */
  async choose(labelText, optionText) {
    const name = typeof optionText === 'string' ? new RegExp(`^\\s*${optionText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i') : optionText;
    const labelled = this.label(labelText).first();
    if (await labelled.count()) {
      const tag = await labelled.evaluate((e) => e.localName).catch(() => '');
      if (tag === 'select') {
        await labelled.selectOption({ label: await this.optionLabel(labelled, name) });
        await this.settle();
        return;
      }
    }
    for (const role of ['radio', 'tab', 'button', 'option', 'menuitemradio']) {
      const el = this.role(role, { name });
      if (await el.first().isVisible().catch(() => false)) {
        await el.first().click();
        await this.settle();
        return;
      }
    }
    if (await labelled.count()) {
      await labelled.click();
      await this.settle();
      const opt = this.role('option', { name });
      await this.visible(opt, `option ${short(String(optionText))}`);
      await opt.first().click();
      await this.settle();
      return;
    }
    fail(`no control to choose ${short(String(optionText))} for ${short(String(labelText))}`);
  }

  async optionLabel(select, re) {
    const labels = await select.locator('option').allTextContents();
    const hit = labels.find((l) => re.test(l));
    if (!hit) fail(`no option matching ${re} (options: ${labels.join(', ')})`);
    return hit.trim();
  }

  /** A chart a user can identify by name that actually drew something. */
  async chart(name, what = `chart ${short(String(name))}`) {
    const byName = this.role('img', { name }).or(this.role('figure', { name })).or(this.role('region', { name }));
    let el = (await byName.first().isVisible().catch(() => false)) ? byName.first() : null;
    if (!el) {
      // A visible title next to the drawing also identifies it.
      const title = this.text(name).first();
      if (!(await title.isVisible().catch(() => false))) fail(`${what}: no element named or titled ${name}`);
      el = title.locator('xpath=ancestor-or-self::*[.//svg or .//canvas][1]');
      if (!(await el.count())) fail(`${what}: titled, but nothing drawn near the title`);
    }
    const drawn = await el.evaluate((e) => {
      const svg = e.matches('svg') ? e : e.querySelector('svg');
      const canvas = e.matches('canvas') ? e : e.querySelector('canvas');
      const box = (svg || canvas || e).getBoundingClientRect();
      const marks = svg ? svg.querySelectorAll('rect, path, circle, line, polyline, polygon').length : canvas ? 99 : 0;
      return { w: box.width, h: box.height, marks };
    });
    ok(drawn.w >= 100 && drawn.h >= 60, `${what} is ${Math.round(drawn.w)}x${Math.round(drawn.h)} px`);
    ok(drawn.marks >= 3, `${what} drew ${drawn.marks} shapes`);
  }

  /** Click something by role and accessible name. */
  async click(role, name, opts = {}) {
    const el = await this.visible(this.role(role, { name, ...opts }), `${role} ${short(String(name))}`);
    await el.click();
    await this.settle();
    return el;
  }

  /** The last recorded form submission or fetch body, normalised to { field: [values] }. */
  async submission(what = 'a submission', timeout = this.timeout) {
    const deadline = Date.now() + timeout;
    for (;;) {
      const rec = await this.page.evaluate(() => window.__eval && { submits: window.__eval.submits, fetches: window.__eval.fetches });
      const all = [
        ...(rec?.submits || []).map((s) => ({ ...s, kind: 'form' })),
        ...(rec?.fetches || []).filter((f) => f.body && typeof f.body === 'object').map((f) => ({ kind: 'fetch', action: f.url, method: f.method, at: f.at, fields: normalise(f.body) })),
      ].sort((a, b) => a.at - b.at);
      if (all.length) return all.at(-1);
      if (Date.now() > deadline) fail(`${what}: nothing was submitted`);
      await this.page.waitForTimeout(100);
    }
  }

  async submissionCount() {
    return this.page.evaluate(() => (window.__eval?.submits.length || 0) + (window.__eval?.fetches.filter((f) => f.body).length || 0));
  }

  /** Assert the submission has `name` equal to `expected` (string, RegExp or array). */
  field(sub, name, expected) {
    const got = sub.fields[name] ?? sub.fields[`${name}[]`];
    if (got === undefined) fail(`submission has no field ${name} (fields: ${Object.keys(sub.fields).join(', ') || 'none'})`);
    const vals = got.map((v) => (typeof v === 'object' && v ? v.file ?? JSON.stringify(v) : String(v)));
    if (expected === undefined) return vals;
    if (Array.isArray(expected)) {
      ok(JSON.stringify([...vals].sort()) === JSON.stringify([...expected].sort()), `field ${name} is ${short(vals)}, expected ${short(expected)}`);
    } else if (expected instanceof RegExp) {
      ok(vals.some((v) => expected.test(v)), `field ${name} is ${short(vals)}, expected ${expected}`);
    } else {
      ok(vals.includes(String(expected)), `field ${name} is ${short(vals)}, expected ${short(expected)}`);
    }
    return vals;
  }

  /** Navigations the page attempted (same-origin document requests). */
  navigations() {
    return this.ctx.navigations;
  }

  /** The accessible description of an element: aria-describedby targets and aria-description. */
  async description(locator) {
    return locator.evaluate((el) => {
      const ids = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      const err = (el.getAttribute('aria-errormessage') || '').split(/\s+/).filter(Boolean);
      const parts = [...ids, ...err].map((id) => el.ownerDocument.getElementById(id)?.textContent || '');
      parts.push(el.getAttribute('aria-description') || '');
      return parts.join(' ').replace(/\s+/g, ' ').trim();
    });
  }

  /** Computed background colour of the page (body, falling back to html). */
  async pageBackground() {
    return this.page.evaluate(() => {
      const bg = (e) => getComputedStyle(e).backgroundColor;
      const b = bg(document.body);
      const color = b && b !== 'rgba(0, 0, 0, 0)' && b !== 'transparent' ? b : bg(document.documentElement);
      // Normalise any CSS colour (oklch, color(), named) to rgb() through a canvas.
      const c = document.createElement('canvas').getContext('2d');
      c.fillStyle = color;
      c.fillRect(0, 0, 1, 1);
      const [r, g, bl, a] = c.getImageData(0, 0, 1, 1).data;
      return a === 0 ? 'rgb(255, 255, 255)' : `rgb(${r}, ${g}, ${bl})`;
    });
  }
}

function normalise(body) {
  const out = {};
  const walk = (obj, prefix) => {
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}[${k}]` : k;
      if (Array.isArray(v)) out[key] = v.map((x) => (typeof x === 'object' && x && !('file' in x) ? JSON.stringify(x) : x));
      else if (v && typeof v === 'object' && !('file' in v)) {
        walk(v, key);
        out[k] ??= [JSON.stringify(v)];
      } else out[key] = [v === null ? '' : typeof v === 'object' ? v : String(v)];
    }
  };
  walk(body, '');
  return out;
}

/** Runs in the page: wait for every void-* element to be defined and rendered. */
export async function settleInPage() {
  const all = [...document.querySelectorAll('*')];
  const tags = [...new Set(all.map((e) => e.localName).filter((n) => n.startsWith('void-')))];
  await Promise.race([Promise.all(tags.map((t) => customElements.whenDefined(t))), new Promise((r) => setTimeout(r, 1500))]);
  await Promise.race([
    Promise.all(document.querySelectorAll('*').length ? [...document.querySelectorAll('*')].filter((e) => e.updateComplete).map((e) => e.updateComplete) : []),
    new Promise((r) => setTimeout(r, 1500)),
  ]);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
}
