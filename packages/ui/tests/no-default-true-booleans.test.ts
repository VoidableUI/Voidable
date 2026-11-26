// @vitest-environment happy-dom
//
// No attribute defaults to true (#23): what is shown by default is turned off
// with a hide-* attribute, which works like every other boolean attribute (on
// when present). The source scan fails when a default-true boolean comes back.
import { describe, it, expect, afterEach } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import '../src/index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

const cases: Array<[tag: string, attribute: string, prop: string]> = [
  ['void-nav-bar', 'hide-border', 'hideBorder'],
  ['void-gauge', 'hide-value', 'hideValue'],
  ['void-gauge', 'hide-tick-min', 'hideTickMin'],
  ['void-gauge', 'hide-tick-max', 'hideTickMax'],
  ['void-color-picker', 'hide-input', 'hideInput'],
  ['void-error-fallback', 'hide-icon', 'hideIcon'],
  ['void-dialog', 'hide-close', 'hideClose'],
  ['void-drawer', 'hide-close', 'hideClose'],
];

describe.each(cases)('%s %s', (tag, attribute, prop) => {
  type El = HTMLElement & Record<string, unknown> & { updateComplete: Promise<unknown> };
  async function mount(attrs: string): Promise<El> {
    document.body.innerHTML = `<${tag} ${attrs}></${tag}>`;
    const el = document.body.firstElementChild as El;
    await el.updateComplete;
    return el;
  }

  it('defaults to false and writes no attribute', async () => {
    const el = await mount('');
    expect(el[prop]).toBe(false);
    expect(el.hasAttribute(attribute)).toBe(false);
  });

  it('is on when present, as any boolean attribute', async () => {
    expect((await mount(attribute))[prop]).toBe(true);
  });

  it('follows the attribute when a server adds or removes it', async () => {
    const el = await mount('');
    el.setAttribute(attribute, '');
    await el.updateComplete;
    expect(el[prop]).toBe(true);
    el.removeAttribute(attribute);
    await el.updateComplete;
    expect(el[prop]).toBe(false);
  });
});

describe.each(['void-dialog', 'void-drawer'])('%s hide-close', (tag) => {
  async function mount(html: string) {
    document.body.innerHTML = html;
    const el = document.body.firstElementChild as HTMLElement & { hideClose: boolean; open: boolean; updateComplete: Promise<unknown> };
    await el.updateComplete;
    return el;
  }
  const closeButton = (el: Element) => {
    const b = el.shadowRoot?.querySelector<HTMLElement>('button');
    return b && !b.hidden ? b : null;
  };

  it('removes the close button', async () => {
    expect(closeButton(await mount(`<${tag} open hide-close></${tag}>`))).toBeNull();
    expect(closeButton(await mount(`<${tag} open></${tag}>`))).not.toBeNull();
  });

  it('Escape does not close it', async () => {
    const el = await mount(`<${tag} open hide-close></${tag}>`);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await el.updateComplete;
    expect(el.open).toBe(true);
  });
});

describe('booleans in source', () => {
  it('no `@property` boolean defaults to true', () => {
    const dir = join(__dirname, '..', 'src');
    const offenders: string[] = [];
    const walk = (d: string): void => {
      for (const f of readdirSync(d, { withFileTypes: true })) {
        if (f.isDirectory()) walk(join(d, f.name));
        else if (f.name.endsWith('.ts')) {
          const src = readFileSync(join(d, f.name), 'utf8');
          for (const m of src.matchAll(/@property\(\{[^}]*type: Boolean[^}]*\}\)\s+(?:override\s+)?(\w+)(?:: boolean)?\s*=\s*true\b/g)) offenders.push(`${f.name}: ${m[1]}`);
        }
      }
    };
    walk(dir);
    expect(offenders).toEqual([]);
  });
});
