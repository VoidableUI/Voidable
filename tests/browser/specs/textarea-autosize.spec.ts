// SPDX-License-Identifier: MIT
//
// void-textarea autosize (#101) in a real browser: the box is as tall as its text between `rows` and
// `max-rows` lines, then scrolls. Engines with `field-sizing: content` do it in CSS; the others measure
// in script. The same assertions run in all three, and one test records which engine took which path.
import { test, expect, load, settle, type Page } from '../helpers/test';

async function mount(page: Page, html: string): Promise<void> {
  await page.evaluate(async (h) => {
    const d = document.createElement('div');
    d.id = 'case';
    d.style.cssText = 'width: 420px';
    d.innerHTML = h;
    document.body.append(d);
    await (window as any).__settle(d);
  }, html);
}

/** One measurement of the inner textarea of `sel`: its height, what n lines would be, and whether it scrolls. */
async function box(page: Page, sel: string): Promise<{ height: number; lh: number; chrome: number; scrolls: boolean }> {
  return page.locator(sel).evaluate((host) => {
    const ta = host.querySelector('textarea')!;
    const cs = getComputedStyle(ta);
    const chrome = ['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth'].reduce((n, k) => n + parseFloat((cs as any)[k]), 0);
    return { height: ta.getBoundingClientRect().height, lh: parseFloat(cs.lineHeight), chrome, scrolls: ta.scrollHeight > ta.clientHeight + 1 };
  });
}

const lines = (b: { lh: number; chrome: number }, n: number) => b.lh * n + b.chrome;
/** Heights within a pixel and a half of each other (the fallback rounds scrollHeight to whole pixels). */
const near = (a: number, b: number) => Math.abs(a - b) <= 1.5;

/** Waits until the box is `n` lines tall. */
async function expectLines(page: Page, sel: string, n: number): Promise<void> {
  await expect
    .poll(async () => {
      const b = await box(page, sel);
      return near(b.height, lines(b, n)) ? n : `${b.height} (${(b.height - b.chrome) / b.lh} lines)`;
    })
    .toBe(n);
}

const nativeSizing = (page: Page) => page.evaluate(() => CSS.supports('field-sizing', 'content'));

type Mode = 'css' | 'script';

/** `script` makes the component believe the browser cannot size to content, so the measured fallback runs in every engine. */
const forceScript = (page: Page) =>
  page.addInitScript(() => {
    const supports = CSS.supports.bind(CSS) as (...a: string[]) => boolean;
    CSS.supports = ((...a: string[]) => (a[0] === 'field-sizing' ? false : supports(...a))) as typeof CSS.supports;
  });

for (const mode of ['css', 'script'] as Mode[]) {
test.describe(`autosize (${mode})`, () => {
test.beforeEach(async ({ page }) => {
  if (mode === 'script') await forceScript(page);
  await load(page, '/blank');
});

test('records which engines size in CSS and which in script', async ({ page }, info) => {
  const native = await nativeSizing(page);
  if (mode === 'css') info.annotations.push({ type: 'field-sizing', description: `${info.project.name}: ${native ? 'CSS' : 'script fallback'}` });
  expect(native).toBe(mode === 'css' ? native : false);
  await mount(page, `<void-textarea id="t" aria-label="Notes" autosize rows="2"></void-textarea>`);
  // The sizer (and its observer) exist only where the browser cannot do it.
  await expect(page.locator('#t .void-textarea-sizer')).toHaveCount(native ? 0 : 1);
  const used = await page.locator('#t textarea').evaluate((ta) => getComputedStyle(ta).fieldSizing ?? 'unsupported');
  expect(native ? used === 'content' : used !== 'content').toBe(true);
});

test.describe('growing', () => {
  test('is `rows` lines when empty, the same height as a plain textarea with those rows, at every size', async ({ page }) => {
    for (const size of ['sm', 'md', 'lg']) {
      await mount(page, `
        <void-textarea id="a-${size}" aria-label="A" autosize rows="3" size="${size}"></void-textarea>
        <void-textarea id="p-${size}" aria-label="P" rows="3" size="${size}"></void-textarea>`);
      const auto = await box(page, `#a-${size}`);
      const plain = await box(page, `#p-${size}`);
      expect(near(auto.height, plain.height), `${size}: ${auto.height} vs ${plain.height}`).toBe(true);
    }
  });

  test('grows line by line while typing, stops at max-rows and scrolls, and shrinks on delete', async ({ page }) => {
    await mount(page, `<void-textarea id="t" aria-label="Notes" autosize rows="2" max-rows="5"></void-textarea>`);
    await expectLines(page, '#t', 2);
    await page.locator('#t textarea').click();
    await page.keyboard.type('one');
    await expectLines(page, '#t', 2);
    for (const n of [2, 3, 4, 5]) {
      await page.keyboard.press('Enter');
      await page.keyboard.type(`line ${n}`);
      await expectLines(page, '#t', n);
    }
    // Past five lines: at the maximum, scrolling.
    await expectLines(page, '#t', 5);
    for (let i = 0; i < 3; i++) await page.keyboard.press('Enter');
    await page.keyboard.type('more');
    await expectLines(page, '#t', 5);
    expect((await box(page, '#t')).scrolls).toBe(true);
    // Delete back down.
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await expectLines(page, '#t', 2);
    expect((await box(page, '#t')).scrolls).toBe(false);
  });

  test('without max-rows it keeps growing', async ({ page }) => {
    await mount(page, `<void-textarea id="t" aria-label="Notes" autosize rows="2"></void-textarea>`);
    await page.locator('#t textarea').click();
    for (let i = 0; i < 14; i++) await page.keyboard.press('Enter');
    await expectLines(page, '#t', 15);
    expect((await box(page, '#t')).scrolls).toBe(false);
  });

  test('max-rows below rows is treated as rows', async ({ page }) => {
    await mount(page, `<void-textarea id="t" aria-label="Notes" autosize rows="4" max-rows="2" value="1&#10;2&#10;3&#10;4&#10;5&#10;6"></void-textarea>`);
    await expectLines(page, '#t', 4);
  });

  test('a value set by property, and by attribute, resizes', async ({ page }) => {
    await mount(page, `<void-textarea id="t" aria-label="Notes" autosize rows="2" max-rows="6"></void-textarea>`);
    await page.locator('#t').evaluate((el: any) => (el.value = 'a\nb\nc\nd'));
    await expectLines(page, '#t', 4);
    await page.locator('#t').evaluate((el) => el.setAttribute('value', 'a\nb\nc\nd\ne\nf'));
    await expectLines(page, '#t', 6);
    await page.locator('#t').evaluate((el: any) => (el.value = ''));
    await expectLines(page, '#t', 2);
  });

  test('a server-rendered value is the right height as soon as the component is defined', async ({ page }) => {
    await mount(page, `<void-textarea id="t" aria-label="Notes" autosize rows="2" max-rows="8" value="1&#10;2&#10;3&#10;4&#10;5"></void-textarea>`);
    await expectLines(page, '#t', 5);
  });

  test('inside a void-field, with a label and an error', async ({ page }) => {
    await mount(page, `<void-field label="Notes" error="Too long"><void-textarea id="t" autosize rows="2" max-rows="4" value="1&#10;2&#10;3"></void-textarea></void-field>`);
    await expectLines(page, '#t', 3);
    await page.locator('#t').evaluate((el: any) => (el.value = '1\n2\n3\n4\n5\n6'));
    await expectLines(page, '#t', 4);
  });

  test('in right-to-left text', async ({ page }) => {
    await mount(page, `<div dir="rtl"><void-textarea id="t" aria-label="Notes" autosize rows="2" max-rows="5" value="1&#10;2&#10;3"></void-textarea></div>`);
    await expectLines(page, '#t', 3);
    await page.locator('#t textarea').click();
    await page.keyboard.press('Control+End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('x');
    await expectLines(page, '#t', 4);
  });

  test('a box hidden when its value was set has the right height when it is shown', async ({ page }) => {
    await mount(page, `<div id="wrap" style="display: none"><void-textarea id="t" aria-label="Notes" autosize rows="2" max-rows="8" value="1&#10;2&#10;3&#10;4&#10;5"></void-textarea></div>`);
    await page.locator('#t').evaluate((el: any) => (el.value = '1\n2\n3\n4\n5\n6'));
    await settle(page);
    await page.locator('#wrap').evaluate((el) => ((el as HTMLElement).style.display = ''));
    await expectLines(page, '#t', 6);
  });

  test('a dialog opens with the box at the right height', async ({ page }) => {
    await mount(page, `
      <void-dialog id="dlg">
        <void-dialog-title>Notes</void-dialog-title>
        <void-dialog-body><void-textarea id="t" aria-label="Notes" autosize rows="2" max-rows="8" value="1&#10;2&#10;3&#10;4"></void-textarea></void-dialog-body>
      </void-dialog>`);
    await page.locator('#t').evaluate((el: any) => (el.value = '1\n2\n3\n4\n5'));
    await page.locator('#dlg').evaluate((el: any) => (el.open = true));
    await expect(page.locator('#t textarea')).toBeVisible();
    await expectLines(page, '#t', 5);
  });

  test('a change in width rewraps the text and resizes the box', async ({ page }) => {
    const text = 'the quick brown fox jumps over the lazy dog '.repeat(6).trim();
    await mount(page, `<div id="wrap" style="width: 520px"><void-textarea id="t" aria-label="Notes" autosize rows="2" value="${text}"></void-textarea></div>`);
    const wide = await box(page, '#t');
    await page.locator('#wrap').evaluate((el) => ((el as HTMLElement).style.width = '180px'));
    await expect.poll(async () => (await box(page, '#t')).height).toBeGreaterThan(wide.height + wide.lh);
    const narrow = await box(page, '#t');
    // Each line the narrow box needs is shown: nothing scrolls.
    expect(narrow.scrolls).toBe(false);
    await page.locator('#wrap').evaluate((el) => ((el as HTMLElement).style.width = '520px'));
    await expect.poll(async () => near((await box(page, '#t')).height, wide.height)).toBe(true);
  });

  test('turning autosize off gives the box back its rows and its handle', async ({ page }) => {
    await mount(page, `<void-textarea id="t" aria-label="Notes" autosize rows="2" value="1&#10;2&#10;3&#10;4"></void-textarea>`);
    await expectLines(page, '#t', 4);
    await page.locator('#t').evaluate((el: any) => (el.autosize = false));
    await expectLines(page, '#t', 2);
    expect(await page.locator('#t textarea').evaluate((ta) => getComputedStyle(ta).resize)).toBe('vertical');
  });

  test('has no corner handle', async ({ page }) => {
    await mount(page, `<void-textarea id="t" aria-label="Notes" autosize resize="both"></void-textarea>`);
    expect(await page.locator('#t textarea').evaluate((ta) => getComputedStyle(ta).resize)).toBe('none');
  });
});

test.describe('cost when off', () => {
  async function countObservers(page: Page, html: string): Promise<number> {
    return page.evaluate(async (h) => {
      const Native = window.ResizeObserver;
      let made = 0;
      window.ResizeObserver = class extends Native {
        constructor(cb: ResizeObserverCallback) {
          super(cb);
          made++;
        }
      };
      const d = document.createElement('div');
      d.innerHTML = h;
      document.body.append(d);
      await (window as any).__settle(d);
      // Type into it: nothing may be created later either.
      const ta = d.querySelector('textarea')!;
      ta.focus();
      ta.value = 'a\nb\nc';
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      await (window as any).__settle(d);
      window.ResizeObserver = Native;
      return made;
    }, html);
  }

  test('a plain textarea creates no ResizeObserver', async ({ page }) => {
    expect(await countObservers(page, `<void-textarea aria-label="A" rows="4" max-rows="6" value="x"></void-textarea>`)).toBe(0);
  });

  test('an autosizing one creates none where CSS does it, and one where it does not', async ({ page }) => {
    const native = await nativeSizing(page);
    expect(await countObservers(page, `<void-textarea aria-label="A" autosize value="x"></void-textarea>`)).toBe(native ? 0 : 1);
  });
});

});
}

test.describe('before the component is defined', () => {
  test('the host reserves the text it will hold, and little moves when the script arrives', async ({ page }, info) => {
    await page.goto('/textarea-autosize-early');
    const measure = () =>
      page.evaluate(() => ({
        host: document.getElementById('t')!.getBoundingClientRect().height,
        below: document.getElementById('after')!.getBoundingClientRect().top,
      }));
    const before = await measure();
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const s = document.createElement('script');
          s.src = '/build/ui.js';
          s.onload = () => resolve();
          s.onerror = () => reject(new Error('ui.js'));
          document.head.append(s);
        }),
    );
    await page.waitForFunction(() => !!customElements.get('void-textarea') && !!document.querySelector('#t textarea'), undefined, { polling: 50 });
    await page.evaluate(() => (document.getElementById('t') as any).updateComplete);
    const after = await measure();
    const lh = await page.locator('#t textarea').evaluate((ta) => parseFloat(getComputedStyle(ta).lineHeight));
    info.annotations.push({ type: 'shift', description: `before ${before.below}px, after ${after.below}px (a line is ${lh}px)` });
    // Six lines of text are reserved, not the three rows of an empty box.
    expect(before.host).toBeGreaterThan(5 * lh);
    expect(Math.abs(after.below - before.below)).toBeLessThanOrEqual(lh);
  });
});

for (const mode of ['css', 'script'] as Mode[]) for (const engine of ['turbo', 'morphdom', 'alpine'] as const) {
  test.describe(`${engine} morph (${mode})`, () => {
    const render = (page: Page, html: string) => page.evaluate((h) => (window as any).__morph.render(h), html);
    const morph = (page: Page, html: string) => page.evaluate((h) => (window as any).__morph.morph(h), html);
    const markup = (value: string, rest = '') => `<form><void-textarea id="t" name="n" aria-label="Notes" autosize rows="2" max-rows="8" value="${value}" ${rest}></void-textarea></form>`;

    test.beforeEach(async ({ page }) => {
      if (mode === 'script') await forceScript(page);
      await load(page, `/morph-${engine}`);
    });

    test('a morph that changes the value resizes', async ({ page }) => {
      await render(page, markup('1&#10;2'));
      await expectLines(page, '#t', 2);
      await morph(page, markup('1&#10;2&#10;3&#10;4&#10;5'));
      await expectLines(page, '#t', 5);
      await morph(page, markup('1'));
      await expectLines(page, '#t', 2);
    });

    test('a morph that does not touch the value keeps the height and the caret', async ({ page }) => {
      await render(page, markup('1&#10;2'));
      await page.locator('#t textarea').click();
      await page.keyboard.press('Control+End');
      for (const t of ['a', 'b', 'c']) {
        await page.keyboard.press('Enter');
        await page.keyboard.type(t);
      }
      await expectLines(page, '#t', 5);
      const caret = await page.locator('#t textarea').evaluate((ta: HTMLTextAreaElement) => [ta.selectionStart, ta.value]);
      await morph(page, markup('1&#10;2', 'data-x="1"'));
      await settle(page);
      await expectLines(page, '#t', 5);
      expect(await page.locator('#t textarea').evaluate((ta: HTMLTextAreaElement) => [ta.selectionStart, ta.value, document.activeElement === ta])).toEqual([...caret, true]);
    });

    test('typing in progress is not disturbed by a morph that carries a different value', async ({ page }) => {
      await render(page, markup('1&#10;2'));
      await page.locator('#t textarea').click();
      await page.keyboard.press('Control+End');
      await page.keyboard.type('typed');
      await morph(page, markup('1&#10;2&#10;3&#10;4&#10;5&#10;6'));
      await settle(page);
      expect(await page.locator('#t textarea').inputValue()).toBe('1\n2typed');
      await page.keyboard.type('!');
      expect(await page.locator('#t textarea').inputValue()).toBe('1\n2typed!');
    });
  });
}
