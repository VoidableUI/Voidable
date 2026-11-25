// SPDX-License-Identifier: MIT
// Score one agent output functionally:
//
//   static     `voidable check` finds no problems (findings are kept by rule/tag/attr)
//   render     the template engine or bundler accepted the file
//   <task>     the task's own checks, in Chromium at 1280x800, by role/label/text
//   console    no console errors or uncaught exceptions while loading and using it
//   layout     nothing overflows horizontally at 390 px wide
//   a11y       axe-core (WCAG 2.x A/AA) reports no serious or critical violation
//
// A case passes when every assertion passes; its rate is passed/total.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative } from 'node:path';
import { check, CHECK_LANG } from './voidable.mjs';
import { render } from './render.mjs';
import { T, CheckError, settleInPage } from './expect.mjs';

const require = createRequire(import.meta.url);
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

/** Console noise that is about the harness, not the page. */
/** "Today" in every eval page. Task data and checks assume November 2026. */
export const FIXED_NOW = '2026-11-16T10:00:00';

const IGNORED_CONSOLE = [/favicon\.ico/, /net::ERR_BLOCKED_BY_CLIENT/, /Download the React DevTools/];

/**
 * @param {object} o
 * @param {object} o.task
 * @param {string|null} o.source the agent's file (null when it wrote nothing)
 * @param {string} o.caseDir directory under the server's cases root
 * @param {string} o.casesRoot
 * @param {{origin: string}} o.server
 * @param {import('playwright-core').Browser} o.browser
 */
export async function scoreCase(o) {
  const { task } = o;
  const assertions = [];
  const add = (id, kind, pass, detail = '') => assertions.push({ id, kind, pass, detail: String(detail).slice(0, 600) });
  const out = { assertions, findings: [], usedTags: [], render: null, console: [], axe: [], overflow: null, notes: [], navigations: [], external: [] };
  const checks = task.checks || [];

  if (o.source == null) {
    add('wrote-file', 'render', false, 'the agent did not write the file');
    for (const c of checks) add(c.id, 'functional', false, 'no output');
    for (const id of ['static', 'console', 'layout', 'a11y']) add(id, id === 'static' ? 'static' : id, false, 'no output');
    return finish(out);
  }

  out.findings = check(o.source, CHECK_LANG[task.format], task.file || 'output');
  add('static', 'static', out.findings.length === 0, out.findings.map((f) => `${f.rule} ${f.tag}${f.attr ? ` ${f.attr}` : ''}${f.value ? `=${f.value}` : ''}`).join('; '));

  out.render = await render(task, o.source, o.caseDir);
  add('render', 'render', out.render.ok, out.render.error || out.render.engine);
  if (!out.render.ok) {
    for (const c of checks) add(c.id, 'functional', false, 'did not render');
    for (const id of ['console', 'layout', 'a11y']) add(id, id, false, 'did not render');
    return finish(out);
  }

  const url = `${o.server.origin}/case/${relative(o.casesRoot, o.caseDir).split('\\').join('/')}/index.html`;
  const consoleErrors = [];

  const open = async (viewport) => {
    const context = await o.browser.newContext({ viewport, reducedMotion: 'reduce' });
    const page = await context.newPage();
    // A check that cannot find or click something should fail in seconds, not 30.
    page.setDefaultTimeout(5000);
    // A fixed "today" so date pickers and relative dates are deterministic.
    await page.clock.setFixedTime(new Date(FIXED_NOW));
    page.on('console', (m) => {
      if (m.type() === 'error' && !IGNORED_CONSOLE.some((r) => r.test(m.text()))) consoleErrors.push(m.text());
    });
    page.on('pageerror', (e) => consoleErrors.push(`uncaught: ${e.message}`));
    await page.route('**/*', async (route) => {
      const req = route.request();
      const u = new URL(req.url());
      if (u.origin !== o.server.origin) {
        out.external.push(req.url());
        return route.abort('blockedbyclient');
      }
      if (req.isNavigationRequest() && req.frame() === page.mainFrame() && req.url().split('#')[0] !== url) {
        out.navigations.push(u.pathname + u.search);
        return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>navigated</title><p>navigated</p>' });
      }
      return route.continue();
    });
    await page.goto(url, { waitUntil: 'load' });
    await page.evaluate(settleInPage);
    return { context, page };
  };

  // Functional checks at desktop size.
  {
    const { context, page } = await open({ width: 1280, height: 800 });
    out.usedTags = await page.evaluate(() => [...new Set([...document.querySelectorAll('*')].map((e) => e.localName).filter((n) => n.startsWith('void-')))].sort());
    const t = new T(page, o.server.origin, { navigations: out.navigations, notes: out.notes });
    for (const c of checks) {
      try {
        await c.run(t);
        add(c.id, 'functional', true, c.title);
      } catch (e) {
        const msg = e instanceof CheckError ? e.message : `${e.name}: ${(e.message || '').split('\n')[0]}`;
        add(c.id, 'functional', false, `${c.title}: ${msg}`);
      }
    }
    await context.close();
  }

  // Layout and accessibility on a fresh load at phone width.
  {
    const { context, page } = await open({ width: 390, height: 844 });
    out.overflow = await page.evaluate(() => {
      const w = window.innerWidth;
      const sw = document.documentElement.scrollWidth;
      const offenders = [];
      if (sw > w + 1) {
        for (const el of document.body.querySelectorAll('*')) {
          const r = el.getBoundingClientRect();
          if (r.right > w + 1 && r.width > 0 && ![...el.children].some((c) => c.getBoundingClientRect().right > w + 1)) {
            offenders.push(`<${el.localName}${el.id ? `#${el.id}` : ''}> right=${Math.round(r.right)} "${(el.textContent || '').trim().slice(0, 40)}"`);
            if (offenders.length >= 3) break;
          }
        }
      }
      return { width: w, scrollWidth: sw, offenders };
    });
    add('layout', 'layout', out.overflow.scrollWidth <= out.overflow.width + 1, out.overflow.scrollWidth > out.overflow.width + 1 ? `page is ${out.overflow.scrollWidth}px wide at ${out.overflow.width}px: ${out.overflow.offenders.join('; ')}` : '');
    await page.addScriptTag({ content: AXE });
    const axe = await page.evaluate(async () => {
      const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'], elementRef: true });
      // The nearest <void-*> element (self or ancestor) tells library defects from page defects.
      const owner = (el) => {
        for (let e = el; e; e = e.parentElement) if (e.localName?.startsWith('void-')) return e.localName;
        return null;
      };
      return r.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
        owners: [...new Set(v.nodes.map((n) => owner(n.element)))],
      }));
    });
    out.axe = axe;
    const serious = axe.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    add('a11y', 'a11y', serious.length === 0, serious.map((v) => `${v.id} (${v.impact}) ${v.nodes.join(', ')}`).join('; '));
    await context.close();
  }

  out.console = consoleErrors.slice(0, 20);
  add('console', 'console', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
  return finish(out);
}

function finish(out) {
  const passed = out.assertions.filter((a) => a.pass).length;
  out.passed = passed;
  out.total = out.assertions.length;
  out.rate = out.total ? passed / out.total : 0;
  out.pass = passed === out.total;
  return out;
}

export function caseDirFor(runDir, key) {
  return join(runDir, 'cases', key);
}
