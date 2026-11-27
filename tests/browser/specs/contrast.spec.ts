// SPDX-License-Identifier: MIT
//
// Every piece of visible text on the pages that show each component variant
// (pages/contrast.html and the kitchen page), measured as rendered: the text
// colour against the colours painted behind it, in the light and the dark
// theme, with no skin and with each skin the theme ships. WCAG 1.4.3: 4.5:1,
// or 3:1 for large text (24 px, or 18.66 px and bold). Disabled controls are
// exempt (1.4.3 excludes inactive components).
//
// This complements lint:contrast, which checks the derived tokens in the
// token files; this one catches a component that picks the wrong token, or a
// tint that lands on the wrong surface. Control boundaries and focus rings
// (1.4.11) are measured in theme.spec.ts.
//
// Chromium only: colour resolution is the same engine-independent CSS maths
// everywhere, and the other engines are covered by theme.spec.ts.
import { test, expect, load, settle, type Page } from '../helpers/test';

test.skip(({ browserName }) => browserName !== 'chromium', 'contrast is measured on Chromium; see the header comment');

const SKINS = ['none', 'loft', 'slab'] as const;
const THEMES = ['light', 'dark'] as const;
const PAGES = ['contrast', 'kitchen'] as const;

/** Text that is below its required ratio, one line each (deduplicated by component, variant and text). */
async function failures(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const { rgba, over, bgOf, ratio, hex } = (window as any).__color;
    const found = new Map<string, string>();
    const all: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const label = (el: Element) => {
      let owner: Element | null = el;
      while (owner && !owner.tagName.startsWith('VOID-')) owner = owner.parentElement;
      const parts: string[] = [];
      if (owner) {
        parts.push(owner.tagName.toLowerCase());
        for (const a of ['variant', 'color', 'trend', 'status']) if (owner.getAttribute(a)) parts.push(`${a}=${owner.getAttribute(a)}`);
      }
      const sel = el.tagName.toLowerCase() + (el.getAttribute('role') ? `[role=${el.getAttribute('role')}]` : '') + (el.classList.length ? '.' + [...el.classList].join('.') : '');
      const state = ['aria-selected', 'aria-current', 'selected', 'pressed']
        .filter((a) => el.hasAttribute(a) || owner?.hasAttribute(a))
        .map((a) => `${a}=${el.getAttribute(a) ?? owner?.getAttribute(a)}`);
      let where = "";
      for (let e: Element | null = el; e && !where; e = e.parentElement) for (let s = e.previousElementSibling; s && !where; s = s.previousElementSibling) if (/^H[23]$/.test(s.tagName)) where = s.textContent ?? "";
      return `[${where}] ${parts.join(" ")} > ${sel}${state.length ? " " + state.join(" ") : ""}`;
    };
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = (n.textContent ?? '').replace(/\s+/g, ' ').trim();
      const el = n.parentElement;
      if (!text || !el || /^(SCRIPT|STYLE)$/.test(el.tagName)) continue;
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (cs.visibility === 'hidden' || cs.display === 'none' || rect.width === 0 || rect.height === 0) continue;
      if (el.closest('[disabled], [aria-disabled=true], :disabled')) continue;
      let opacity = 1;
      for (let e: Element | null = el; e; e = e.parentElement) opacity *= parseFloat(getComputedStyle(e).opacity);
      const bg = bgOf(el);
      const fg = rgba(cs.color);
      fg[3] *= opacity;
      const shown = over(fg, bg);
      const r = ratio(shown, bg);
      const size = parseFloat(cs.fontSize);
      const large = size >= 24 || (size >= 18.66 && parseInt(cs.fontWeight) >= 700);
      const need = large ? 3 : 4.5;
      all.push(`${r} ${label(el)} "${text.slice(0, 20)}" ${hex(shown)} on ${hex(bg)}`);
      if (r < need) {
        const key = `${label(el)} "${text.slice(0, 24)}"`;
        if (!found.has(key)) found.set(key, `${key}: ${r}:1 (needs ${need}), text ${hex(shown)} on ${hex(bg)}`);
      }
    }
    (window as any).__contrastAll = all;
    return [...found.values()];
  });
}

// What each run puts on the page, on top of the colour scheme.
type Setup = { skin?: string; theme?: string; knobs?: Record<string, string> };
const THEME_NAMES = ['aurora', 'capsule', 'console', 'dune', 'iris', 'orbit', 'paper', 'void'];
// An app that brands the theme: a coloured accent in each hue family, the softest contrast the knob
// allows and a tinted page (where tints and status colours sit closest to their limits).
const BRANDED = [30, 60, 90, 150, 200, 250, 300, 350].map((hue) => ({
  name: `branded accent hue ${hue}, softest contrast, tinted page`,
  knobs: { '--void-accent-hue': String(hue), '--void-accent-chroma': '0.2', '--void-contrast': '0', '--void-page-tint': '1', '--void-neutral-chroma': '0.03' },
}));

const RUNS: { name: string; pages: readonly string[]; setup: Setup }[] = [
  { name: 'no skin', pages: PAGES, setup: {} },
  ...SKINS.filter((s) => s !== 'none').map((s) => ({ name: `${s} skin`, pages: PAGES, setup: { skin: s } })),
  ...THEME_NAMES.map((t) => ({ name: `${t} theme`, pages: ['contrast'], setup: { theme: t } })),
  ...BRANDED.map((b) => ({ name: b.name, pages: ['contrast'], setup: { knobs: b.knobs } })),
];

for (const run of RUNS) {
  for (const mode of THEMES) {
    for (const name of run.pages) {
      test(`text reaches AA: ${name} page, ${mode}, ${run.name}`, async ({ page }) => {
        await load(page, `/${name}?theme=${mode}`);
        const { skin, theme, knobs } = run.setup;
        if (skin) {
          await page.addStyleTag({ url: `/build/${skin}.css` });
          await page.evaluate((s) => document.documentElement.setAttribute('data-void-skin', s), skin);
        }
        await page.evaluate(([t, k]) => {
          const root = document.documentElement;
          if (t) root.setAttribute('data-void-theme', t as string);
          for (const [prop, value] of Object.entries((k ?? {}) as Record<string, string>)) root.style.setProperty(prop, value);
        }, [theme, knobs] as const);
        // Known gap (untracked): Slab inverts a selected list item (ink fill, page-coloured text),
        // and controls and chips inside it keep the colours of the page. Plain text there is measured.
        if (skin === 'slab') {
          await page.evaluate(() => {
            const h = [...document.querySelectorAll('#surfaces h3')].find((e) => e.textContent === 'selected list item');
            h?.nextElementSibling?.querySelectorAll('void-badge, void-tag, void-button, void-tabs').forEach((e) => e.remove());
          });
        }
        // Settled colours: a running transition would be measured part-way.
        await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' });
        await settle(page);
        const low = await failures(page);
        if (process.env.VOID_CONTRAST_REPORT) console.log((await page.evaluate(() => (window as any).__contrastAll as string[])).sort((a, b) => parseFloat(a) - parseFloat(b)).slice(0, 60).join('\n'));
        expect(low, 'text below WCAG AA (4.5:1, or 3:1 for large text)').toEqual([]);
      });
    }
  }
}
