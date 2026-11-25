// @vitest-environment happy-dom
// The real entry with the generated table (needs a prior build, like the
// autoloader test), and the guarantees around it: warns once per type and
// attribute, throws on request, takes its knowledge from the manifest, and the
// root entry never contains any of it.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { VoidDevError, check, configure, reset, settled, warnings, type DevWarning } from '../src/dev/index.js';
import { checkAttributes, checkEvent } from '../src/dev/rules.js';
import { table } from '../src/dev/table.generated.js';

const tick = () => new Promise<void>((r) => setTimeout(r, 0));
let seen: DevWarning[] = [];

beforeAll(() => {
  configure({ settleMs: 0, onWarning: (w) => seen.push(w) });
});

afterEach(() => {
  configure({ throw: false });
  document.body.innerHTML = '';
  seen = [];
  reset();
});

describe('@voidable/ui/dev', () => {
  it('warns about misuse in markup added after it started, once per element type and attribute', async () => {
    document.body.innerHTML = Array.from({ length: 50 }, () => '<void-button color="primary" tone="x"></void-button>').join('');
    await tick();
    expect(seen.map((w) => w.kind).sort()).toEqual(['invalid-value', 'unknown-attribute']);
    expect(seen.find((w) => w.kind === 'invalid-value')!.message).toMatch(/^\[voidable\] <void-button color="primary">: "primary" is not a valid value for color/);
  });

  it('reports again for a different attribute or element type', async () => {
    document.body.innerHTML = '<void-button color="primary"></void-button><void-badge color="primary"></void-badge><void-button size="huge"></void-button>';
    await tick();
    expect(seen.map((w) => `${w.tag}.${w.subject}`).sort()).toEqual(['void-badge.color', 'void-button.color', 'void-button.size']);
  });

  it('checks an attribute changed after insertion', async () => {
    document.body.innerHTML = '<void-button></void-button>';
    await tick();
    document.querySelector('void-button')!.setAttribute('disabled', 'false');
    await tick();
    expect(seen.map((w) => w.kind)).toEqual(['boolean-false']);
  });

  it('judges undefined tags and parents once the page has settled', async () => {
    document.body.innerHTML = '<void-buton></void-buton><void-select><void-option></void-option></void-select><void-tabs></void-tabs>';
    await settled();
    const by = Object.fromEntries(seen.map((w) => [w.kind === 'undefined-element' ? `${w.kind}:${w.tag}` : w.kind, w]));
    expect(by['undefined-element:void-buton'].message).toContain('Did you mean <void-button>?');
    expect(by['undefined-element:void-tabs'].message).toContain('@voidable/ui/components/tabs.js');
    expect(by['wrong-parent'].message).toContain('<void-multiselect> or <void-combobox>');
    expect(by['missing-child'].message).toContain('<void-tab-panel>');
  });

  it('warns about a listener for an event nothing dispatches', () => {
    document.body.innerHTML = '<void-input></void-input>';
    document.querySelector('void-input')!.addEventListener('void-chnage', () => {});
    document.addEventListener('void-change', () => {});
    expect(seen).toHaveLength(1);
    expect(seen[0].message).toContain('Did you mean "void-change"?');
  });

  it('throws instead of logging in throw mode, every time', async () => {
    document.body.innerHTML = '<void-button color="primary"></void-button>';
    await tick();
    configure({ throw: true });
    expect(() => check()).toThrow(VoidDevError);
    expect(() => check()).toThrow(/"primary" is not a valid value for color/);
    expect(() => document.addEventListener('void-nope', () => {})).toThrow(VoidDevError);
    configure({ throw: false });
    expect(check().filter((w) => w.kind === 'invalid-value')).toHaveLength(1);
  });

  it('check() lists every problem in a subtree, even ones already reported', () => {
    document.body.innerHTML = '<div id="r"><void-button color="primary"></void-button><void-button color="primary"></void-button></div>';
    const found = check(document.getElementById('r')!);
    expect(found.filter((w) => w.kind === 'invalid-value')).toHaveLength(2);
    expect(warnings().filter((w) => w.kind === 'invalid-value')).toHaveLength(1);
  });

  it('honours ignore options', async () => {
    configure({ ignoreAttributes: ['tone', /^foo-/], ignoreTags: ['void-badge'], ignoreEvents: ['void-mine'] });
    document.body.innerHTML = '<void-button tone="x" foo-bar="1"></void-button><void-badge color="primary"></void-badge>';
    document.addEventListener('void-mine', () => {});
    await tick();
    expect(seen).toEqual([]);
    configure({ ignoreAttributes: [], ignoreTags: [], ignoreEvents: [] });
  });
});

describe('the generated table', () => {
  it('flags none of the attributes the manifest declares', () => {
    for (const [tag, entry] of Object.entries(table)) {
      const el = document.createElement(tag);
      for (const [name, rule] of Object.entries(entry.a)) {
        el.setAttribute(name, Array.isArray(rule) ? String(rule[rule.length - 1]) : rule === 3 ? '3' : '');
      }
      for (const name of entry.h ?? []) el.setAttribute(name, '');
      for (const w of checkAttributes(table, el)) throw new Error(`${tag}: ${w.message}`);
    }
  });

  it('knows every event the manifest declares, so no real listener is reported', () => {
    for (const entry of Object.values(table)) {
      for (const name of entry.e) expect(checkEvent(table, document, name), name).toBeUndefined();
    }
  });

  it('carries the parents, required children and hints from the manifest, not from a list in the dev entry', () => {
    expect(table['void-option'].p).toEqual(['void-multiselect', 'void-combobox']);
    expect(table['void-tabs'].r).toEqual(['void-tab-panel']);
    expect(table['void-input'].x?.label).toContain('void-field');
    expect(table['void-file-upload'].h).toContain('dragging');
    expect(table['void-carousel-slide'].h).toContain('active');
    expect(table['void-button'].a.color).toContain('error');
    const manifest = JSON.parse(readFileSync(resolve(__dirname, '../dist/custom-elements.json'), 'utf8'));
    const decl = manifest.modules.flatMap((m: { declarations?: { tagName?: string }[] }) => m.declarations ?? []).find((d: { tagName?: string }) => d.tagName === 'void-option');
    expect(decl.voidParents).toEqual(table['void-option'].p);
  });

  it('marks default-true booleans that read "false" as accepting it', () => {
    const accepting = Object.entries(table).flatMap(([tag, e]) => Object.entries(e.a).filter(([, r]) => r === 2).map(([n]) => `${tag}.${n}`));
    expect(accepting.length).toBeGreaterThan(0);
    for (const key of accepting) {
      const [tag, name] = key.split('.');
      const el = document.createElement(tag);
      el.setAttribute(name, 'false');
      expect(checkAttributes(table, el), key).toEqual([]);
    }
  });
});

describe('zero cost in production', () => {
  const dist = resolve(__dirname, '../dist');

  it('nothing under src imports the dev entry except the dev entry itself', () => {
    const src = resolve(__dirname, '../src');
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(resolve(dir, e.name)) : [resolve(dir, e.name)]));
    for (const file of walk(src).filter((f) => f.endsWith('.ts') && !f.includes('/dev/'))) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/from ['"][^'"]*\/dev\//);
    }
  });

  it.skipIf(!existsSync(resolve(dist, 'index.js')))('the built root entry does not reach the dev code or its table', () => {
    const seenFiles = new Set<string>();
    const walk = (file: string): void => {
      if (seenFiles.has(file)) return;
      seenFiles.add(file);
      const text = readFileSync(file, 'utf8');
      expect(text, file).not.toContain('[voidable]');
      for (const m of text.matchAll(/(?:from|import)\s*["'](\.[^"']+)["']/g)) walk(resolve(file, '..', m[1]));
    };
    walk(resolve(dist, 'index.js'));
    expect([...seenFiles].some((f) => /dev/.test(f.replace(dist, '')))).toBe(false);
  });
});
