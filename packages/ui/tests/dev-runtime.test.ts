// @vitest-environment happy-dom
// The real entry with the generated table (needs a prior build, like the
// autoloader test), and the guarantees around it: warns once per type and
// attribute, throws on request, takes its knowledge from the manifest, and the
// root entry never contains any of it.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { VoidDevError, check, configure, reset, settled, warnings, type DevWarning } from '../src/dev/index.js';
import { checkAttributes, checkEvent, checkParts } from '../src/dev/rules.js';
import { styled, table } from '../src/dev/table.generated.js';

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
    expect(by['wrong-parent'].message).toContain('<void-combobox-content> or <void-multiselect-content>');
    expect(by['missing-part'].message).toContain('<void-tabs-list>');
    expect(by['missing-part'].message).toContain('Correct markup:');
  });

  it('reports the implicit forms explicit parts replaced (#52), each with the correct markup', async () => {
    document.body.innerHTML =
      '<void-tabs value="a"><void-tab-panel tab="a" label="A">a</void-tab-panel></void-tabs>' +
      '<void-popover><void-button slot="trigger">Open</void-button><p>body</p></void-popover>' +
      '<void-dialog heading="Old"><p>body</p></void-dialog>';
    await settled();
    const kinds = seen.map((w) => `${w.kind}:${w.tag}`);
    expect(kinds).toContain('legacy-markup:void-tab-panel');
    expect(kinds).toContain('unknown-child:void-popover');
    expect(kinds).toContain('legacy-markup:void-dialog');
    const legacy = seen.find((w) => w.kind === 'legacy-markup' && w.tag === 'void-tab-panel')!;
    expect(legacy.message).toContain('<void-tabs-trigger value="a">');
    const stray = seen.find((w) => w.kind === 'unknown-child' && w.tag === 'void-popover')!;
    expect(stray.message).toContain('<void-popover-trigger>');
    expect(seen.find((w) => w.subject === 'heading')!.message).toContain('<void-dialog-title>');
  });

  it('reports the disclosure and notice forms parts replaced, each with the correct markup', async () => {
    document.body.innerHTML =
      '<void-collapsible heading="Old"><p>body</p></void-collapsible>' +
      '<void-panel label="Old"><p>body</p></void-panel>' +
      '<void-banner dismissable>text</void-banner>' +
      '<void-toast heading="Old" dismissable>text</void-toast>';
    await settled();
    const attr = (tag: string, name: string) => seen.find((w) => w.tag === tag && w.subject === name)!.message;
    expect(attr('void-collapsible', 'heading')).toContain('<void-collapsible-trigger>');
    expect(attr('void-panel', 'label')).toContain('<void-panel-title>');
    expect(attr('void-banner', 'dismissable')).toContain('<void-banner-close>');
    expect(attr('void-toast', 'heading')).toContain('<void-toast-title>');
    expect(attr('void-toast', 'dismissable')).toContain('<void-toast-close>');
    const missing = seen.filter((w) => w.kind === 'missing-part').map((w) => w.tag).sort();
    expect(missing).toEqual(expect.arrayContaining(['void-banner', 'void-collapsible', 'void-panel', 'void-toast']));
  });

  it('reports the old dismissible alert with the close part to write', async () => {
    document.body.innerHTML = '<void-alert dismissible><void-alert-description>text</void-alert-description></void-alert>';
    await settled();
    const warning = seen.find((w) => w.tag === 'void-alert' && w.subject === 'dismissible')!;
    expect(warning.message).toContain('<void-alert-close>');
    expect(warning.message).toContain('aria-label="Dismiss"');
  });

  it('accepts a fallback with no parts (its built-in default) and the parts written in order', async () => {
    document.body.innerHTML =
      '<void-error-fallback heading="Oops" retryable></void-error-fallback>' +
      '<void-banner><void-banner-description>d</void-banner-description><void-banner-close><button type="button" aria-label="Dismiss">x</button></void-banner-close></void-banner>';
    await settled();
    expect(seen.filter((w) => w.kind !== 'undefined-element' && (w.tag === 'void-error-fallback' || w.tag === 'void-banner'))).toEqual([]);
  });

  it('reports the picker forms before parts (#52): options straight in a combobox, options straight in a select', async () => {
    document.body.innerHTML =
      '<void-combobox name="c"><void-option value="a">A</void-option></void-combobox>' +
      '<void-select name="s"><option value="a">A</option></void-select>';
    await settled();
    const kinds = seen.map((w) => `${w.kind}:${w.tag}:${w.subject}`);
    expect(kinds).toContain('missing-part:void-combobox:void-combobox-content');
    expect(kinds).toContain('wrong-parent:void-option:void-combobox');
    expect(kinds).toContain('legacy-markup:void-select:select');
    expect(kinds).toContain('unknown-attribute:void-select:name');
    const legacy = seen.find((w) => w.kind === 'legacy-markup' && w.tag === 'void-select')!;
    expect(legacy.message).toContain('<void-select><select name="plan">');
    expect(seen.find((w) => w.tag === 'void-select' && w.subject === 'name')!.message).toContain('native <select>');
    expect(seen.find((w) => w.kind === 'missing-part' && w.tag === 'void-combobox')!.message).toContain('<void-combobox-content><void-option');
  });

  it('reports a part outside its parent, parts out of order and a trigger without one control', async () => {
    document.body.innerHTML =
      '<void-card><void-dialog-title>Stray</void-dialog-title><void-card-body>b</void-card-body></void-card>' +
      '<void-alert><void-alert-description>d</void-alert-description><void-alert-title>t</void-alert-title></void-alert>' +
      '<void-tooltip><void-tooltip-trigger>text only</void-tooltip-trigger><void-tooltip-content>hint</void-tooltip-content></void-tooltip>';
    await settled();
    const kinds = seen.map((w) => `${w.kind}:${w.tag}`);
    expect(kinds.some((k) => k.endsWith(':void-dialog-title'))).toBe(true);
    expect(kinds).toContain('part-misuse:void-alert');
    expect(seen.some((w) => w.tag === 'void-tooltip-trigger' || (w.tag === 'void-tooltip' && /one element/.test(w.message)))).toBe(true);
  });

  it('is silent about correct explicit-parts markup', async () => {
    document.body.innerHTML =
      '<void-dialog><void-dialog-title>T</void-dialog-title><void-dialog-description>D</void-dialog-description><void-dialog-actions><void-button>OK</void-button></void-dialog-actions></void-dialog>' +
      '<void-tabs value="a"><void-tabs-list><void-tabs-trigger value="a">A</void-tabs-trigger></void-tabs-list><void-tabs-content value="a">a</void-tabs-content></void-tabs>' +
      '<void-dropdown-menu><void-dropdown-menu-trigger><void-button>M</void-button></void-dropdown-menu-trigger><void-dropdown-menu-content><void-dropdown-menu-item>a</void-dropdown-menu-item><void-dropdown-menu-separator></void-dropdown-menu-separator></void-dropdown-menu-content></void-dropdown-menu>' +
      '<void-card><void-card-header><void-card-title>T</void-card-title></void-card-header><void-card-body>b</void-card-body></void-card>' +
      '<void-accordion><void-accordion-item><void-accordion-trigger>Q</void-accordion-trigger><void-accordion-content>A</void-accordion-content></void-accordion-item></void-accordion>' +
      '<void-breadcrumbs><void-breadcrumbs-list><void-breadcrumbs-item><a href="/">Home</a></void-breadcrumbs-item><void-breadcrumbs-item aria-current="page">Page</void-breadcrumbs-item></void-breadcrumbs-list></void-breadcrumbs>';
    await settled();
    expect(seen.filter((w) => w.kind !== 'undefined-element')).toEqual([]);
  });

  it('does not take what a picker renders beside its content part (between the projection markers) for a stray child', () => {
    document.body.innerHTML =
      '<void-combobox><!--void-projection--><input><span>error</span><!--/void-projection--><void-combobox-content><void-option value="a">A</void-option></void-combobox-content></void-combobox>' +
      '<void-multiselect><void-multiselect-content><void-option value="a">A</void-option></void-multiselect-content><!--void-projection--><div></div><!--/void-projection--></void-multiselect>';
    for (const el of Array.from(document.body.children)) expect(checkParts(table, el)).toEqual([]);
    document.body.innerHTML = '<void-combobox><input><void-combobox-content></void-combobox-content></void-combobox>';
    expect(checkParts(table, document.body.firstElementChild!).map((w) => w.kind)).toEqual(['unknown-child']);
  });

  it('reports breadcrumb items written without the list part, with the correct markup', async () => {
    document.body.innerHTML = '<void-breadcrumbs><void-breadcrumbs-item><a href="/">Home</a></void-breadcrumbs-item></void-breadcrumbs>';
    await settled();
    const missing = seen.find((w) => w.kind === 'missing-part' && w.tag === 'void-breadcrumbs')!;
    expect(missing.message).toContain('<void-breadcrumbs-list>');
    expect(missing.message).toContain('Correct markup:');
  });

  it('does not call a CSS-only pattern element unknown, and still reports a real typo', async () => {
    document.body.innerHTML =
      '<void-shell><void-page><void-page-head></void-page-head><void-figures><void-figure></void-figure></void-figures></void-page></void-shell><void-pag></void-pag>';
    await settled();
    expect(seen.filter((w) => w.kind === 'undefined-element').map((w) => w.tag)).toEqual(['void-pag']);
  });

  it('takes the styled list from the voidable supplement, the one place that declares it', () => {
    const rules = resolve(__dirname, '../../../tools/voidable/internal/infra/embedded/data/supplement/rules.json');
    const declared = (JSON.parse(readFileSync(rules, 'utf8')).styled as { tag: string }[]).map((s) => s.tag).sort();
    expect(declared.length).toBeGreaterThan(0);
    expect([...styled]).toEqual(declared);
    expect(styled.filter((t) => table[t])).toEqual([]);
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
        el.setAttribute(name, Array.isArray(rule) ? String(rule[rule.length - 1]) : rule === 2 ? '3' : '');
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
    expect(table['void-option'].p).toEqual(['void-combobox-content', 'void-multiselect-content']);
    expect(table['void-select'].v?.tag).toBe('select');
    expect(table['void-select'].x?.name).toContain('<select name=');
    expect(table['void-tabs'].q?.n.map((p) => p.t)).toEqual(['void-tabs-list', 'void-tabs-content']);
    expect(table['void-tabs-trigger'].c).toBe(1);
    expect(table['void-input'].x?.label).toContain('void-field');
    expect(table['void-file-upload'].h).toContain('dragging');
    expect(table['void-carousel-item'].a.active).toBeDefined();
    expect(table['void-button'].a.color).toContain('error');
    const manifest = JSON.parse(readFileSync(resolve(__dirname, '../dist/custom-elements.json'), 'utf8'));
    const decl = manifest.modules.flatMap((m: { declarations?: { tagName?: string }[] }) => m.declarations ?? []).find((d: { tagName?: string }) => d.tagName === 'void-option');
    expect(decl.voidParents).toEqual(table['void-option'].p);
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
