// SPDX-License-Identifier: MIT
//
// void-select through server patches, in every order the frameworks produce,
// driven synchronously. The user picks an option; the server patches the page
// (the real adapters through morph-harness.js, or a patch of the native select
// alone, as LiveView applies a locked select or a script writes its options);
// the pre-morph hook's morphedCallback comes on time, late or never. At every
// point after the patch (in the same task, after a microtask, after a frame,
// after 200 ms, settled) the component's value, its attribute and the form data
// the browser builds must be the user's choice, or the server's where it sent
// a different one.
import { test, expect, load, type Page } from '../helpers/test';

const ENGINES = ['turbo', 'morphdom', 'alpine'] as const;

const PROMPT = '<option value="" disabled selected hidden>Choose</option>';
/** The lab form's options: the prompt marked `selected` (or `mark`), and an option whose text changes on every render. */
const options = (n: number, mark = '') =>
  (mark ? PROMPT.replace(' selected', '') : PROMPT) +
  ['nz', 'au', 'fj'].map((v) => `<option value="${v}"${v === mark ? ' selected' : ''}>${v === 'nz' ? `New Zealand (${n})` : v}</option>`).join('');
const select = (n: number, mark = '') => `<select name="country">${options(n, mark)}</select>`;
const page = (value: string | null, n: number, mark = '') =>
  `<form id="f"><void-select id="s"${value === null ? '' : ` value="${value}"`}>${select(n, mark)}</void-select><input name="other" value="x"></form>`;

type Patch = 'adapter' | 'native morphdom' | 'native innerHTML';
type Callback = 'on time' | 'late' | 'never';
interface Scenario {
  initial: string;
  /** The whole server render, for the adapters. */
  next: string;
  /** The server's select, for a patch of the native select alone. */
  nextSelect: string;
  patch: Patch;
  callback: Callback;
}
interface Seen {
  at: string;
  value: string;
  attr: string | null;
  native: string;
  submits: string[];
  other: string[];
}

/** Picks Australia, patches, and records the state at each point after the patch. */
function run(p: Page, s: Scenario): Promise<Seen[]> {
  return p.evaluate(async (s) => {
    const w = window as any;
    const root = document.getElementById('root')!;
    await w.__morph.render(s.initial);
    const host = document.getElementById('s') as any;
    const form = document.getElementById('f') as HTMLFormElement;
    const native = host.querySelector('select') as HTMLSelectElement;
    native.value = 'au';
    native.dispatchEvent(new Event('input', { bubbles: true }));
    native.dispatchEvent(new Event('change', { bubbles: true }));
    await w.__settle(root);
    const proto = Object.getPrototypeOf(host);
    if (s.callback === 'late') host.morphedCallback = () => setTimeout(() => proto.morphedCallback.call(host), 200);
    if (s.callback === 'never') host.morphedCallback = () => {};
    const seen: any[] = [];
    const look = (at: string) => {
      const live = document.getElementById('s') as any;
      const nat = live.querySelector('select') as HTMLSelectElement;
      const before = nat.value;
      const data = new FormData(document.getElementById('f') as HTMLFormElement);
      seen.push({ at, value: live.value, attr: live.getAttribute('value'), native: before, submits: data.getAll('country'), other: data.getAll('other') });
    };
    if (s.patch === 'adapter') {
      w.__morph.morphNow(s.next);
    } else if (s.patch === 'native morphdom') {
      // LiveView applying a patch to a locked select: the select alone is morphed, no void-* hook runs.
      const t = document.createElement('div');
      t.innerHTML = s.nextSelect;
      w.morphdom(native, t.firstElementChild);
    } else {
      const t = document.createElement('div');
      t.innerHTML = s.nextSelect;
      native.innerHTML = t.firstElementChild!.innerHTML;
    }
    look('in the same task');
    await Promise.resolve();
    look('after a microtask');
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    look('after a frame');
    await new Promise((r) => setTimeout(r, 200));
    look('after 200 ms');
    await new Promise((r) => setTimeout(r, 100));
    await w.__settle(root);
    look('settled');
    void form;
    return seen;
  }, s);
}

const POINTS = ['in the same task', 'after a microtask', 'after a frame', 'after 200 ms', 'settled'];

/** Every point: the value and the form data are `value`; the native select shows it from the microtask on. */
function expectChoice(seen: Seen[], value: string) {
  expect(seen.map((s) => s.at)).toEqual(POINTS);
  for (const s of seen) {
    expect.soft({ at: s.at, value: s.value, attr: s.attr, submits: s.submits, other: s.other }).toEqual({
      at: s.at,
      value,
      // Lit reflects in the update after the change: from the microtask on.
      attr: s.at === 'in the same task' ? s.attr : value,
      submits: [value],
      other: ['x'],
    });
    if (s.at !== 'in the same task') expect.soft({ at: s.at, native: s.native }).toEqual({ at: s.at, native: value });
  }
}

for (const engine of ENGINES) {
  test.describe(`${engine}: the select through a patch`, () => {
    test.beforeEach(async ({ page: p }) => {
      await load(p, `/morph-${engine}`);
    });

    for (const callback of ['on time', 'late', 'never'] as Callback[]) {
      test(`the user's choice stays while the server leaves value as it was (morphedCallback ${callback})`, async ({ page: p }) => {
        const seen = await run(p, { initial: page('', 0), next: page('', 1), nextSelect: select(1), patch: 'adapter', callback });
        expectChoice(seen, 'au');
      });

      test(`the user's choice stays when the server echoes it as its value (morphedCallback ${callback})`, async ({ page: p }) => {
        const seen = await run(p, { initial: page('', 0), next: page('au', 1), nextSelect: select(1), patch: 'adapter', callback });
        expectChoice(seen, 'au');
      });

      test(`a value the server changes wins (morphedCallback ${callback})`, async ({ page: p }) => {
        const seen = await run(p, { initial: page('', 0), next: page('fj', 1), nextSelect: select(1), patch: 'adapter', callback });
        expectChoice(seen, 'fj');
      });

      test(`options the server marks selected win where it sends no value (morphedCallback ${callback})`, async ({ page: p }) => {
        const seen = await run(p, { initial: page(null, 0), next: page(null, 1, 'fj'), nextSelect: select(1, 'fj'), patch: 'adapter', callback });
        expectChoice(seen, 'fj');
      });
    }

    test('two patches in one task (a patch, then the patch that undoes a lock) keep the choice', async ({ page: p }) => {
      const seen = await p.evaluate(async ([a, b]) => {
        const w = window as any;
        await w.__morph.render(a);
        const host = document.getElementById('s') as any;
        const native = host.querySelector('select') as HTMLSelectElement;
        native.value = 'au';
        native.dispatchEvent(new Event('change', { bubbles: true }));
        await w.__settle(document.getElementById('root'));
        w.__morph.morphNow(b);
        w.__morph.morphNow(b);
        const out = [new FormData(document.getElementById('f') as HTMLFormElement).getAll('country')];
        await Promise.resolve();
        out.push(new FormData(document.getElementById('f') as HTMLFormElement).getAll('country'));
        await new Promise((r) => setTimeout(r, 250));
        await w.__settle(document.getElementById('root'));
        out.push(new FormData(document.getElementById('f') as HTMLFormElement).getAll('country'), [host.value, host.getAttribute('value'), native.value]);
        return out;
      }, [page('', 0), page('au', 1)]);
      expect(seen).toEqual([['au'], ['au'], ['au'], ['au', 'au', 'au']]);
    });
  });
}

test.describe('the native select patched with no hook at all', () => {
  test.beforeEach(async ({ page: p }) => {
    await load(p, '/morph-morphdom');
  });

  test('morphdom on the select alone (LiveView applying a locked select) keeps the choice', async ({ page: p }) => {
    expectChoice(await run(p, { initial: page('', 0), next: '', nextSelect: select(1), patch: 'native morphdom', callback: 'on time' }), 'au');
  });

  test('options written with innerHTML keep the choice', async ({ page: p }) => {
    expectChoice(await run(p, { initial: page('', 0), next: '', nextSelect: select(1), patch: 'native innerHTML', callback: 'on time' }), 'au');
  });

  test('options written with innerHTML that mark another option selected win', async ({ page: p }) => {
    expectChoice(await run(p, { initial: page(null, 0), next: '', nextSelect: select(1, 'fj'), patch: 'native innerHTML', callback: 'on time' }), 'fj');
  });

  test('a script that sets the native value without an event: the form sends it, and a later morph keeps it', async ({ page: p }) => {
    const seen = await p.evaluate(async ([a, b]) => {
      const w = window as any;
      await w.__morph.render(a);
      const host = document.getElementById('s') as any;
      const form = document.getElementById('f') as HTMLFormElement;
      const native = host.querySelector('select') as HTMLSelectElement;
      native.value = 'fj';
      const out: unknown[] = [new FormData(form).getAll('country')];
      w.__morph.morphNow(b);
      out.push(new FormData(form).getAll('country'));
      await w.__settle(document.getElementById('root'));
      out.push(host.value, native.value);
      return out;
    }, [page('', 0), page('', 1)]);
    expect(seen).toEqual([['fj'], ['fj'], 'fj', 'fj']);
  });
});
