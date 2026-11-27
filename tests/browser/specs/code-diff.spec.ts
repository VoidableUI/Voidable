// SPDX-License-Identifier: MIT
//
// void-code and void-diff (#109) in a real browser, on a page with a strict Content-Security-Policy
// (pages/code-diff.html: no inline styles, no inline scripts). The page has no component script: each
// test loads it, so the layout before and after the components are defined can be compared.
//
// What is asserted is what a user gets: the drawn boxes, the generated markers and numbers, keyboard
// scrolling, the clipboard, and what the accessibility tree says about inserted and removed text.
import { test, expect, settle, type Page } from '../helpers/test';

const WIDTH = 420;

/** Opens the page (theme only), sizes the cells through the CSSOM (the policy forbids style attributes) and records violations. */
async function open(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as any).__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => (window as any).__csp.push(`${e.violatedDirective}: ${e.blockedURI || e.sourceFile}`));
  });
  await page.goto('/code-diff');
  await page.waitForFunction(() => typeof (window as any).__settle === 'function', undefined, { polling: 50 });
  await page.evaluate((width) => {
    document.querySelector('main')!.style.padding = '16px';
    for (const cell of Array.from(document.querySelectorAll<HTMLElement>('.cell'))) {
      cell.style.width = `${width}px`;
      cell.style.marginBlockEnd = '16px';
    }
  }, WIDTH);
}

/** Defines the components (the bundle a page would load) and waits for them. */
async function upgrade(page: Page): Promise<void> {
  await page.addScriptTag({ url: '/build/ui.js' });
  await page.waitForFunction(() => !!customElements.get('void-code') && !!customElements.get('void-diff'), undefined, { polling: 50 });
  await settle(page);
}

async function ready(page: Page): Promise<void> {
  await open(page);
  await upgrade(page);
}

/** Rounded boxes of every element under `main` that has one, keyed by a path, to compare two moments. */
const boxes = (page: Page) =>
  page.evaluate(() => {
    const out: Record<string, number[]> = {};
    const all = Array.from(document.querySelectorAll('main *')).filter((el) => !el.hasAttribute('data-void-announcer'));
    all.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      out[`${i}:${el.localName}`] = [r.x, r.y, r.width, r.height].map((n) => Math.round(n * 10) / 10);
    });
    return out;
  });

/** The computed `content` of a pseudo-element. */
const content = (page: Page, selector: string, pseudo: '::before' | '::after') =>
  page.evaluate(([sel, which]) => getComputedStyle(document.querySelector(sel!)!, which).content, [selector, pseudo]);

test.describe('strict Content-Security-Policy', () => {
  test('the components upgrade, label and style themselves without a violation', async ({ page }) => {
    await ready(page);
    // What the components write goes through the CSSOM and attributes.
    expect(await page.evaluate(() => getComputedStyle(document.getElementById('diff')!).getPropertyValue('--_void-diff-added').trim())).toBe('"added"');
    await expect(page.locator('#code-short button')).toHaveAttribute('aria-label', 'Copy code');
    await expect.poll(() => page.locator('#code-plain pre').getAttribute('tabindex')).toBe('0');
    await expect.poll(() => page.locator('#diff').getAttribute('tabindex')).toBe('0');
    await page.locator('#code-short button').click();
    await expect(page.locator('#code-short void-code-copy')).toHaveAttribute('copied', '');
    await expect(page.locator('#code-short [data-void-announcer]')).toHaveText('Copied');
    expect(await page.evaluate(() => (window as any).__csp), 'no violation so far').toEqual([]);
    // And the policy is in force: an inline style attribute, which the components never need, is refused and reported.
    const applied = await page.evaluate(() => {
      const el = document.createElement('p');
      el.setAttribute('style', 'color: rgb(1, 2, 3)');
      document.body.append(el);
      const took = getComputedStyle(el).color === 'rgb(1, 2, 3)';
      el.remove();
      return took;
    });
    expect(applied, 'the policy blocks inline style attributes on this page').toBe(false);
    await expect.poll(() => page.evaluate(() => (window as any).__csp.length)).toBeGreaterThan(0);
  });

  test.use({ allowPageErrors: { value: true } });
});

test.describe('before and after the script', () => {
  test('nothing moves when the components are defined, and no node is moved or rewritten', async ({ page }) => {
    await open(page);
    const before = await boxes(page);
    const html = await page.evaluate(() => [document.getElementById('diff')!.innerHTML, document.querySelector('#code-lines pre')!.innerHTML]);
    await page.evaluate(() => {
      (window as any).__nodes = Array.from(document.querySelectorAll('main void-code *, main void-diff *'));
    });
    await upgrade(page);
    await expect.poll(() => page.locator('#diff').getAttribute('tabindex')).toBe('0');
    expect(await boxes(page)).toEqual(before);
    expect(await page.evaluate(() => [document.getElementById('diff')!.innerHTML.replace(/ id="void-diff-title-[a-z0-9]+"/, ''), document.querySelector('#code-lines pre')!.innerHTML])).toEqual(html);
    const kept = await page.evaluate(() => {
      const now = Array.from(document.querySelectorAll('main void-code *, main void-diff *')).filter((el) => !el.hasAttribute('data-void-announcer'));
      const was = (window as any).__nodes as Element[];
      return now.length === was.length && now.every((el, i) => el === was[i]);
    });
    expect(kept, 'the same nodes, in the same order').toBe(true);
  });
});

test.describe('code block', () => {
  test.beforeEach(async ({ page }) => {
    await ready(page);
  });

  test('is monospace, keeps white space and scrolls sideways inside its box', async ({ page }) => {
    const m = await page.locator('#code-plain').evaluate((host) => {
      const pre = host.querySelector('pre')!;
      const cs = getComputedStyle(pre);
      const probe = (text: string) => {
        const s = document.createElement('span');
        s.textContent = text;
        pre.querySelector('code')!.append(s);
        const w = s.getBoundingClientRect().width;
        s.remove();
        return w;
      };
      return {
        mono: Math.abs(probe('iiiiiiii') - probe('MMMMMMMM')) < 0.5,
        whiteSpace: cs.whiteSpace,
        overflowX: cs.overflowX,
        scrolls: pre.scrollWidth > pre.clientWidth + 1,
        hostWidth: host.getBoundingClientRect().width,
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        direction: cs.direction,
      };
    });
    expect(m.mono, 'every glyph is as wide as every other').toBe(true);
    expect(m.whiteSpace.startsWith('pre')).toBe(true);
    expect(m.overflowX).toBe('auto');
    expect(m.scrolls).toBe(true);
    expect(m.hostWidth).toBeCloseTo(WIDTH, 0);
    expect(m.pageOverflow, 'the page itself does not scroll sideways').toBe(false);
  });

  test('lines stack one per row, an empty line is a line tall, and white space between line elements draws nothing', async ({ page }) => {
    const m = await page.locator('#code-lines').evaluate((host) => {
      const code = host.querySelector('code')!;
      const lines = Array.from(host.querySelectorAll('void-code-line')).map((l) => l.getBoundingClientRect());
      const lh = parseFloat(getComputedStyle(host.querySelector('void-code-line')!).lineHeight);
      return { heights: lines.map((r) => r.height), tops: lines.map((r) => r.top), lh, code: code.getBoundingClientRect().height };
    });
    expect(m.heights.length).toBe(5);
    for (const h of m.heights) expect(h).toBeCloseTo(m.lh, 0);
    for (let i = 1; i < m.tops.length; i++) expect(m.tops[i] - m.tops[i - 1]).toBeCloseTo(m.lh, 0);
    expect(m.code).toBeCloseTo(m.lh * 5, 0);
  });

  test('line numbers are generated, count from 1, take a line\'s own number, and are never selected', async ({ page }) => {
    const numbered = await page.locator('#code-lines').evaluate((host) => {
      const lines = Array.from(host.querySelectorAll('void-code-line'));
      const before = lines.map((l) => getComputedStyle(l, '::before'));
      const text = host.querySelector('code')!;
      const sel = getSelection()!;
      sel.selectAllChildren(text);
      const selected = sel.toString();
      sel.removeAllRanges();
      return {
        contents: before.map((b) => b.content),
        widths: before.map((b) => parseFloat(b.width)),
        pad: parseFloat(getComputedStyle(lines[0]).paddingInlineStart),
        selected,
      };
    });
    for (const c of numbered.contents.slice(0, 4)) expect(c).toContain('counter(void-code-line');
    expect(numbered.contents[4]).toMatch(/attr\(number\)|"40"/);
    expect(numbered.widths[0]).toBeGreaterThan(20);
    expect(numbered.pad).toBeGreaterThan(numbered.widths[0]);
    expect(numbered.selected).toContain('function greet(name) {');
    expect(numbered.selected).not.toMatch(/^\s*1/);
    expect(numbered.selected).not.toContain('40');
    // Without the attribute there is no gutter at all.
    expect(await content(page, '#code-plain code', '::before')).toBe('none');
  });

  test('wrap: long lines wrap under their own text, nothing scrolls and nothing becomes a tab stop', async ({ page }) => {
    const m = await page.locator('#code-wrap').evaluate((host) => {
      const pre = host.querySelector('pre')!;
      const lines = Array.from(host.querySelectorAll('void-code-line')).map((l) => l.getBoundingClientRect().height);
      const lh = parseFloat(getComputedStyle(host.querySelector('void-code-line')!).lineHeight);
      return { scrolls: pre.scrollWidth > pre.clientWidth + 1, lines, lh, tabindex: pre.getAttribute('tabindex') };
    });
    expect(m.scrolls).toBe(false);
    expect(m.lines[0]).toBeCloseTo(m.lh, 0);
    expect(m.lines[1]).toBeGreaterThan(m.lh * 1.5);
    expect(m.tabindex).toBeNull();
  });

  test('keyboard: the scroller is a tab stop only while it overflows, and the arrow keys scroll it', async ({ page }) => {
    const pre = page.locator('#code-plain pre');
    await expect.poll(() => pre.getAttribute('tabindex')).toBe('0');
    expect(await page.locator('#code-short pre').getAttribute('tabindex')).toBeNull();
    await pre.focus();
    await expect(pre).toBeFocused();
    expect(await pre.evaluate((el) => getComputedStyle(el).outlineStyle), 'a focus ring is drawn').not.toBe('none');
    for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight');
    await expect.poll(() => pre.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
    // Wide enough for the line: no longer a tab stop. Narrow again: one again.
    await page.evaluate(() => ((document.querySelector('#code-plain')!.parentElement as HTMLElement).style.width = '2400px'));
    await expect.poll(() => pre.getAttribute('tabindex')).toBeNull();
    await page.evaluate((w) => ((document.querySelector('#code-plain')!.parentElement as HTMLElement).style.width = `${w}px`), WIDTH);
    await expect.poll(() => pre.getAttribute('tabindex')).toBe('0');
    // Content that grows makes a block that fitted overflow.
    await page.evaluate(() => (document.querySelector('#code-short code')!.textContent = `npm install ${'a-very-long-package-name '.repeat(8)}`));
    await expect.poll(() => page.locator('#code-short pre').getAttribute('tabindex')).toBe('0');
  });

  test('keyboard: Tab reaches the copy button and then the overflowing code', async ({ page }) => {
    await expect.poll(() => page.locator('#code-lines pre').getAttribute('tabindex')).toBe('0');
    await page.locator('#code-lines button').focus();
    await page.keyboard.press('Tab');
    await expect(page.locator('#code-lines pre')).toBeFocused();
  });

  test('copy: the button copies the text without numbers or markup, says so and resets', async ({ page, browserName, context }) => {
    if (browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const host = page.locator('#code-lines');
    const button = host.locator('button');
    await expect(button).toHaveAttribute('aria-label', 'Copy code');
    await expect(button).toHaveAccessibleName('Copy code');
    await page.evaluate(() => {
      (window as any).__copied = [];
      document.getElementById('code-lines')!.addEventListener('void-copy', (e) => (window as any).__copied.push((e as CustomEvent).detail.value));
    });
    const expected = "function greet(name) {\n  return `Hello, ${name}`;\n}\n\ngreet('a long argument that makes this line wider than the block it is shown in, so it scrolls');";
    expect(await host.evaluate((el: any) => el.text)).toBe(expected);
    await button.click();
    await expect(host.locator('void-code-copy')).toHaveAttribute('copied', '');
    expect(await page.evaluate(() => (window as any).__copied)).toEqual([expected]);
    await expect(host.locator('[data-void-announcer]')).toHaveText('Copied');
    expect(await host.locator('[data-void-announcer]').evaluate((el) => el.getBoundingClientRect().width)).toBeLessThanOrEqual(1);
    if (browserName === 'chromium') expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
    // The tick is a state of two seconds.
    await expect(host.locator('void-code-copy')).not.toHaveAttribute('copied', '', { timeout: 6000 });
    // Enter on the focused button copies too (it is a native button).
    await button.focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => (window as any).__copied.length)).toBe(2);
  });

  test('the copy button sits beside the code without a title and in the title row with one, never over the code', async ({ page }) => {
    const m = await page.evaluate(() => {
      const r = (sel: string) => document.querySelector(sel)!.getBoundingClientRect();
      return { shortPre: r('#code-short pre'), shortButton: r('#code-short button'), title: r('#code-lines void-code-title'), linesButton: r('#code-lines button'), linesPre: r('#code-lines pre') };
    });
    expect(m.shortButton.left).toBeGreaterThanOrEqual(m.shortPre.right - 0.5);
    expect(m.linesButton.bottom).toBeLessThanOrEqual(m.linesPre.top + 0.5);
    expect(m.linesButton.left).toBeGreaterThanOrEqual(m.title.right - 0.5);
  });

  test('messages: the button and the announcement are in the language of the block', async ({ page }) => {
    await expect(page.locator('#code-fr button')).toHaveAttribute('aria-label', 'Copier le code');
    await page.locator('#code-fr button').click();
    await expect(page.locator('#code-fr [data-void-announcer]')).toHaveText('Copié');
  });

  test('a titled block is a group named by its title', async ({ page }) => {
    await expect(page.getByRole('group', { name: 'greet.js' })).toHaveCount(1);
    const snapshot = await page.locator('#code-lines').ariaSnapshot();
    expect(snapshot).toContain('button "Copy code"');
  });
});

test.describe('diff', () => {
  test.beforeEach(async ({ page }) => {
    await ready(page);
  });

  test('added and removed lines carry a + and a −, and a fill, and context lines neither', async ({ page }) => {
    expect(await content(page, '#diff-plain void-diff-line[kind="add"]', '::before')).toContain('+');
    expect(await content(page, '#diff-plain void-diff-line[kind="del"]', '::before')).toContain('−');
    expect(await content(page, '#diff-plain void-diff-line:not([kind])', '::before')).toBe('none');
    const m = await page.evaluate(() => {
      const bg = (sel: string) => getComputedStyle(document.querySelector(sel)!).backgroundColor;
      const ink = (sel: string) => getComputedStyle(document.querySelector(sel)!, '::before').color;
      return {
        add: bg('#diff-plain void-diff-line[kind="add"]'),
        del: bg('#diff-plain void-diff-line[kind="del"]'),
        context: bg('#diff-plain void-diff-line:not([kind])'),
        addInk: ink('#diff-plain void-diff-line[kind="add"]'),
        delInk: ink('#diff-plain void-diff-line[kind="del"]'),
        tokens: ['--void-color-diff-ins', '--void-color-diff-ins-subtle', '--void-color-diff-ins-strong', '--void-color-diff-del', '--void-color-diff-del-subtle', '--void-color-diff-del-strong'].map((t) =>
          getComputedStyle(document.documentElement).getPropertyValue(t).trim(),
        ),
      };
    });
    expect(m.context).toBe('rgba(0, 0, 0, 0)');
    expect(m.add).not.toBe(m.context);
    expect(m.del).not.toBe(m.context);
    expect(m.add).not.toBe(m.del);
    expect(m.addInk).not.toBe(m.delInk);
    for (const value of m.tokens) expect(value).not.toBe('');
  });

  test('line numbers: old and new in two columns before the marker, only with line-numbers', async ({ page }) => {
    const numbers = await page.evaluate(() => {
      const lines = Array.from(document.querySelectorAll('#diff void-diff-line'));
      return lines.slice(0, 3).map((l) => ({
        before: getComputedStyle(l, '::before').content,
        after: getComputedStyle(l, '::after').content,
        beforeBox: [parseFloat(getComputedStyle(l, '::before').left), parseFloat(getComputedStyle(l, '::before').width)],
        afterBox: [parseFloat(getComputedStyle(l, '::after').left), parseFloat(getComputedStyle(l, '::after').width)],
        pad: parseFloat(getComputedStyle(l).paddingLeft),
      }));
    });
    const [context, del, add] = numbers;
    expect(context.before).toMatch(/attr\(old\)|10/);
    expect(context.after).toMatch(/attr\(new\)|10/);
    expect(del.after).toContain('−');
    expect(add.after).toContain('+');
    // old column, then new column and marker, then the text: no overlap.
    expect(context.afterBox[0]).toBeGreaterThanOrEqual(context.beforeBox[0] + context.beforeBox[1] - 0.5);
    expect(context.pad).toBeGreaterThanOrEqual(context.afterBox[0] + context.afterBox[1] - 0.5);
    expect(await content(page, '#diff-plain void-diff-line[kind="add"]', '::after')).toBe('none');
  });

  test('a line\'s fill runs the whole scrolled width, and an empty line is a line tall', async ({ page }) => {
    const m = await page.locator('#diff').evaluate((host) => {
      const lines = Array.from(host.querySelectorAll('void-diff-line'));
      const lh = parseFloat(getComputedStyle(lines[0]).lineHeight);
      return { scrollWidth: host.scrollWidth, clientWidth: host.clientWidth, widths: lines.map((l) => l.getBoundingClientRect().width), heights: lines.map((l) => l.getBoundingClientRect().height), lh };
    });
    expect(m.scrollWidth).toBeGreaterThan(m.clientWidth + 1);
    for (const w of m.widths) expect(w).toBeGreaterThanOrEqual(m.scrollWidth - 1);
    for (const h of m.heights) expect(h).toBeCloseTo(m.lh, 0);
  });

  test('changed words: ins is underlined and del struck through, each on a stronger fill than its line', async ({ page }) => {
    const m = await page.evaluate(() => {
      const cs = (sel: string) => getComputedStyle(document.querySelector(sel)!);
      return {
        ins: [cs('#diff ins').textDecorationLine, cs('#diff ins').backgroundColor, cs('#diff void-diff-line[kind="add"]').backgroundColor],
        del: [cs('#diff del').textDecorationLine, cs('#diff del').backgroundColor, cs('#diff void-diff-line[kind="del"]').backgroundColor],
      };
    });
    expect(m.ins[0]).toBe('underline');
    expect(m.del[0]).toBe('line-through');
    expect(m.ins[1]).not.toBe('rgba(0, 0, 0, 0)');
    expect(m.ins[1]).not.toBe(m.ins[2]);
    expect(m.del[1]).not.toBe(m.del[2]);
  });

  test('keyboard: the diff is a tab stop only while it overflows, the arrow keys scroll it and the title stays in view', async ({ page }) => {
    const diff = page.locator('#diff');
    await expect.poll(() => diff.getAttribute('tabindex')).toBe('0');
    expect(await page.locator('#diff-plain').getAttribute('tabindex')).toBeNull();
    expect(await page.locator('#diff-wrap').getAttribute('tabindex')).toBeNull();
    await diff.focus();
    await expect(diff).toBeFocused();
    expect(await diff.evaluate((el) => getComputedStyle(el).outlineStyle), 'a focus ring is drawn').not.toBe('none');
    const titleLeft = () => page.locator('#diff void-diff-title').evaluate((el) => el.getBoundingClientRect().left);
    const before = await titleLeft();
    for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight');
    await expect.poll(() => diff.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
    await diff.evaluate((el) => (el.scrollLeft = 200));
    await expect.poll(titleLeft).toBeCloseTo(before, 0);
    // Wide enough for every line: no longer a tab stop.
    await page.evaluate(() => ((document.querySelector('#diff')!.parentElement as HTMLElement).style.width = '2400px'));
    await expect.poll(() => diff.getAttribute('tabindex')).toBeNull();
  });

  test('wrap: a long line wraps, nothing scrolls', async ({ page }) => {
    const m = await page.locator('#diff-wrap').evaluate((host) => {
      const line = host.querySelector('void-diff-line')!;
      return { scrolls: host.scrollWidth > host.clientWidth + 1, height: line.getBoundingClientRect().height, lh: parseFloat(getComputedStyle(line).lineHeight) };
    });
    expect(m.scrolls).toBe(false);
    expect(m.height).toBeGreaterThan(m.lh * 1.5);
  });

  test('selecting the lines takes the text alone: no markers, no numbers', async ({ page }) => {
    const selected = await page.locator('#diff void-diff-hunk').first().evaluate((hunk) => {
      const sel = getSelection()!;
      sel.selectAllChildren(hunk);
      const text = sel.toString();
      sel.removeAllRanges();
      return text;
    });
    expect(selected).toContain('for (const item of items) sum += item.price;');
    expect(selected).not.toMatch(/[+−] {2}for/);
    expect(selected).not.toMatch(/^\s*10\s/m);
  });

  test('code stays left to right on a right-to-left page', async ({ page }) => {
    const m = await page.evaluate(() => ({
      diffLine: getComputedStyle(document.querySelector('#diff-rtl void-diff-line')!).direction,
      diffTitle: getComputedStyle(document.querySelector('#diff-rtl void-diff-title')!).direction,
      codeLine: getComputedStyle(document.querySelector('#code-rtl void-code-line')!).direction,
    }));
    expect(m).toEqual({ diffLine: 'ltr', diffTitle: 'rtl', codeLine: 'ltr' });
  });
});

test.describe('assistive technology', () => {
  test.beforeEach(async ({ page }) => {
    await ready(page);
  });

  test('ins and del are insertions and deletions, and a titled diff is a named group', async ({ page }) => {
    const snapshot = await page.locator('#diff').ariaSnapshot();
    expect(snapshot).toMatch(/group "src\/invoice\.js"/);
    expect(snapshot).toMatch(/insertion/);
    expect(snapshot).toMatch(/deletion/);
    await expect(page.locator('#diff').getByRole('insertion')).toHaveText('item.price * item.quantity');
    await expect(page.locator('#diff').getByRole('deletion')).toHaveText('item.price');
  });

  test('the engine takes the text alternatives: "added" and "removed" for the markers, nothing for the numbers', async ({ page }) => {
    // Every engine under test parses `content: … / "alternative"`; without it the theme falls back to the bare marker.
    expect(await page.evaluate(() => CSS.supports('content', '"a" / "b"'))).toBe(true);
    expect(await content(page, '#diff-plain void-diff-line[kind="add"]', '::before')).toMatch(/"\+"\s*\/\s*"added"/);
    expect(await content(page, '#diff-plain void-diff-line[kind="del"]', '::before')).toMatch(/\/\s*"removed"/);
    expect(await content(page, '#diff void-diff-line[kind="add"]', '::before')).toMatch(/\/\s*"added"/);
    expect(await content(page, '#diff void-diff-line[kind="del"]', '::before')).toMatch(/\/\s*"removed"/);
    expect(await content(page, '#diff void-diff-line:not([kind])', '::before')).toMatch(/\/\s*""/);
    expect(await content(page, '#diff void-diff-line[kind="add"]', '::after')).toMatch(/\/\s*""/);
    expect(await content(page, '#code-lines void-code-line', '::before')).toMatch(/\/\s*""/);
    // In the language of the diff.
    expect(await content(page, '#diff-fr void-diff-line[kind="add"]', '::before')).toMatch(/\/\s*"ajout"/);
    expect(await content(page, '#diff-fr void-diff-line[kind="del"]', '::before')).toMatch(/\/\s*"suppression"/);
  });

  test('Chromium\'s accessibility tree: "added" and "removed" before the lines, insertion and deletion for the words, no line numbers', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'only Chromium exposes its accessibility tree to the test (the DevTools protocol)');
    const cdp = await page.context().newCDPSession(page);
    type Node = { nodeId: string; ignored?: boolean; role?: { value?: unknown }; name?: { value?: unknown }; childIds?: string[]; backendDOMNodeId?: number };
    const { nodes } = (await cdp.send('Accessibility.getFullAXTree')) as { nodes: Node[] };
    const byId = new Map(nodes.map((n) => [n.nodeId, n]));
    const root = nodes.find((n) => !n.ignored && n.role?.value === 'group' && n.name?.value === 'src/invoice.js')!;
    expect(root, 'the diff is in the tree, a group named by its title').toBeTruthy();
    const flat: string[] = [];
    const walk = (n: Node): void => {
      const role = String(n.role?.value ?? '');
      const name = String(n.name?.value ?? '');
      if (!n.ignored && role !== 'InlineTextBox' && (role === 'insertion' || role === 'deletion' || role === 'group' || (role === 'StaticText' && name.trim() !== ''))) {
        flat.push(role === 'StaticText' ? name.replace(/​/g, '').trim() : `<${role}>`);
      }
      for (const id of n.childIds ?? []) {
        const child = byId.get(id);
        if (child) walk(child);
      }
    };
    walk(root);
    const text = flat.filter((s) => s !== '').join(' | ');
    expect(text).toContain('<group>');
    // The removed line: "removed", its text, with the changed word as a deletion.
    expect(text).toMatch(/removed \| for \(const item of items\) sum \+= \| <deletion> \| item\.price \| ;/);
    // The added line: "added", its text, with the changed words as an insertion.
    expect(text).toMatch(/added \| for \(const item of items\) sum \+= \| <insertion> \| item\.price \* item\.quantity \| ;/);
    // Neither the markers themselves nor the line numbers are spoken.
    expect(flat).not.toContain('+');
    expect(flat).not.toContain('−');
    for (const n of ['10', '11', '12', '13', '14', '40', '41']) expect(flat, `line number ${n}`).not.toContain(n);
    // A context line says nothing before its text.
    expect(text).toMatch(/let sum = 0; \| removed/);
  });
});
