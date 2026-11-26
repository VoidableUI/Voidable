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
import { DATA_ATTRIBUTES, VALUE_REFLECTION } from '../contract/value.mjs';
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

test('every element with a value follows the value reflection rule or is excluded with a reason', { skip: noManifest }, () => {
  const problems = [];
  const withValue = decls.filter((d) => (d.members || []).some((m) => m.kind === 'field' && m.name === 'value'));
  for (const d of withValue) {
    const rule = VALUE_REFLECTION[d.tagName];
    if (!rule) {
      problems.push(`${d.tagName}: has a value and no entry in evals/contract/value.mjs (reflect it, or exclude it with a reason)`);
      continue;
    }
    const field = d.members.find((m) => m.kind === 'field' && m.name === 'value');
    if (rule.excluded) {
      if (typeof rule.excluded !== 'string' || rule.excluded.length < 20) problems.push(`${d.tagName}: the exclusion needs a written reason`);
    } else if (!(field.reflects && field.attribute === 'value')) {
      problems.push(`${d.tagName}: value is not a reflected "value" attribute in the manifest`);
    }
  }
  const tags = new Set(decls.map((d) => d.tagName));
  for (const tag of Object.keys(VALUE_REFLECTION)) if (!tags.has(tag)) problems.push(`${tag}: in value.mjs but not in the manifest`);
  for (const [tag, rule] of Object.entries(VALUE_REFLECTION)) {
    if (rule.excluded) continue;
    for (const k of ['html', 'set', 'afterSet', 'write']) if (rule[k] === undefined) problems.push(`${tag}: value.mjs entry lacks ${k}`);
    if (rule.user && rule.afterUser === undefined) problems.push(`${tag}: value.mjs entry has user steps and no afterUser`);
  }
  assert.deepEqual(problems, []);
});

test('every element with a data field takes it as a JSON attribute that is not reflected (#71)', { skip: noManifest }, () => {
  const problems = [];
  const withData = decls.filter((d) => (d.members || []).some((m) => m.kind === 'field' && m.name === 'data'));
  for (const d of withData) {
    const rule = DATA_ATTRIBUTES[d.tagName];
    if (!rule) {
      problems.push(`${d.tagName}: has a data field and no entry in evals/contract/value.mjs (DATA_ATTRIBUTES)`);
      continue;
    }
    for (const name of rule.attributes) {
      if (!(d.attributes || []).some((a) => a.name === name)) problems.push(`${d.tagName}: the ${name} attribute is not in the manifest`);
      const field = (d.members || []).find((m) => m.kind === 'field' && m.name === name);
      if (!field || field.attribute !== name) problems.push(`${d.tagName}: ${name} is not backed by a ${name} attribute in the manifest`);
      else if (field.reflects) problems.push(`${d.tagName}: ${name} is reflected, and the named exception says it is not`);
    }
  }
  const tags = new Set(decls.map((d) => d.tagName));
  for (const tag of Object.keys(DATA_ATTRIBUTES)) if (!tags.has(tag)) problems.push(`${tag}: in DATA_ATTRIBUTES but not in the manifest`);
  assert.deepEqual(problems, []);
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
      // Capture phase: void-open and void-close do not bubble.
      if (ev) document.addEventListener(ev, (e) => window.__events.push(e.type), true);
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

// Value reflection (contract/value.mjs): after what a user does, after a property set and after an attribute
// write, `value` is the attribute and the property agrees; the sets fire no void-change.
async function steps(list) {
  for (const s of list) {
    if (s.fill) await page.getByLabel(s.fill.label).first().fill(s.fill.text);
    if (s.click) await page.getByRole(s.click.role, { name: s.click.name, exact: true }).first().click();
    if (s.clickOption) await page.getByRole('option', { name: s.clickOption }).first().click();
    if (s.press) await page.getByRole(s.press.role, { name: s.press.name, exact: true }).first().press(s.press.key);
    if (s.select) await page.getByLabel(s.select.label).first().selectOption(s.select.value);
    if (s.type) {
      await page.getByLabel(s.type.label, { exact: true }).first().focus();
      await page.keyboard.type(s.type.text);
    }
    if (s.key) await page.keyboard.press(s.key);
  }
  await page.evaluate(settleInPage);
}

for (const [tag, rule] of Object.entries(VALUE_REFLECTION)) {
  if (rule.excluded) continue;
  test(`${tag}: value is reflected after ${rule.user ? 'a user change, ' : ''}a property set and an attribute write`, { skip: noBrowser }, async () => {
    await mount(rule.html);
    const host = page.locator(tag).first();
    const attr = () => host.getAttribute('value');
    if (rule.user) {
      await steps(rule.user);
      assert.equal(await attr(), rule.afterUser, `${tag}[value] after the user changed it`);
    }
    await page.evaluate(() => {
      window.__changes = 0;
      document.addEventListener('void-change', () => { window.__changes++; }, true);
    });
    await host.evaluate((el, v) => { el.value = v; }, rule.set);
    await page.evaluate(settleInPage);
    assert.equal(await attr(), rule.afterSet, `${tag}[value] after the property was set`);
    await host.evaluate((el, v) => el.setAttribute('value', v), rule.write.attribute);
    await page.evaluate(settleInPage);
    assert.deepEqual(await host.evaluate((el) => el.value), rule.write.property, `${tag}.value after the attribute was written`);
    assert.equal(await page.evaluate(() => window.__changes), 0, `${tag}: void-change fired for a property or attribute set`);
  });
  if (rule.secret) {
    test(`${tag}: a secret is not put in the value attribute`, { skip: noBrowser }, async () => {
      await mount(rule.secret.html);
      await steps(rule.secret.user);
      const value = await page.locator(tag).first().getAttribute('value');
      assert.ok(!(value ?? '').includes(rule.secret.text), `${tag}[value] holds the typed secret`);
      assert.equal(await page.locator(tag).first().evaluate((el) => el.value), rule.secret.text, `${tag}.value lost the typed secret`);
    });
  }
}

// Data from markup (contract/value.mjs, DATA_ATTRIBUTES): the JSON attribute draws the chart, and setting the
// property leaves the attribute as the server wrote it.
for (const [tag, rule] of Object.entries(DATA_ATTRIBUTES)) {
  test(`${tag}: ${rule.attributes.join(' and ')} drawn from the attribute, and not reflected from the property`, { skip: noBrowser }, async () => {
    await mount(rule.html);
    const host = page.locator(tag).first();
    assert.equal(await host.locator(rule.draws).count(), rule.count, `${tag}: ${rule.draws} drawn from the attribute`);
    const before = await host.evaluate((el, names) => names.map((n) => el.getAttribute(n)), rule.attributes);
    assert.ok(before.every((v) => v !== null), `${tag}: the markup carries the attributes`);
    await host.evaluate((el, v) => { el.data = v; }, rule.set);
    await page.evaluate(settleInPage);
    assert.deepEqual(await host.evaluate((el, names) => names.map((n) => el.getAttribute(n)), rule.attributes), before, `${tag}: the property set rewrote an attribute`);
    assert.notEqual(await host.locator(rule.draws).count(), rule.count, `${tag}: the property set did not redraw`);
  });
}
