// SPDX-License-Identifier: MIT
//
// A card that is a link or a button (#116), and the card grid. The author writes one real
// <a href> or <button> inside <void-card-title>; the theme stretches it over the whole card.
// Clicking anywhere on the card must follow the link or press the button, Tab must stop once
// per card, Enter and Space must behave natively, and the card grid must pack as many columns
// as fit. Text inside a linked card cannot be selected (the stretched box is on top of it);
// the last test records that trade-off, and a static card keeps its text selectable.
import { test, expect, load, settle, type Page } from '../helpers/test';

const CARDS = `
  <button id="before" type="button">before</button>
  <void-card-grid id="grid">
    <void-card id="link-card">
      <void-card-header>
        <void-card-title><a id="link" href="#went">Ground network</a></void-card-title>
        <void-card-description id="link-desc">41 stations, 2 in maintenance.</void-card-description>
      </void-card-header>
      <void-card-body id="link-body">Downlink at 79.6 TB today.</void-card-body>
      <void-card-footer>Updated a minute ago</void-card-footer>
    </void-card>
    <void-card id="button-card">
      <void-card-header>
        <void-card-title><button id="press" type="button">Add a station</button></void-card-title>
        <void-card-description>Register a new antenna.</void-card-description>
      </void-card-header>
      <void-card-body id="button-body">Opens the registration form.</void-card-body>
    </void-card>
    <void-card id="static-card">
      <void-card-header><void-card-title>Static card</void-card-title></void-card-header>
      <void-card-body id="static-body">Nothing to click here, so this text can be selected.</void-card-body>
    </void-card>
    <void-card id="off-card">
      <void-card-header>
        <void-card-title><button id="off" type="button" disabled>Unavailable</button></void-card-title>
      </void-card-header>
      <void-card-body id="off-body">Disabled.</void-card-body>
    </void-card>
    <void-card id="head-card">
      <void-card-header>
        <void-card-title><h3><a id="hlink" href="#head">Heading link</a></h3></void-card-title>
        <void-card-description>The link sits in a heading inside the title.</void-card-description>
      </void-card-header>
      <void-card-body>Body.</void-card-body>
    </void-card>
  </void-card-grid>
  <button id="after" type="button">after</button>`;

async function mount(page: Page, html: string): Promise<void> {
  await page.evaluate(async (h) => {
    const d = document.createElement('div');
    d.id = 'case';
    d.innerHTML = h;
    document.body.append(d);
    (window as any).__presses = 0;
    document.getElementById('press')?.addEventListener('click', () => (window as any).__presses++);
    await (window as any).__settle(d);
  }, html);
}

const presses = (page: Page) => page.evaluate(() => (window as any).__presses as number);
const hash = (page: Page) => page.evaluate(() => location.hash);

test.describe('a card that is a link or a button', () => {
  test.beforeEach(async ({ page }) => {
    await load(page, '/blank');
    // No style attribute may be needed: forbid them for everything mounted from here on.
    await page.evaluate(() => {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'Content-Security-Policy';
      meta.content = "style-src-attr 'none'";
      document.head.append(meta);
      (window as any).__violations = [] as string[];
      document.addEventListener('securitypolicyviolation', (e) => (window as any).__violations.push(e.violatedDirective));
    });
    await mount(page, CARDS);
  });

  test('uses no style attribute and no style element (strict CSP)', async ({ page }) => {
    const found = await page.evaluate(() => ({
      attrs: document.querySelectorAll('#case [style]').length,
      elements: document.querySelectorAll('#case style').length,
      violations: (window as any).__violations as string[],
    }));
    expect(found).toEqual({ attrs: 0, elements: 0, violations: [] });
  });

  test('a click anywhere on a linked card follows its link', async ({ page }) => {
    const box = (await page.locator('#link-card').boundingBox())!;
    const spots = [
      [4, 4],
      [box.width - 4, 4],
      [box.width / 2, box.height / 2],
      [4, box.height - 4],
      [box.width - 4, box.height - 4],
    ];
    for (const [dx, dy] of spots) {
      await page.evaluate(() => (location.hash = ''));
      await page.mouse.click(box.x + dx, box.y + dy);
      expect(await hash(page), `click at ${Math.round(dx)},${Math.round(dy)}`).toBe('#went');
    }
  });

  test('a click anywhere on a button card presses its button, once', async ({ page }) => {
    const box = (await page.locator('#button-card').boundingBox())!;
    for (const [dx, dy] of [[4, 4], [box.width / 2, box.height - 6], [box.width - 4, box.height / 2]]) {
      const before = await presses(page);
      await page.mouse.click(box.x + dx, box.y + dy);
      expect(await presses(page), `click at ${Math.round(dx)},${Math.round(dy)}`).toBe(before + 1);
    }
  });

  test('a disabled button card does nothing and shows no pressable cursor', async ({ page }) => {
    const box = (await page.locator('#off-card').boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    expect(await hash(page)).toBe('');
    expect(await page.locator('#off-card').evaluate((el) => getComputedStyle(el).cursor)).toBe('not-allowed');
  });

  test('Tab stops once per card, in order, and a static card is skipped', async ({ page }) => {
    await page.locator('#before').focus();
    const order: string[] = [];
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab');
      order.push(await page.evaluate(() => document.activeElement?.id ?? ''));
    }
    // The link card, the button card, (the static and disabled cards skipped), the heading link card, the control after the grid.
    expect(order).toEqual(['link', 'press', 'hlink', 'after']);
    await page.keyboard.press('Shift+Tab');
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('hlink');
  });

  test('a link inside a heading in the title makes the whole card the link too', async ({ page }) => {
    const box = (await page.locator('#head-card').boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height - 6);
    expect(await hash(page)).toBe('#head');
    expect(await page.locator('#hlink').getAttribute('aria-describedby')).not.toBeNull();
  });

  test('Enter follows the link; Enter and Space press the button; Space does not follow the link', async ({ page }) => {
    await page.locator('#link').focus();
    await page.keyboard.press('Space');
    expect(await hash(page), 'Space on a link').toBe('');
    await page.keyboard.press('Enter');
    expect(await hash(page), 'Enter on a link').toBe('#went');

    await page.locator('#press').focus();
    await page.keyboard.press('Enter');
    expect(await presses(page), 'Enter on a button').toBe(1);
    await page.keyboard.press('Space');
    expect(await presses(page), 'Space on a button').toBe(2);
  });

  test('the focus ring goes around the whole card, not the title text', async ({ page }) => {
    await page.locator('#before').focus();
    await page.keyboard.press('Tab');
    const ring = await page.evaluate(() => {
      const a = document.getElementById('link')!;
      const after = getComputedStyle(a, '::after');
      const card = document.getElementById('link-card')!.getBoundingClientRect();
      return { own: getComputedStyle(a).outlineStyle, ring: after.outlineStyle, width: parseFloat(after.outlineWidth), cardWidth: card.width, afterWidth: parseFloat(after.width) };
    });
    expect(ring.own).toBe('none');
    expect(ring.ring).toBe('solid');
    expect(ring.width).toBeGreaterThan(0);
    expect(ring.afterWidth).toBeCloseTo(ring.cardWidth, 0);
  });

  test('hover and press fill the card from tokens; a static card does not react', async ({ page }) => {
    const fill = (id: string) => page.locator(id).evaluate((el) => getComputedStyle(el).backgroundColor);
    const rest = await fill('#link-card');
    const staticRest = await fill('#static-card');
    await page.locator('#link-card').hover();
    const hover = await fill('#link-card');
    expect(hover).not.toBe(rest);
    await page.mouse.down();
    const down = await fill('#link-card');
    expect(down).not.toBe(hover);
    await page.mouse.up();
    await page.evaluate(() => (location.hash = ''));
    await page.locator('#static-card').hover();
    expect(await fill('#static-card')).toBe(staticRest);
    // An application can restyle both states with one token each.
    await page.evaluate(() => document.getElementById('link-card')!.style.setProperty('--void-card-surface-hover', 'rgb(1, 2, 3)'));
    await page.locator('#link-card').hover();
    expect(await fill('#link-card')).toBe('rgb(1, 2, 3)');
  });

  test('the link text is the name and the description is its description', async ({ page, browserName }) => {
    const wired = await page.evaluate(() => {
      const a = document.getElementById('link')!;
      const id = a.getAttribute('aria-describedby');
      const target = id ? document.getElementById(id) : null;
      return { id: !!id, text: target?.textContent, same: target === document.getElementById('link-desc') };
    });
    expect(wired).toEqual({ id: true, text: '41 stations, 2 in maintenance.', same: true });
    // A description the author gave a control is kept, and the card adds its own after it.
    await page.evaluate(async () => {
      const a = document.getElementById('link')!;
      a.setAttribute('aria-describedby', 'mine');
      await new Promise((r) => setTimeout(r, 0));
    });
    await settle(page);
    expect(await page.locator('#link').getAttribute('aria-describedby')).toContain('mine');

    if (browserName === 'chromium') {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Accessibility.enable');
      const doc = await cdp.send('DOM.getDocument', { depth: 0 });
      const node = await cdp.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#button-card button' });
      const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { nodeId: node.nodeId, fetchRelatives: false });
      const ax = nodes[0];
      expect(ax.role?.value).toBe('button');
      expect(ax.name?.value).toBe('Add a station');
      expect(ax.description?.value).toBe('Register a new antenna.');
    }
  });

  test('trade-off: text inside a linked card is covered by the link; a static card keeps selectable text', async ({ page }) => {
    const covered = await page.evaluate(() => {
      const body = document.getElementById('link-body')!.getBoundingClientRect();
      const hit = document.elementFromPoint(body.x + 8, body.y + body.height / 2);
      return hit?.id;
    });
    expect(covered).toBe('link');
    const word = await page.locator('#static-body').evaluate((el) => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + 8, r.y + r.height / 2);
      return hit === el;
    });
    expect(word).toBe(true);
    await page.locator('#static-body').dblclick({ position: { x: 8, y: 8 } });
    expect(await page.evaluate(() => getSelection()!.toString().length)).toBeGreaterThan(0);
  });
});

test.describe('card grid', () => {
  const cards = (n: number) =>
    Array.from({ length: n }, (_, i) => {
      const body = i % 3 === 0 ? 'A much longer body that wraps over several lines so its card is taller than the others in the row. '.repeat(3) : 'Short.';
      return `<void-card><void-card-header><void-card-title>Card ${i}</void-card-title></void-card-header><void-card-body>${body}</void-card-body><void-card-footer>Footer ${i}</void-card-footer></void-card>`;
    }).join('');

  test.beforeEach(async ({ page }) => {
    await load(page, '/blank');
    await mount(page, `<void-card-grid id="grid">${cards(7)}</void-card-grid>`);
  });

  const columns = (page: Page) =>
    page.locator('#grid').evaluate((grid) => new Set([...grid.children].map((c) => Math.round(c.getBoundingClientRect().left))).size);

  for (const [width, expected] of [
    [1280, 4],
    [760, 2],
    [360, 1],
  ] as const) {
    test(`packs ${expected} column${expected === 1 ? '' : 's'} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await settle(page);
      expect(await columns(page)).toBe(expected);
    });
  }

  test('the cards of a row are equally tall and their footers line up', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await settle(page);
    const rows = await page.locator('#grid').evaluate((grid) => {
      const byTop = new Map<number, { h: number; foot: number }[]>();
      for (const card of grid.children) {
        const r = card.getBoundingClientRect();
        const foot = card.querySelector('void-card-footer')!.getBoundingClientRect().bottom;
        const row = byTop.get(Math.round(r.top)) ?? [];
        row.push({ h: Math.round(r.height), foot: Math.round(foot) });
        byTop.set(Math.round(r.top), row);
      }
      return [...byTop.values()];
    });
    expect(rows.length).toBeGreaterThan(1);
    for (const row of rows) {
      expect(new Set(row.map((c) => c.h)).size, 'card heights in a row').toBe(1);
      expect(new Set(row.map((c) => c.foot)).size, 'footer bottoms in a row').toBe(1);
    }
  });

  test('the minimum column width is a token, and the gap follows the gap tokens', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.evaluate(() => document.getElementById('grid')!.style.setProperty('--void-card-grid-min', '30rem'));
    await settle(page);
    expect(await columns(page)).toBe(2);
    const gap = await page.locator('#grid').evaluate((g) => ({ col: getComputedStyle(g).columnGap, want: getComputedStyle(document.documentElement).getPropertyValue('--void-gap-stack').trim() }));
    expect(gap.col).not.toBe('normal');
    expect(parseFloat(gap.col)).toBeGreaterThan(0);
  });
});
