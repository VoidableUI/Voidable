// @vitest-environment happy-dom
//
// Every boolean property that defaults to true accepts ="false" from markup
// (a plain Lit Boolean attribute can only say true). This table covers each
// one; the source scan below fails when a new default-true boolean is added
// without the defaultTrueBoolean converter.
import { describe, it, expect, afterEach } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import '../src/index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

const cases: Array<[tag: string, attribute: string, prop: string]> = [
  ['void-toast', 'dismissable', 'dismissable'],
  ['void-carousel', 'controls', 'controls'],
  ['void-carousel', 'indicators', 'indicators'],
  ['void-nav-bar', 'bordered', 'bordered'],
  ['void-gauge', 'show-value', 'showValue'],
  ['void-gauge', 'tick-min', 'tickMin'],
  ['void-gauge', 'tick-max', 'tickMax'],
  ['void-color-picker', 'show-input', 'showInput'],
  ['void-error-fallback', 'icon', 'icon'],
  ['void-dialog', 'closable', 'closable'],
  ['void-drawer', 'closable', 'closable'],
  ['void-input', 'spellcheck', 'spellcheck'],
  ['void-textarea', 'spellcheck', 'spellcheck'],
  ['void-action-input', 'spellcheck', 'spellcheck'],
];

describe.each(cases)('%s %s', (tag, attribute, prop) => {
  type El = HTMLElement & Record<string, unknown> & { updateComplete: Promise<unknown> };
  async function mount(attrs: string): Promise<El> {
    document.body.innerHTML = `<${tag} ${attrs}></${tag}>`;
    const el = document.body.firstElementChild as El;
    await el.updateComplete;
    return el;
  }

  it('defaults to true', async () => {
    expect((await mount(''))[prop]).toBe(true);
  });

  it('="false" in markup turns it off', async () => {
    expect((await mount(`${attribute}="false"`))[prop]).toBe(false);
  });

  it('a bare attribute and ="true" keep it on', async () => {
    expect((await mount(attribute))[prop]).toBe(true);
    expect((await mount(`${attribute}="true"`))[prop]).toBe(true);
  });

  it('follows the attribute when a server changes it', async () => {
    const el = await mount(`${attribute}="false"`);
    el.setAttribute(attribute, 'true');
    await el.updateComplete;
    expect(el[prop]).toBe(true);
    el.setAttribute(attribute, 'false');
    await el.updateComplete;
    expect(el[prop]).toBe(false);
  });
});

describe('default-true booleans in source', () => {
  it('every `@property` boolean that defaults to true uses defaultTrueBoolean', () => {
    const dir = join(__dirname, '..', 'src', 'components');
    const offenders: string[] = [];
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
      const src = readFileSync(join(dir, file), 'utf8');
      for (const m of src.matchAll(/@property\(\{([^}]*type: Boolean[^}]*)\}\)\s+(\w+)(?:: boolean)?\s*=\s*true\b/g)) {
        if (!m[1]!.includes('defaultTrueBoolean')) offenders.push(`${file}: ${m[2]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
