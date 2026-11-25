// SPDX-License-Identifier: MIT
// The selector and state contract (contract/contract.mjs), tested two ways:
//   - against the Custom Elements Manifest: every element has an entry, and
//     every state handle marked "(reflected)" is a reflected attribute
//   - in Chromium: every host role is what the contract says, and each probe
//     (click, fill or property set) changes the attributes it lists and fires
//     its event; driven only through roles, labels, attributes and events
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CONTRACT } from '../contract/contract.mjs';
import { contractMarkdown } from '../contract/doc.mjs';
import { EVALS } from '../lib/paths.mjs';
import { ROOT } from '../lib/paths.mjs';
import { chromiumPath, launch, startServer } from '../lib/browser.mjs';
import { HEAD } from '../lib/render.mjs';
import { settleInPage } from '../lib/expect.mjs';

const manifestPath = join(ROOT, 'packages/ui/dist/custom-elements.json');
const noManifest = !existsSync(manifestPath) && 'needs the built @voidable/ui (mise run build)';
const decls = noManifest ? [] : JSON.parse(readFileSync(manifestPath, 'utf8')).modules.flatMap((m) => m.declarations || []).filter((d) => d.tagName);

test('every element in the manifest has a contract entry, and nothing else does', { skip: noManifest }, () => {
  const tags = decls.map((d) => d.tagName).sort();
  assert.deepEqual(Object.keys(CONTRACT).sort(), tags);
});

test('state handles marked (reflected) are reflected attributes in the manifest', { skip: noManifest }, () => {
  for (const d of decls) {
    const reflected = new Set((d.members || []).filter((m) => m.kind === 'field' && m.reflects && m.attribute).map((m) => m.attribute));
    for (const s of CONTRACT[d.tagName].state) {
      const m = s.match(/^([a-z-]+) \(reflected/);
      if (m) assert.ok(reflected.has(m[1]), `${d.tagName}: ${m[1]} is not a reflected attribute`);
    }
    const events = new Set((d.events || []).map((e) => e.name));
    const probe = CONTRACT[d.tagName].probe;
    if (probe?.event) assert.ok(events.has(probe.event) || decls.some((x) => (x.events || []).some((e) => e.name === probe.event)), `${d.tagName}: probe event ${probe.event} is not in the manifest`);
  }
});

test('CONTRACT.md is generated from contract.mjs (mise run evals -- contract)', () => {
  assert.equal(readFileSync(join(EVALS, 'CONTRACT.md'), 'utf8'), contractMarkdown());
});

const noBrowser = noManifest || (!chromiumPath() && 'needs Chromium (VOID_CHROMIUM_PATH or /usr/bin/chromium)');
let server, browser, page, root;
before(async () => {
  if (noBrowser) return;
  root = mkdtempSync(join(tmpdir(), 'evals-contract-'));
  server = await startServer(root);
  browser = await launch();
  page = await browser.newPage();
});
after(async () => {
  await browser?.close();
  await server?.close();
});

let n = 0;
async function mount(html) {
  const dir = join(root, `p${++n}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), `<!doctype html><html lang="en"><head>${HEAD}</head><body><main>${html}</main></body></html>`);
  await page.goto(`${server.origin}/case/p${n}/index.html`);
  await page.evaluate(settleInPage);
}

test('host roles match the contract', { skip: noBrowser }, async () => {
  const tags = Object.keys(CONTRACT);
  await mount(tags.map((t) => `<${t} data-probe="${t}">x</${t}>`).join('\n'));
  const roles = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-probe]')].map((e) => [e.dataset.probe, e.getAttribute('role')])));
  const wrong = [];
  for (const [tag, c] of Object.entries(CONTRACT)) {
    const want = c.role === 'inner' ? null : c.role;
    if (roles[tag] !== want) wrong.push(`${tag}: host role is ${roles[tag]}, contract says ${c.role}`);
  }
  assert.deepEqual(wrong, []);
});

for (const [tag, c] of Object.entries(CONTRACT)) {
  if (!c.probe) continue;
  test(`${tag}: ${c.state.join('; ')}`, { skip: noBrowser }, async () => {
    const p = c.probe;
    await mount(p.html);
    await page.evaluate((ev) => {
      window.__events = [];
      if (ev) document.addEventListener(ev, (e) => window.__events.push(e.type));
    }, p.event || null);
    const host = page.locator(tag).first();
    if (p.click) await page.getByRole(p.click.role, { name: p.click.name, exact: true }).first().click();
    if (p.fill) await page.getByLabel(p.fill.label).first().fill(p.fill.text);
    if (p.clickOption) await page.getByRole('option', { name: p.clickOption }).first().click();
    if (p.set) await host.evaluate((el, set) => Object.assign(el, set), p.set);
    await page.evaluate(settleInPage);
    for (const [attr, want] of Object.entries(p.expect?.host || {})) {
      assert.equal(await host.getAttribute(attr), want, `${tag}[${attr}]`);
    }
    for (const role of ['button', 'tab', 'radio']) {
      const spec = p.expect?.[role];
      if (!spec) continue;
      const el = page.getByRole(role, { name: spec.name, exact: true }).first();
      for (const [attr, want] of Object.entries(spec)) if (attr !== 'name') assert.equal(await el.getAttribute(attr), want, `${role} "${spec.name}" ${attr}`);
    }
    if (p.visible) assert.ok(await page.getByRole(p.visible.role, { name: p.visible.name }).first().isVisible(), `${p.visible.role} "${p.visible.name}" is not visible`);
    if (p.event) assert.ok((await page.evaluate(() => window.__events)).includes(p.event), `${p.event} did not fire`);
  });
}
