// SPDX-License-Identifier: MIT
//
// The exported tokens equal what Chromium computes.
//
// The export is produced by an evaluator written for this package
// (build/css-eval.js), so that building does not need a browser. This test
// is what makes that safe: it loads the theme's real CSS in headless
// Chromium, for every theme and skin in both colour schemes, and compares
// every value in dist/json and dist/dtcg with the computed value of the
// custom property it came from.
//
// Needs a Chromium: CHROMIUM_PATH, or one of the usual locations (GitHub's
// ubuntu runners ship Chrome). Without one the test is skipped locally and
// fails when CI is set, so the export is never released unverified.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { build, configurations, load } from '../scripts/export-tokens.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');

const executablePath = [process.env.CHROMIUM_PATH, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'].find((p) => p && existsSync(p));

// playwright-core is a devDependency of the workspace root.
const { chromium } = executablePath ? await import('playwright-core') : {};

const css = (dir) => readdirSync(join(SRC, dir)).filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(SRC, dir, f), 'utf8')).join('\n');
const stylesheet = ['primitives.css', 'knobs.css', 'tokens.css'].map((f) => readFileSync(join(SRC, f), 'utf8')).join('\n') + css('themes') + css('skins');

/** Runs in the page: compare flat[name] with var(name) for every token, and report the differences. */
function compareInPage({ flat, dtcg }) {
  const problems = [];
  const root = document.documentElement;
  const probe = document.createElement('div');
  probe.style.fontSize = '16px';
  document.body.append(probe);
  const read = (prop) => getComputedStyle(probe).getPropertyValue(prop).trim();
  const numbers = (s) => (s.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? []).map(Number);
  // Chromium serialises numbers as 32-bit floats, hence the relative part (six significant digits).
  const close = (a, b, tol) => a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) <= tol + Math.abs(b[i]) * 1e-5);
  // The value of an expression when it is given to a registered property of that syntax.
  const computed = (prop, expr) => {
    probe.style.setProperty(prop, expr);
    return read(prop);
  };
  const srgb = (expr) => {
    // color-mix(in srgb) of a colour with itself is that colour converted to sRGB by the browser.
    const out = computed('--probe-color', `color-mix(in srgb, ${expr}, ${expr})`);
    const n = numbers(out.replace(/^color\(srgb/, ''));
    return { rgb: n.slice(0, 3).map((x) => Math.min(1, Math.max(0, x))), alpha: n[3] ?? 1 };
  };
  const shadow = (expr) => {
    probe.style.boxShadow = expr;
    return getComputedStyle(probe).boxShadow;
  };
  const border = (expr) => {
    probe.style.borderTop = expr;
    const cs = getComputedStyle(probe);
    const out = { width: parseFloat(cs.borderTopWidth), style: cs.borderTopStyle, colour: srgb(cs.borderTopColor) };
    probe.style.borderTop = '';
    return out;
  };

  for (const [name, text] of Object.entries(flat)) {
    const ref = `var(${name})`;
    let ok = true;
    let got = '';
    if (/^#[0-9a-f]{6,8}$/.test(text)) {
      const a = srgb(ref);
      const b = srgb(text);
      // the flat value is 8-bit: half a step per channel, and per alpha
      ok = close(a.rgb, b.rgb, 0.5 / 255 + 1e-4) && Math.abs(a.alpha - b.alpha) <= 0.5 / 255 + 1e-4;
      got = JSON.stringify(a);
    } else if (/^-?[\d.]+(px|rem|em)$/.test(text)) {
      const a = numbers(computed('--probe-length', ref));
      const b = numbers(computed('--probe-length', text));
      ok = close(a, b, 0.01);
      got = String(a);
    } else if (/^-?[\d.]+(ms|s)$/.test(text)) {
      const a = numbers(computed('--probe-time', ref));
      const b = numbers(computed('--probe-time', text));
      ok = close(a, b, 1e-4);
      got = String(a);
    } else if (/^-?[\d.]+%$/.test(text)) {
      const a = numbers(computed('--probe-percentage', ref));
      const b = numbers(computed('--probe-percentage', text));
      ok = close(a, b, 0.01);
      got = String(a);
    } else if (/^-?[\d.]+$/.test(text)) {
      const a = numbers(computed('--probe-number', ref));
      const b = numbers(computed('--probe-number', text));
      ok = close(a, b, 1e-4);
      got = String(a);
    } else if (/^(clamp|min|max|calc)\(/.test(text)) {
      // fluid: both sides are resolved by the browser at this viewport
      probe.style.width = ref;
      const a = getComputedStyle(probe).width;
      probe.style.width = text;
      const b = getComputedStyle(probe).width;
      ok = close(numbers(a), numbers(b), 0.05);
      got = a;
    } else if (/^cubic-bezier/.test(text)) {
      probe.style.transitionTimingFunction = ref;
      const a = getComputedStyle(probe).transitionTimingFunction;
      ok = close(numbers(a), numbers(text), 1e-6);
      got = a;
    } else if (/^-?[\d.]+(px|rem) (solid|dashed|dotted|double) #[0-9a-f]{6,8}$/.test(text)) {
      // a border (the rule tokens): width, style and colour through the border shorthand
      const a = border(ref);
      const b = border(text);
      ok = close([a.width], [b.width], 0.01) && a.style === b.style && close(a.colour.rgb, b.colour.rgb, 0.5 / 255 + 1e-4) && Math.abs(a.colour.alpha - b.colour.alpha) <= 0.5 / 255 + 1e-4;
      got = JSON.stringify(a);
    } else if (/px .*#[0-9a-f]{6,8}/.test(text)) {
      // a shadow list: lengths and a colour per layer; compare layer by layer
      const layers = (s) => s.split(/,(?![^(]*\))/).map((l) => l.trim());
      const a = layers(shadow(ref));
      const b = layers(shadow(text));
      const parts = (layer) => {
        const colour = /(#[0-9a-f]{3,8}|[a-z-]+\([^)]*\))/i.exec(layer)[0];
        return { lengths: numbers(layer.replace(colour, '')), colour: srgb(colour) };
      };
      ok = a.length === b.length && a.every((layer, i) => {
        const x = parts(layer);
        const y = parts(b[i]);
        return close(x.lengths, y.lengths, 0.01) && close(x.colour.rgb, y.colour.rgb, 0.5 / 255 + 1e-4) && Math.abs(x.colour.alpha - y.colour.alpha) <= 0.5 / 255 + 1e-4;
      });
      got = a.join(' | ');
    } else {
      // keywords, font lists, the "L C H" working value: the substituted text, numbers compared as numbers
      const a = getComputedStyle(root).getPropertyValue(name).trim();
      const words = (s) => s.replace(/["']/g, '').replace(/calc\([^)]*\)/g, 'N').replace(/-?\d*\.?\d+/g, 'N').replace(/\s+/g, ' ');
      const folded = /^[\d.\s-]+$/.test(text);
      ok = folded ? true : words(a) === words(text);
      if (folded) {
        // "L C H": each part through a number probe
        const want = text.split(' ').map(Number);
        const expr = [];
        let depth = 0;
        let cur = '';
        for (const ch of a) {
          if (ch === '(') depth++;
          if (ch === ')') depth--;
          if (ch === ' ' && depth === 0) {
            expr.push(cur);
            cur = '';
          } else cur += ch;
        }
        expr.push(cur);
        const have = expr.filter(Boolean).map((e) => numbers(computed('--probe-number', e))[0]);
        ok = close(have, want, 1e-4);
      }
      got = a;
    }
    if (!ok) problems.push(`${name}: exported ${text}, Chromium computes ${got}`);
  }

  // The DTCG file: the same values in the format's own shapes.
  const walk = (node, path, type) => {
    for (const [key, child] of Object.entries(node)) {
      if ((key.startsWith('$') && key !== '$root') || typeof child !== 'object') continue;
      if (!('$value' in child)) {
        const t = child.$type ?? type;
        walk(child, [...path, key], t);
        continue;
      }
      let v = child.$value;
      const group = path[0];
      let name = group === undefined || group === 'knob' ? `--void-${key}` : key === '$root' ? `--void-${group}` : `--void-${group}-${key}`;
      let ref = `var(${name})`;
      let t = child.$type ?? type;
      if (group === 'component') {
        // A component token is not declared by the theme: what Chromium computes
        // is its default (the fallback the component reads it with), or the
        // skin's assignment. An alias is checked as the token it points to.
        const ext = child.$extensions['dev.voidable'];
        name = ext.css;
        ref = ext.assigned ? `var(${name})` : ext.default;
        if (typeof v === 'string') {
          const target = v.slice(1, -1).split('.').reduce((node, k) => node?.[k], dtcg);
          if (!target || !('$value' in target)) {
            problems.push(`${[...path, key].join('.')}: alias ${v} does not point to a token`);
            continue;
          }
          t = target.$type ?? dtcg[v.slice(1, -1).split('.')[0]].$type;
          v = target.$value;
        }
      }
      const fail = (got) => problems.push(`${[...path, key].join('.')} (${t}): exported ${JSON.stringify(v)}, Chromium computes ${got}`);
      const colourOk = (c, expr) => {
        const a = srgb(expr);
        return close(a.rgb, c.components, 1e-3) && Math.abs(a.alpha - (c.alpha ?? 1)) <= 1e-3 && /^#[0-9a-f]{6}$/.test(c.hex);
      };
      if (t === 'color') {
        if (v.colorSpace !== 'srgb' || !colourOk(v, ref)) fail(JSON.stringify(srgb(ref)));
      } else if (t === 'dimension') {
        const a = numbers(computed('--probe-length', ref));
        if (!close(a, [v.unit === 'rem' ? v.value * 16 : v.value], 0.01)) fail(a);
      } else if (t === 'duration') {
        const a = numbers(computed('--probe-time', ref));
        if (v.unit !== 'ms' || !close(a, [v.value / 1000], 1e-4)) fail(a);
      } else if (t === 'number' || t === 'fontWeight') {
        const raw = getComputedStyle(root).getPropertyValue(name).trim();
        const a = raw.includes('%') ? numbers(computed('--probe-percentage', ref)).map((x) => x / 100) : numbers(computed('--probe-number', ref));
        if (!close(a, [v], 1e-4)) fail(a);
      } else if (t === 'fontFamily') {
        probe.style.fontFamily = ref;
        const a = getComputedStyle(probe).fontFamily.split(',').map((f) => f.trim().replace(/^["']|["']$/g, ''));
        if (JSON.stringify(a) !== JSON.stringify([v].flat())) fail(a);
      } else if (t === 'cubicBezier') {
        probe.style.transitionTimingFunction = ref;
        if (!close(numbers(getComputedStyle(probe).transitionTimingFunction), v, 1e-6)) fail(getComputedStyle(probe).transitionTimingFunction);
      } else if (t === 'border') {
        const a = border(ref);
        if (!close([a.width], [v.width.unit === 'rem' ? v.width.value * 16 : v.width.value], 0.01) || a.style !== v.style || !close(a.colour.rgb, v.color.components, 1e-3) || Math.abs(a.colour.alpha - (v.color.alpha ?? 1)) > 1e-3) fail(JSON.stringify(a));
      } else if (t === 'shadow') {
        const got = shadow(ref).split(/,(?![^(]*\))/).map((l) => l.trim());
        const want = [v].flat();
        const same = got.length === want.length && got.every((layer, i) => {
          const colour = /(#[0-9a-f]{3,8}|[a-z-]+\([^)]*\))/i.exec(layer)[0];
          const w = want[i];
          return close(numbers(layer.replace(colour, '')), [w.offsetX.value, w.offsetY.value, w.blur.value, w.spread.value], 0.01) && colourOk(w.color, colour) && layer.includes('inset') === Boolean(w.inset);
        });
        if (!same) fail(got.join(' | '));
      } else if (t === 'typography') {
        probe.style.fontFamily = `var(--void-type-${key}-family)`;
        probe.style.fontSize = `var(--void-type-${key}-size)`;
        probe.style.fontWeight = `var(--void-type-${key}-weight)`;
        probe.style.letterSpacing = `var(--void-type-${key}-tracking, 0em)`;
        probe.style.lineHeight = `var(--void-type-${key}-leading, var(--void-leading-normal))`;
        const cs = getComputedStyle(probe);
        const size = parseFloat(cs.fontSize);
        const spacing = cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing);
        const families = cs.fontFamily.split(',').map((f) => f.trim().replace(/^["']|["']$/g, ''));
        const same =
          JSON.stringify(families) === JSON.stringify(v.fontFamily) &&
          Math.abs(size - (v.fontSize.unit === 'rem' ? v.fontSize.value * 16 : v.fontSize.value)) <= 0.01 &&
          Number(cs.fontWeight) === v.fontWeight &&
          Math.abs(spacing - v.letterSpacing.value) <= 0.01 &&
          Math.abs(parseFloat(cs.lineHeight) / size - v.lineHeight) <= 0.01;
        if (!same) fail(`${cs.fontFamily} ${cs.fontSize} ${cs.fontWeight} ${cs.letterSpacing} ${cs.lineHeight}`);
        probe.style.cssText = 'font-size: 16px';
      }
    }
  };
  walk(dtcg, [], undefined);
  probe.remove();
  return problems;
}

test('exported tokens equal what Chromium computes', { skip: executablePath ? false : 'no Chromium found (set CHROMIUM_PATH)' }, async () => {
  if (!existsSync(join(DIST, 'knobs.json'))) build();
  const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.setContent(`<!doctype html><html><head><style>${stylesheet}</style></head><body></body></html>`);
    await page.evaluate(() => {
      for (const [name, syntax, initial] of [
        ['--probe-color', '<color>', 'transparent'],
        ['--probe-length', '<length>', '0px'],
        ['--probe-time', '<time>', '0s'],
        ['--probe-number', '<number>', '0'],
        ['--probe-percentage', '<percentage>', '0%'],
      ]) CSS.registerProperty({ name, syntax, inherits: false, initialValue: initial });
    });
    let compared = 0;
    for (const cfg of configurations(load())) {
      const stem = `${cfg.id}.${cfg.scheme}`;
      const flat = JSON.parse(readFileSync(join(DIST, 'json', `${stem}.json`), 'utf8'));
      const dtcg = JSON.parse(readFileSync(join(DIST, 'dtcg', `${stem}.tokens.json`), 'utf8'));
      await page.evaluate(({ scheme, theme, skin }) => {
        const el = document.documentElement;
        el.setAttribute('data-theme', scheme);
        if (theme) el.setAttribute('data-void-theme', theme);
        else el.removeAttribute('data-void-theme');
        if (skin) el.setAttribute('data-void-skin', skin);
        else el.removeAttribute('data-void-skin');
      }, { scheme: cfg.scheme, theme: cfg.kind === 'theme' ? cfg.id : null, skin: cfg.skinName ?? null });
      const problems = await page.evaluate(compareInPage, { flat, dtcg });
      assert.deepEqual(problems, [], `${stem}: ${problems.length} value(s) differ from Chromium`);
      compared += Object.keys(flat).length;
    }
    assert.ok(compared > 5000, `expected thousands of comparisons, made ${compared}`);
  } finally {
    await browser.close();
  }
});

test('a missing Chromium fails in CI', () => {
  if (process.env.CI) assert.ok(executablePath, 'CI must verify the token export in Chromium: set CHROMIUM_PATH');
});
