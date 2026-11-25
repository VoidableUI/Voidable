// SPDX-License-Identifier: MIT
//
// A small evaluator for the CSS the theme is written in: var(), calc(),
// min(), max(), clamp(), oklch(), color-mix(in srgb, …), hex colours,
// box-shadow lists, font-family lists and cubic-bezier(). It resolves a
// custom property to the value a browser computes, without a browser, so
// the token export (scripts/export-tokens.mjs) can run wherever Node runs.
//
// It is not a general CSS engine. It implements what tokens.css uses and
// throws on anything else, so a new construct in the theme fails the build
// instead of being exported wrongly. test/chromium.test.mjs compares every
// exported value with what Chromium computes.
//
// No Node or DOM APIs: the theme builder on the docs site runs the same
// code in the page.

const ROOT_FONT_PX = 16;

/** Remove comments. */
export const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** The `--void-*` declarations of a rule body, in source order; the last one wins. */
export function declarations(body) {
  const out = {};
  for (const m of body.matchAll(/(--void-[\w-]+)\s*:\s*([^;{}]+);/g)) out[m[1]] = m[2].trim().replace(/\s+/g, ' ');
  return out;
}

/** The body of the first rule whose prelude matches `header` (a RegExp ending at the opening brace). */
export function ruleBody(css, header) {
  const m = header.exec(css);
  if (!m) throw new Error(`rule not found: ${header}`);
  let depth = 1;
  let j = m.index + m[0].length;
  const start = j;
  while (depth && j < css.length) {
    if (css[j] === '{') depth++;
    else if (css[j] === '}') depth--;
    j++;
  }
  return css.slice(start, j - 1);
}

/** Split on a separator at parenthesis depth 0. `sep` is ' ', ',' or '/'. */
export function splitTop(s, sep) {
  const out = [];
  let depth = 0;
  let cur = '';
  let quote = '';
  for (const ch of s) {
    if (quote) {
      cur += ch;
      if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    const isSep = depth === 0 && !quote && (sep === ' ' ? /\s/.test(ch) : ch === sep);
    if (isSep) {
      if (cur.trim() !== '' || sep !== ' ') out.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  if (cur.trim() !== '' || sep !== ' ') out.push(cur.trim());
  return out;
}

/** Replace every var(--x) and var(--x, fallback) with its value from `env`, recursively. */
export function substitute(value, env, depth = 0) {
  if (depth > 60) throw new Error(`var() cycle in: ${value}`);
  let out = '';
  let i = 0;
  for (;;) {
    const at = value.indexOf('var(', i);
    if (at === -1) return out + value.slice(i);
    out += value.slice(i, at);
    let d = 1;
    let j = at + 4;
    while (d && j < value.length) {
      if (value[j] === '(') d++;
      else if (value[j] === ')') d--;
      j++;
    }
    const inner = value.slice(at + 4, j - 1);
    const comma = splitTop(inner, ',');
    const name = comma[0].trim();
    if (name in env) out += substitute(env[name], env, depth + 1);
    else if (comma.length > 1) out += substitute(comma.slice(1).join(',').trim(), env, depth + 1);
    else throw new Error(`undefined custom property ${name}`);
    i = j;
  }
}

// ── Numbers with units ───────────────────────────────────────────────
// A value is { n, unit } when it folds to one number, or { sym } when it
// depends on the viewport or the containing block (vw, vh, %-of-length)
// and can only be written, not computed.

const LENGTH = new Set(['px', 'rem']);
const FLUID = new Set(['vw', 'vh', 'svh', 'dvh', 'lvh', 'vmin', 'vmax', 'cqw', 'cqi']);
const fmt = (n) => String(Math.round(n * 1e4) / 1e4);
const print = (v) => ('sym' in v ? v.sym : `${fmt(v.n)}${v.unit}`);
const isSym = (v) => 'sym' in v;

function add(a, b, sign) {
  if (isSym(a) || isSym(b)) return { sym: `${print(a)} ${sign > 0 ? '+' : '-'} ${print(b)}`, loose: true };
  if (a.unit === b.unit) return { n: a.n + sign * b.n, unit: a.unit };
  if (LENGTH.has(a.unit) && LENGTH.has(b.unit)) {
    const px = (v) => (v.unit === 'rem' ? v.n * ROOT_FONT_PX : v.n);
    return { n: px(a) + sign * px(b), unit: 'px' };
  }
  // 0 is a valid length without a unit
  if (a.n === 0 && a.unit === '') return { n: sign * b.n, unit: b.unit };
  if (b.n === 0 && b.unit === '') return a;
  // a percentage and a length: only the layout can resolve it
  if ((a.unit === '%' && LENGTH.has(b.unit)) || (b.unit === '%' && LENGTH.has(a.unit))) {
    return { sym: `${print(a)} ${sign > 0 ? '+' : '-'} ${print(b)}`, loose: true };
  }
  throw new Error(`cannot add ${print(a)} and ${print(b)}`);
}

function mul(a, b) {
  // 4vw * 1.2 folds to 4.8vw; anything else fluid stays an expression
  for (const [x, y] of [[a, b], [b, a]]) {
    const simple = isSym(x) && /^(-?[\d.]+)([a-z]+)$/.exec(x.sym);
    if (simple && !isSym(y) && y.unit === '') return { sym: `${fmt(parseFloat(simple[1]) * y.n)}${simple[2]}` };
  }
  if (isSym(a) || isSym(b)) return { sym: `${wrap(a)} * ${wrap(b)}`, loose: true };
  if (a.unit !== '' && b.unit !== '') throw new Error(`cannot multiply ${print(a)} by ${print(b)}`);
  return { n: a.n * b.n, unit: a.unit || b.unit };
}

function div(a, b) {
  if (isSym(a) || isSym(b)) return { sym: `${wrap(a)} / ${wrap(b)}`, loose: true };
  if (b.unit !== '') throw new Error(`cannot divide by ${print(b)}`);
  return { n: a.n / b.n, unit: a.unit };
}

const wrap = (v) => (isSym(v) && v.loose ? `(${v.sym})` : print(v));

/** Compare two concrete values of compatible units; returns them in a common unit. */
function common(values) {
  const units = new Set(values.map((v) => v.unit));
  if (units.size === 1) return values;
  if ([...units].every((u) => LENGTH.has(u) || u === '')) {
    return values.map((v) => ({ n: v.unit === 'rem' ? v.n * ROOT_FONT_PX : v.n, unit: 'px' }));
  }
  throw new Error(`cannot compare ${values.map(print).join(', ')}`);
}

/** Evaluate a numeric expression: a number with an optional unit, or calc/min/max/clamp of them. */
export function numeric(expr) {
  const s = expr.trim();
  let pos = 0;
  const peek = () => s[pos];
  const ws = () => {
    while (/\s/.test(s[pos] ?? '')) pos++;
  };
  function primary() {
    ws();
    const fn = /^(calc|min|max|clamp)\(/.exec(s.slice(pos));
    if (fn) {
      pos += fn[0].length;
      const args = [sum()];
      ws();
      while (peek() === ',') {
        pos++;
        args.push(sum());
        ws();
      }
      if (peek() !== ')') throw new Error(`expected ) in ${expr}`);
      pos++;
      if (fn[1] === 'calc') return args[0].loose ? { sym: `calc(${args[0].sym})` } : args[0];
      if (args.some(isSym)) return { sym: `${fn[1]}(${args.map(print).join(', ')})` };
      const c = common(args);
      const ns = c.map((v) => v.n);
      const unit = c[0].unit;
      if (fn[1] === 'min') return { n: Math.min(...ns), unit };
      if (fn[1] === 'max') return { n: Math.max(...ns), unit };
      return { n: Math.max(ns[0], Math.min(ns[1], ns[2])), unit };
    }
    if (peek() === '(') {
      pos++;
      const v = sum();
      ws();
      if (peek() !== ')') throw new Error(`expected ) in ${expr}`);
      pos++;
      return v.loose ? { sym: `(${v.sym})` } : v;
    }
    const m = /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?(%|[a-z]+)?/i.exec(s.slice(pos));
    if (!m) throw new Error(`not a number at "${s.slice(pos)}" in ${expr}`);
    pos += m[0].length;
    const unit = m[3] ?? '';
    const n = parseFloat(m[0]);
    if (FLUID.has(unit)) return { sym: `${fmt(n)}${unit}` };
    return { n, unit };
  }
  function product() {
    let v = primary();
    for (;;) {
      ws();
      if (peek() === '*') {
        pos++;
        v = mul(v, primary());
      } else if (peek() === '/') {
        pos++;
        v = div(v, primary());
      } else return v;
    }
  }
  function sum() {
    let v = product();
    for (;;) {
      ws();
      // In calc() a binary + or - has white space on both sides.
      if ((peek() === '+' || peek() === '-') && /\s/.test(s[pos - 1] ?? '') && /\s/.test(s[pos + 1] ?? '')) {
        const sign = peek() === '+' ? 1 : -1;
        pos++;
        v = add(v, product(), sign);
      } else return v;
    }
  }
  const v = sum();
  ws();
  if (pos !== s.length) throw new Error(`trailing "${s.slice(pos)}" in ${expr}`);
  if (isSym(v) && v.loose) return { sym: `calc(${v.sym})` };
  return v;
}

// ── Colour ───────────────────────────────────────────────────────────
// A colour keeps the space it was written in ({ space, coords }) next to
// its sRGB equivalent ({ rgb }, 0–1, not clipped), because a browser does
// the same: oklch() computes to oklch(), color-mix(in srgb) to sRGB.

const gamma = (x) => {
  const a = Math.abs(x);
  return a <= 0.0031308 ? 12.92 * x : Math.sign(x) * (1.055 * a ** (1 / 2.4) - 0.055);
};

/** OKLCH to gamma-encoded sRGB, 0–1 per channel, not clipped to the gamut. */
export function oklchToSrgb(L, C, H) {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map(gamma);
}

const NAMED = { transparent: [0, 0, 0, 0], white: [1, 1, 1, 1], black: [0, 0, 0, 1] };
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const unitless = (v, what) => {
  if (isSym(v)) throw new Error(`${what} depends on the viewport`);
  return v.unit === '%' ? v.n / 100 : v.n;
};

/** Parse a colour. Returns null when the value is not a colour. */
export function color(value) {
  const v = value.trim();
  let m;
  if (v in NAMED) {
    const [r, g, b, a] = NAMED[v];
    return { space: 'srgb', coords: [r, g, b], rgb: [r, g, b], alpha: a };
  }
  if ((m = /^#([0-9a-f]{3,8})$/i.exec(v)) && [3, 4, 6, 8].includes(m[1].length)) {
    let hex = m[1];
    if (hex.length < 6) hex = [...hex].map((c) => c + c).join('');
    const ch = [0, 2, 4, 6].map((i) => (i < hex.length ? parseInt(hex.slice(i, i + 2), 16) / 255 : 1));
    return { space: 'srgb', coords: ch.slice(0, 3), rgb: ch.slice(0, 3), alpha: ch[3] };
  }
  if ((m = /^oklch\(([\s\S]*)\)$/.exec(v)) && balanced(m[1])) {
    const [chan, alphaPart] = splitTop(m[1], '/');
    const parts = splitTop(chan, ' ').map((p) => numeric(p));
    if (parts.length !== 3) throw new Error(`oklch() needs three components: ${v}`);
    const L = clamp01(unitless(parts[0], 'lightness'));
    const C = Math.max(0, isSym(parts[1]) ? NaN : parts[1].unit === '%' ? (parts[1].n / 100) * 0.4 : parts[1].n);
    const H = ((unitless(parts[2], 'hue') % 360) + 360) % 360;
    const alpha = alphaPart === undefined ? 1 : clamp01(unitless(numeric(alphaPart), 'alpha'));
    return { space: 'oklch', coords: [L, C, H], rgb: oklchToSrgb(L, C, H), alpha };
  }
  if ((m = /^color-mix\(\s*in srgb\s*,([\s\S]*)\)$/.exec(v)) && balanced(m[1])) {
    const parts = splitTop(m[1], ',').map((part) => {
      const t = splitTop(part, ' ');
      const last = t[t.length - 1];
      const first = t[0];
      const isPct = (x) => /^(calc\(|min\(|max\(|clamp\(|[-+]?[\d.])/.test(x);
      if (t.length > 1 && isPct(last)) return { c: color(t.slice(0, -1).join(' ')), p: unitless(numeric(last), 'percentage') };
      if (t.length > 1 && isPct(first)) return { c: color(t.slice(1).join(' ')), p: unitless(numeric(first), 'percentage') };
      return { c: color(part), p: null };
    });
    if (parts.length !== 2 || !parts[0].c || !parts[1].c) throw new Error(`cannot evaluate ${v}`);
    const [x, y] = parts;
    if (x.p === null && y.p === null) x.p = y.p = 0.5;
    else if (x.p === null) x.p = 1 - y.p;
    else if (y.p === null) y.p = 1 - x.p;
    const total = x.p + y.p;
    if (total <= 0) throw new Error(`color-mix() percentages sum to zero: ${v}`);
    const px = x.p / total;
    const py = y.p / total;
    // Interpolation is on premultiplied values; a sum under 100% scales the alpha.
    const alpha = x.c.alpha * px + y.c.alpha * py;
    const rgb = alpha === 0 ? [0, 0, 0] : x.c.rgb.map((c, i) => (c * x.c.alpha * px + y.c.rgb[i] * y.c.alpha * py) / alpha);
    return { space: 'srgb', coords: rgb, rgb, alpha: alpha * Math.min(1, total) };
  }
  return null;
}

function balanced(s) {
  let d = 0;
  for (const ch of s) {
    if (ch === '(') d++;
    else if (ch === ')') d--;
    if (d < 0) return false;
  }
  return d === 0;
}

/** sRGB channels clipped to the gamut, as a display shows them. */
export const clipped = (c) => c.rgb.map(clamp01);

/** `#rrggbb`, or `#rrggbbaa` when `withAlpha` and the colour is translucent. */
export function hex(c, withAlpha = false) {
  const h = (x) => Math.round(clamp01(x) * 255).toString(16).padStart(2, '0');
  const base = `#${clipped(c).map(h).join('')}`;
  return withAlpha && c.alpha < 1 ? base + h(c.alpha) : base;
}

/** Composite a translucent colour over an opaque one (both sRGB, clipped). */
export function over(fg, bg) {
  const f = clipped(fg);
  const b = clipped(bg);
  const rgb = f.map((c, i) => c * fg.alpha + b[i] * (1 - fg.alpha));
  return { space: 'srgb', coords: rgb, rgb, alpha: 1 };
}

/** Relative luminance (WCAG 2) of an opaque colour. */
export function luminance(c) {
  // The same arithmetic as lint:contrast: unrounded channels, WCAG 2 thresholds.
  const [r, g, b] = clipped(c).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio of `fg` on the opaque `bg`; a translucent `fg` is composited first. */
export function contrast(fg, bg) {
  const f = fg.alpha < 1 ? over(fg, bg) : fg;
  const [hi, lo] = [luminance(f), luminance(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

// ── Whole values ─────────────────────────────────────────────────────

function shadowLayer(part) {
  const tokens = splitTop(part, ' ');
  const lengths = [];
  let col = null;
  let inset = false;
  for (const t of tokens) {
    if (t === 'inset') {
      inset = true;
      continue;
    }
    const c = color(t);
    if (c) {
      col = c;
      continue;
    }
    const n = numeric(t);
    if (isSym(n)) throw new Error('fluid shadow');
    lengths.push(n);
  }
  if (!col || lengths.length < 2 || lengths.length > 4) return null;
  const px = (v) => (v === undefined ? 0 : v.unit === 'rem' ? v.n * ROOT_FONT_PX : v.n);
  return { color: col, offsetX: px(lengths[0]), offsetY: px(lengths[1]), blur: px(lengths[2]), spread: px(lengths[3]), inset };
}

/**
 * Resolve one value to what it computes to.
 *
 * Returns one of
 *   { kind: 'color', color }
 *   { kind: 'dimension', n, unit }        unit is px or rem
 *   { kind: 'duration', n, unit }         unit is ms or s
 *   { kind: 'number', n }
 *   { kind: 'percentage', n }             n is the percentage, 14 for 14%
 *   { kind: 'em', n }                     a length relative to the font size
 *   { kind: 'shadow', layers }
 *   { kind: 'border', width, style, color }
 *   { kind: 'cubicBezier', points }
 *   { kind: 'fluid', css }                depends on the viewport: CSS text only
 *   { kind: 'string', css }               anything else (a keyword, a list)
 */
export function evaluate(value, env) {
  const v = substitute(value, env).trim();
  const c = color(v);
  if (c) return { kind: 'color', color: c };

  let m;
  if ((m = /^cubic-bezier\(([^)]*)\)$/.exec(v))) {
    return { kind: 'cubicBezier', points: m[1].split(',').map((x) => parseFloat(x)) };
  }

  if (/^[-+.\d]|^(calc|min|max|clamp)\(/.test(v) && splitTop(v, ' ').length === 1 && splitTop(v, ',').length === 1) {
    const n = numeric(v);
    if (isSym(n)) return { kind: 'fluid', css: n.sym };
    if (n.unit === '') return { kind: 'number', n: n.n };
    if (n.unit === '%') return { kind: 'percentage', n: n.n };
    if (n.unit === 'em') return { kind: 'em', n: n.n };
    if (LENGTH.has(n.unit)) return { kind: 'dimension', n: n.n, unit: n.unit };
    if (n.unit === 'ms' || n.unit === 's') return { kind: 'duration', n: n.n, unit: n.unit };
    throw new Error(`unsupported unit in ${v}`);
  }

  // A border: a width, a line style and a colour (the rule tokens).
  if ((m = /^(\S+) (solid|dashed|dotted|double) (.+)$/.exec(v))) {
    const col = color(m[3]);
    if (col) {
      try {
        const w = numeric(m[1]);
        if (!isSym(w) && LENGTH.has(w.unit)) return { kind: 'border', width: { n: w.n, unit: w.unit }, style: m[2], color: col };
      } catch {
        /* not a border */
      }
    }
  }

  // A shadow list: every comma-separated part is lengths and a colour.
  if (/\d/.test(v) && /(oklch|color-mix|#|rgb)/.test(v)) {
    try {
      const layers = splitTop(v, ',').map(shadowLayer);
      if (layers.every(Boolean)) return { kind: 'shadow', layers };
    } catch {
      /* not a shadow */
    }
  }

  // Space-separated numbers (the "L C H" working value of the foreground):
  // fold each part so the text is free of calc().
  const parts = splitTop(v, ' ');
  if (parts.length > 1 && splitTop(v, ',').length === 1) {
    try {
      return { kind: 'string', css: parts.map((p) => print(numeric(p))).join(' ') };
    } catch {
      /* a keyword list */
    }
  }
  if (/^(calc|min|max|clamp)\(/.test(v)) {
    const n = numeric(v);
    return { kind: 'fluid', css: print(n) };
  }
  return { kind: 'string', css: v };
}

/** A font-family list as an array of names without quotes. */
export function fontFamilies(value, env) {
  return splitTop(substitute(value, env), ',').map((f) => f.trim().replace(/^(['"])(.*)\1$/, '$2'));
}

export const toPx = (d) => (d.unit === 'rem' ? d.n * ROOT_FONT_PX : d.n);
