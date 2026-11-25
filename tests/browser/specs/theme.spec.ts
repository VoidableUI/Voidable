// SPDX-License-Identifier: MIT
//
// The theme as rendered: contrast computed from computed styles (not from the
// token files, which lint:contrast already checks), visible control
// boundaries (WCAG 1.4.11), focus indicators, nested themes, the colour-scheme
// media query, reduced motion and forced colours.
import { test, expect, expectedFailure, load, settle, type Page } from '../helpers/test';

type Mode = { name: string; query: string; colorScheme?: 'light' | 'dark' };
const MODES: Mode[] = [
  { name: 'data-theme=dark', query: 'theme=dark' },
  { name: 'data-theme=light', query: 'theme=light' },
  { name: 'prefers-color-scheme: dark', query: 'theme=none', colorScheme: 'dark' },
  { name: 'prefers-color-scheme: light', query: 'theme=none', colorScheme: 'light' },
];

// The element that draws each control's edge.
const BOUNDARIES: [string, string][] = [
  ['input', 'void-input input'],
  ['textarea', 'void-textarea textarea'],
  ['select', 'void-select select'],
  ['number-input', 'void-number-input'],
  ['checkbox', 'void-checkbox:not([checked]) .void-checkbox-box'],
  ['radio', 'void-radio:not([checked]) .void-radio-circle'],
  ['switch', 'void-switch:not([checked]) .void-switch-track'],
  ['pin-input', 'void-pin-input input'],
  ['tags-input', 'void-tags-input .void-tags-input'],
  ['date-picker', 'void-date-picker .void-date-picker-input'],
  ['combobox', 'void-combobox .void-combobox-input'],
  ['multiselect', 'void-multiselect .void-multiselect-trigger'],
  ['outline button', 'void-button[color=default]:not([variant=filled]):not([disabled])'],
  ['toggle', 'void-toggle:not([pressed])'],
  ['segmented-control', 'void-segmented-control'],
  ['action-input', 'void-action-input'],
];

/** Contrast of a control's edge (border, else its fill) against what surrounds it. */
async function boundaries(page: Page): Promise<Record<string, number | string>> {
  return page.evaluate((list) => {
    const { rgba, over, bgOf, ratio } = (window as any).__color;
    const out: Record<string, number | string> = {};
    for (const [name, sel] of list) {
      const el = document.querySelector(sel);
      if (!el) { out[name] = `no element for ${sel}`; continue; }
      const cs = getComputedStyle(el);
      const outside = bgOf(el.parentElement);
      const width = parseFloat(cs.borderTopWidth);
      const border = width > 0 && cs.borderTopStyle !== 'none' ? ratio(over(rgba(cs.borderTopColor), outside), outside) : 0;
      const fill = ratio(bgOf(el), outside);
      out[name] = Math.max(border, fill);
    }
    return out;
  }, BOUNDARIES);
}

// Text that must reach 4.5:1 against what is behind it.
const TEXT: [string, string][] = [
  ['body text', 'main h1'],
  ['field label', 'void-field label, void-field .void-field-label'],
  ['field helper', 'void-field .void-field-helper, void-field [class*=helper]'],
  ['field error', 'void-field .void-field-error, void-field [class*=error]'],
  ['input value', 'void-field[label="With error"] input'],
  ['outline button', 'void-button[color=default]:not([variant=filled]):not([disabled])'],
  ['filled button', 'void-button[variant=filled][color=info]'],
  ['badge', 'void-badge[color=error]'],
  ['outline badge', 'void-badge[variant=outline]'],
  ['tag', 'void-tag[color=success]'],
  ['alert', 'void-alert[color=info]'],
  ['inactive tab', 'void-tabs [role=tab][aria-selected=false]'],
  ['selected tab', 'void-tabs [role=tab][aria-selected=true]'],
  ['card body', 'void-card p'],
  ['table cell', 'void-table td'],
  ['stat label', 'void-stat [class*=label]'],
  ['breadcrumb link', 'void-breadcrumbs a'],
  ['calendar day', 'void-calendar .void-calendar-day:not(.selected)'],
  ['selected calendar day', 'void-calendar .void-calendar-day.selected'],
  ['toast', 'void-toast'],
];

async function textContrast(page: Page): Promise<Record<string, number | string>> {
  return page.evaluate((list) => {
    const { rgba, over, bgOf, ratio } = (window as any).__color;
    const out: Record<string, number | string> = {};
    for (const [name, sel] of list) {
      const el = document.querySelector(sel);
      if (!el) { out[name] = `no element for ${sel}`; continue; }
      const bg = bgOf(el);
      out[name] = ratio(over(rgba(getComputedStyle(el).color), bg), bg);
    }
    return out;
  }, TEXT);
}

for (const mode of MODES) {
  test.describe(mode.name, () => {
    if (mode.colorScheme) test.use({ colorScheme: mode.colorScheme });

    test('the page resolves to the expected scheme', async ({ page }) => {
      await load(page, `/kitchen?${mode.query}`);
      const lum = await page.evaluate(() => (window as any).__color.lum((window as any).__color.bgOf(document.body)));
      const light = mode.name.endsWith('light');
      expect(light ? lum > 0.5 : lum < 0.1, `page background luminance ${lum}`).toBe(true);
    });

    test('every control has a visible boundary (3:1)', async ({ page }) => {
      expectedFailure('untracked:date-picker-boundary', 'the date-picker input is drawn with --void-color-border (about 1.4:1) instead of the control border every other input uses (3.1:1 and up)');
      await load(page, `/kitchen?${mode.query}`);
      const found = await boundaries(page);
      const low = Object.entries(found).filter(([, v]) => typeof v === 'string' || v < 3);
      expect(low, JSON.stringify(found)).toEqual([]);
    });

    test('text reaches 4.5:1 against its rendered background', async ({ page }) => {
      await load(page, `/kitchen?${mode.query}`);
      const found = await textContrast(page);
      const low = Object.entries(found).filter(([, v]) => typeof v === 'string' || v < 4.5);
      expect(low, JSON.stringify(found)).toEqual([]);
    });
  });
}

test('every keyboard stop on the kitchen page shows a focus indicator of 3:1', async ({ page }) => {
  test.setTimeout(90_000);
  await load(page, '/kitchen');
  // Compare settled styles: a running transition would make focused and blurred look alike.
  await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' });
  await page.locator('h1').click();
  const problems: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < 160; i++) {
    await page.keyboard.press('Tab');
    // 1. Record the focused element and the styles of it and three ancestors (a wrapper may draw the ring).
    const key = await page.evaluate(() => {
      const a = document.activeElement as HTMLElement | null;
      if (!a || a === document.body) return null;
      const els = [a, a.parentElement, a.parentElement?.parentElement, a.parentElement?.parentElement?.parentElement].filter(Boolean) as HTMLElement[];
      const snap = () => els.map((e) => { const c = getComputedStyle(e); return { outline: c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) > 0 ? c.outlineColor : '', shadow: c.boxShadow, border: c.borderTopColor }; });
      (window as any).__focusProbe = { a, els, snap, focused: snap() };
      return a.outerHTML.slice(0, 80) + [...document.querySelectorAll('*')].indexOf(a);
    });
    if (!key) break;
    if (seen.has(key)) continue;
    seen.add(key);
    const shotTarget = await page.evaluateHandle(() => document.activeElement!.parentElement!);
    const focusedShot = await shotTarget.screenshot();
    // 2. Blur, and let a popup that opened on focus close again.
    await page.evaluate(() => (window as any).__focusProbe.a.blur());
    await page.waitForFunction(() => (window as any).__focusProbe.a.closest('[aria-expanded]')?.getAttribute('aria-expanded') !== 'true');
    await settle(page);
    const blurredShot = await shotTarget.screenshot();
    // 3. Find what changed, and its contrast.
    const r = await page.evaluate(() => {
      const { rgba, over, bgOf, ratio } = (window as any).__color;
      const p = (window as any).__focusProbe;
      const blurred = p.snap();
      for (let k = 0; k < p.els.length; k++) {
        const f = p.focused[k], u = blurred[k];
        const behind = bgOf(p.els[k].parentElement ?? p.els[k]);
        if (f.outline && f.outline !== u.outline) return { ok: ratio(over(rgba(f.outline), behind), behind) >= 3, how: `outline ${f.outline}` };
        if (f.shadow !== u.shadow && f.shadow !== 'none') {
          // The most opaque colour in the shadow list draws the ring.
          const colors: string[] = f.shadow.match(/(?:rgba?|color|oklab|oklch|lab|lch|hsla?)\([^)]*\)|#[0-9a-f]{3,8}\b/gi) ?? [];
          const color = colors.map((c) => [c, rgba(c)[3]] as const).sort((x, y) => y[1] - x[1])[0]?.[0] ?? 'transparent';
          return { ok: ratio(over(rgba(color), behind), behind) >= 3, how: `box-shadow ${color}` };
        }
        if (f.border !== u.border) return { ok: ratio(over(rgba(f.border), behind), over(rgba(u.border), behind)) >= 3, how: `border ${u.border} -> ${f.border} (3:1 change needed)` };
      }
      return { ok: false, how: 'no visible change on focus' };
    });
    await page.evaluate(() => (window as any).__focusProbe.a.focus());
    // Drawn where computed styles cannot see it (a range thumb, a pseudo-element): accept a pixel change.
    if (!r.ok && r.how === 'no visible change on focus' && !focusedShot.equals(blurredShot)) continue;
    // The compose-input is checked by its own expected-failure test below.
    if (!r.ok && !key.includes('void-compose-input')) problems.push(`${key.slice(0, 80)}: ${r.how}`);
  }
  expect(seen.size, 'keyboard stops visited').toBeGreaterThan(40);
  expect(problems).toEqual([]);
});

test('the compose-input focus indicator changes by 3:1', async ({ page }) => {
  expectedFailure('untracked:compose-input-focus', 'focus only brightens the border from 36% to 55% white, about 1.5:1 between states');
  await load(page, '/kitchen');
  await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; }' });
  const ta = page.locator('void-compose-input textarea');
  await ta.focus();
  const r = await ta.evaluate((el) => {
    const { rgba, over, bgOf, ratio } = (window as any).__color;
    const els = [el, el.parentElement!, el.parentElement!.parentElement!];
    const snap = () => els.map((e) => { const c = getComputedStyle(e); return [c.outlineStyle !== 'none' ? c.outlineColor : '', c.boxShadow, c.borderTopColor]; });
    const f = snap();
    (el as HTMLElement).blur();
    const u = snap();
    let best = 1;
    els.forEach((e, k) => {
      const behind = bgOf(e.parentElement!);
      for (let j = 0; j < 3; j++) if (f[k][j] && f[k][j] !== u[k][j] && f[k][j] !== 'none') best = Math.max(best, ratio(over(rgba(f[k][j].match(/(?:rgba?|color|oklab)\([^)]*\)/)?.[0] ?? f[k][j]), behind), over(rgba(u[k][j].match(/(?:rgba?|color|oklab)\([^)]*\)/)?.[0] ?? 'transparent'), behind)));
    });
    return best;
  });
  expect(r).toBeGreaterThanOrEqual(3);
});

test.describe('nested data-theme', () => {
  const REGION = `<void-card heading="Card"><p>Text in the region</p><void-input value="input"></void-input><void-button>Outline</void-button><void-button variant="filled">Filled</void-button><void-select aria-label="Pick"><option>Opt</option></void-select><void-checkbox checked>Check</void-checkbox><void-alert color="info">Info</void-alert><void-badge color="error">Err</void-badge></void-card>`;
  for (const [outer, inner] of [['dark', 'light'], ['light', 'dark']]) {
    test(`a ${inner} region inside a ${outer} page uses the ${inner} tokens and keeps text readable`, async ({ page }) => {
      await load(page, `/blank?theme=${outer}`);
      await page.evaluate(([html, inner]) => {
        const d = document.createElement('div');
        d.id = 'nest';
        d.dataset.theme = inner;
        d.style.padding = '1rem';
        d.innerHTML = html;
        document.getElementById('root')!.append(d);
      }, [REGION, inner]);
      await settle(page);
      const r = await page.evaluate(() => {
        const { rgba, over, bgOf, ratio, lum } = (window as any).__color;
        const n = document.getElementById('nest')!;
        const pairs: Record<string, number> = {};
        for (const sel of ['void-card p', 'void-input input', 'void-button:not([variant=filled])', 'void-button[variant=filled]', 'void-select select', 'void-checkbox', 'void-alert', 'void-badge']) {
          const e = n.querySelector(sel)!;
          const bg = bgOf(e);
          pairs[sel] = ratio(over(rgba(getComputedStyle(e).color), bg), bg);
        }
        return { cardLum: lum(bgOf(n.querySelector('void-card'))), colorScheme: getComputedStyle(n).colorScheme, pairs };
      });
      expect(inner === 'light' ? r.cardLum > 0.5 : r.cardLum < 0.1, `card background luminance ${r.cardLum}`).toBe(true);
      expect(r.colorScheme).toContain(inner);
      expect(Object.entries(r.pairs).filter(([, v]) => v < 4.5), JSON.stringify(r.pairs)).toEqual([]);
    });
  }
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('nothing animates forever, and transitions are effectively instant', async ({ page }) => {
    await load(page, '/kitchen');
    await page.evaluate(async () => {
      (document.querySelector('void-progress') as any).indeterminate = true;
      (document.querySelector('void-indicator') as any).ping = true;
      await (window as any).__settle();
    });
    const looping = await page.evaluate(() =>
      document.getAnimations()
        .filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().iterations === Infinity)
        .map((a) => `${(a.effect as KeyframeEffect).target?.tagName.toLowerCase()} ${(a as CSSAnimation).animationName ?? ''}`),
    );
    // A spinner is the one sanctioned exception: it is the only signal that work is in progress.
    expect(looping.filter((l) => !l.startsWith('void-spinner') && !l.includes('spin'))).toEqual([]);
    await page.locator('#s-nav void-accordion-item').first().getByRole('button').click();
    const slow = await page.evaluate(() =>
      document.getAnimations()
        .filter((a) => (Number(a.effect?.getComputedTiming().duration) || 0) > 50 && !(a.effect as KeyframeEffect).target?.closest('void-spinner'))
        .map((a) => `${(a.effect as KeyframeEffect).target?.tagName.toLowerCase()}.${(a.effect as KeyframeEffect).target?.className} ${(a as CSSTransition).transitionProperty ?? (a as CSSAnimation).animationName} ${a.effect?.getComputedTiming().duration}ms`),
    );
    expect(slow).toEqual([]);
  });
});

test.describe('forced colours', () => {
  test.use({ forcedColors: 'active' });

  test('checked, pressed and selected states stay distinguishable', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'forced-colors emulation is Chromium-only in Playwright');
    await load(page, '/blank');
    expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true);
    await page.evaluate(() => {
      document.getElementById('root')!.innerHTML = `
        <void-checkbox id="c0">Off</void-checkbox><void-checkbox id="c1" checked>On</void-checkbox>
        <void-switch id="s0">Off</void-switch><void-switch id="s1" checked>On</void-switch>
        <void-radio-group label="R" value="b"><void-radio id="r0" value="a">A</void-radio><void-radio id="r1" value="b">B</void-radio></void-radio-group>
        <void-toggle id="t0">Off</void-toggle><void-toggle id="t1" pressed>On</void-toggle>
        <void-segmented-control value="b" aria-label="S"><void-segmented-control-item id="g0" value="a">A</void-segmented-control-item><void-segmented-control-item id="g1" value="b">B</void-segmented-control-item></void-segmented-control>`;
    });
    await settle(page);
    // Off and on must not render identically: compare every painted pixel of the pair.
    for (const [off, on] of [['c0', 'c1'], ['s0', 's1'], ['r0', 'r1'], ['t0', 't1'], ['g0', 'g1']]) {
      const a = await page.locator(`#${off}`).screenshot();
      const b = await page.locator(`#${on}`).screenshot();
      // Labels differ ("Off"/"On"), so compare only the indicator area where one exists.
      const box = async (id: string) => page.locator(`#${id} [class*=box], #${id} [class*=track], #${id} [class*=circle]`).first();
      const ind0 = await box(off), ind1 = await box(on);
      if ((await ind0.count()) && (await ind1.count())) {
        expect((await ind0.screenshot()).equals(await ind1.screenshot()), `${off} and ${on} indicators look the same`).toBe(false);
      } else {
        expect(a.equals(b), `${off} and ${on} look the same`).toBe(false);
        const styles = await page.evaluate(([x, y]) => [x, y].map((id) => { const c = getComputedStyle(document.getElementById(id)!); return `${c.backgroundColor}|${c.borderTopColor}|${c.outlineStyle}|${c.color}`; }), [off, on]);
        expect(styles[0], `${off} and ${on} have identical colours in forced-colours mode`).not.toBe(styles[1]);
      }
    }
  });
});
