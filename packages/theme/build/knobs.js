// SPDX-License-Identifier: MIT
//
// The knobs as data: what knobs.css says in comments, in a form a tool can
// read. The defaults are not repeated here; they are parsed from knobs.css
// (test/knobs.test.mjs fails if the two lists differ). The theme builder on
// the docs site, the token export and `@voidable/theme/knobs.json` all read
// this file, so a range or a URL parameter is defined once.
//
// No Node or DOM APIs: the builder imports it in the page.

/** Where the theme builder lives. A link to a theme is this URL plus the parameters below. */
export const BUILDER_URL = 'https://voidable.dev/theme/';

/**
 * `param` is the URL parameter of the builder: the knob's name without
 * `--void-`. `unit` is appended to a bare number (radius=8 is 8px).
 * `min`, `max` and `step` are the range the builder offers; the derivation
 * clamps the colour knobs itself, so a value outside it is safe.
 */
export const knobs = [
  { name: '--void-accent-hue', group: 'colour', type: 'number', min: 0, max: 360, step: 1, unit: '', label: 'Accent hue', description: 'Hue of the accent as an OKLCH angle in degrees: 30 red, 60 orange, 90 yellow, 150 green, 200 teal, 250 blue, 300 purple, 350 pink. No effect while the accent chroma is 0.' },
  { name: '--void-accent-chroma', group: 'colour', type: 'number', min: 0, max: 0.25, step: 0.005, unit: '', label: 'Accent chroma', description: 'How colourful the accent is. 0 is no accent colour: primary actions are the inverse of the page. 0.10 to 0.20 is a coloured accent.' },
  { name: '--void-neutral-hue', group: 'colour', type: 'number', min: 0, max: 360, step: 1, unit: '', label: 'Neutral hue', description: 'Hue of the greys: text, borders and surfaces.' },
  { name: '--void-neutral-chroma', group: 'colour', type: 'number', min: 0, max: 0.04, step: 0.001, unit: '', label: 'Neutral chroma', description: 'Tint of the greys. 0 is pure grey, 0.004 barely tinted, 0.02 clearly tinted. Capped at 0.04.' },
  { name: '--void-page-tint', group: 'colour', type: 'number', min: 0, max: 1, step: 0.05, unit: '', label: 'Page tint', description: 'How much of the neutral tint the page takes. 0 is a pure black or white page; 1 is off-white paper in light and a lifted near-black in dark.' },
  { name: '--void-contrast', group: 'colour', type: 'number', min: 0, max: 1, step: 0.05, unit: '', label: 'Contrast', description: 'Strength of secondary text and control borders. 0 is the softest setting that still meets WCAG AA; 1 is the strongest.' },
  { name: '--void-chrome', group: 'colour', type: 'number', min: 0, max: 1, step: 0.05, unit: '', label: 'Chrome', description: 'How much the containers draw: the strength of divider lines and the fill of cards and panels.' },
  { name: '--void-radius', group: 'shape', type: 'dimension', min: 0, max: 20, step: 1, unit: 'px', label: 'Radius', description: 'Corner radius of a control; other radii scale from it. 0px is square, 999px makes controls pills.' },
  { name: '--void-density', group: 'space', type: 'number', min: 0.75, max: 1.25, step: 0.01, unit: '', label: 'Density', description: 'Size of things inside components: control height (36px at 1), padding and the spacing scale.' },
  { name: '--void-rhythm', group: 'space', type: 'number', min: 0.6, max: 1.4, step: 0.05, unit: '', label: 'Rhythm', description: 'Space between groups and sections of a page, independent of density.' },
  { name: '--void-font-size', group: 'type', type: 'dimension', min: 0.75, max: 1.0625, step: 0.03125, unit: 'rem', label: 'Text size', description: 'Body text size; every other text size scales from it.' },
  { name: '--void-font-sans', group: 'type', type: 'fontFamily', label: 'Typeface', description: 'The typeface of the interface. The theme ships no font files.' },
  { name: '--void-font-mono', group: 'type', type: 'fontFamily', label: 'Monospace', description: 'The typeface of labels, code and ids.' },
  { name: '--void-anim-scale', group: 'motion', type: 'number', min: 0, max: 2, step: 0.1, unit: '', label: 'Animation', description: 'Multiplies every duration. 0 switches animation off; 2 is half speed.' },
].map((k) => ({ ...k, param: k.name.slice('--void-'.length) }));

/** The groups, in the order the builder shows them. */
export const groups = [
  { id: 'colour', label: 'Colour' },
  { id: 'shape', label: 'Shape' },
  { id: 'space', label: 'Space' },
  { id: 'type', label: 'Type' },
  { id: 'motion', label: 'Motion' },
];

/**
 * Font stacks the builder offers by a short key (font-sans=serif in a
 * link). Only Inter and JetBrains Mono need loading; the rest are fonts
 * the operating system already has. A link may also carry any CSS
 * font-family list.
 */
export const fontStacks = {
  '--void-font-sans': {
    inter: { label: 'Inter', css: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif" },
    system: { label: 'System', css: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" },
    humanist: { label: 'Humanist', css: "Seravek, 'Gill Sans Nova', Ubuntu, Calibri, 'DejaVu Sans', source-sans-pro, sans-serif" },
    geometric: { label: 'Geometric', css: "Avenir, Montserrat, Corbel, 'URW Gothic', source-sans-pro, sans-serif" },
    rounded: { label: 'Rounded', css: "ui-rounded, 'Hiragino Maru Gothic ProN', Quicksand, Comfortaa, Manjari, 'Arial Rounded MT', Calibri, source-sans-pro, sans-serif" },
    serif: { label: 'Serif', css: "'Iowan Old Style', 'Palatino Linotype', 'URW Palladio L', P052, serif" },
    mono: { label: 'Monospace', css: "'JetBrains Mono', ui-monospace, 'SF Mono', 'Fira Code', monospace" },
  },
  '--void-font-mono': {
    jetbrains: { label: 'JetBrains Mono', css: "'JetBrains Mono', ui-monospace, 'SF Mono', 'Fira Code', monospace" },
    system: { label: 'System', css: "ui-monospace, 'SF Mono', 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace" },
  },
};

/**
 * Skins: structure the knobs cannot express, as one rule of token
 * assignments each (src/skins/). lint:component-tokens keeps this list and
 * the files in step.
 */
export const skins = [
  { id: 'loft', label: 'Loft', description: 'Soft and elevated: a tinted page, white cards with shadows, no hairlines.' },
  { id: 'slab', label: 'Slab', description: 'Dense, square and ruled: ink lines, framed boxes with hard shadows, inverted selection.' },
];

const round = (n, places = 4) => Math.round(n * 10 ** places) / 10 ** places;
const normFont = (s) => s.replace(/"/g, "'").replace(/\s*,\s*/g, ', ').replace(/\s+/g, ' ').trim();

/** The key of a font stack the builder knows, or undefined. */
export function fontKey(name, css) {
  const stacks = fontStacks[name] ?? {};
  return Object.keys(stacks).find((k) => normFont(stacks[k].css) === normFont(css));
}

/** A font-family list is letters, digits, spaces, quotes, commas, hyphens and underscores, and nothing else. */
export const isFontList = (s) => /^[\w\s,'"-]{1,300}$/.test(s) && !/--|\/\*/.test(s);

/**
 * Parse one knob value from a link or from CSS into its canonical CSS
 * text, or return undefined when it is not a value for that knob. Numbers
 * are kept as written (the derivation clamps); a length gets the knob's
 * unit when it has none.
 */
export function parseKnob(knob, raw) {
  const text = String(raw).trim();
  if (knob.type === 'fontFamily') {
    const stack = fontStacks[knob.name]?.[text.toLowerCase()];
    if (stack) return stack.css;
    return isFontList(text) ? normFont(text) : undefined;
  }
  const m = /^(-?(?:\d+\.?\d*|\.\d+))(px|rem)?$/.exec(text);
  if (!m) return undefined;
  let n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return undefined;
  if (knob.type === 'number') return m[2] ? undefined : String(round(n, 4));
  let unit = m[2] ?? knob.unit;
  // One unit per knob, so two links to the same theme are the same link.
  if (unit !== knob.unit) {
    n = unit === 'px' ? n / 16 : n * 16;
    unit = knob.unit;
  }
  return `${round(n, 5)}${unit}`;
}

/** The numeric part of a canonical knob value. */
export const knobNumber = (value) => parseFloat(value);

/**
 * Knob values for a link.
 *
 * `values` maps knob names to canonical CSS text. Only knobs that differ
 * from `defaults` are written, so the default theme is the bare URL.
 * Options: `skin`, `name`, and anything in `view` (screen, scheme,
 * device), which the builder restores but a theme does not contain.
 */
export function toParams(values, defaults, { skin, name, view = {} } = {}) {
  const p = new URLSearchParams();
  for (const k of knobs) {
    const v = values[k.name];
    if (v === undefined || v === defaults[k.name]) continue;
    if (k.type === 'fontFamily') p.set(k.param, fontKey(k.name, v) ?? v);
    else p.set(k.param, k.unit && v.endsWith(k.unit) ? v.slice(0, -k.unit.length) : v);
  }
  if (skin) p.set('skin', skin);
  if (name) p.set('name', name);
  for (const [key, value] of Object.entries(view)) if (value) p.set(key, value);
  return p;
}

/** The link to a theme in the builder. */
export function builderUrl(values, defaults, options = {}, base = BUILDER_URL) {
  const q = toParams(values, defaults, options).toString();
  return q ? `${base}?${q}` : base;
}

/**
 * Read a link. `themes` maps theme names to their knob values;
 * `?theme=dune` starts from that theme and the other parameters override
 * it. Unknown parameters and values that do not parse are ignored.
 */
export function fromParams(params, defaults, themes = {}) {
  const p = params instanceof URLSearchParams ? params : new URLSearchParams(params);
  const theme = p.get('theme');
  const base = theme && Object.hasOwn(themes, theme) ? { ...defaults, ...themes[theme] } : { ...defaults };
  const values = { ...base };
  for (const k of knobs) {
    if (!p.has(k.param)) continue;
    const parsed = parseKnob(k, p.get(k.param));
    if (parsed !== undefined) values[k.name] = parsed;
  }
  const skinId = p.get('skin');
  const rawName = p.get('name') ?? '';
  return {
    values,
    theme: theme && Object.hasOwn(themes, theme) ? theme : undefined,
    skin: skins.some((s) => s.id === skinId) ? skinId : undefined,
    name: slug(rawName),
    view: { screen: p.get('screen') ?? undefined, scheme: p.get('scheme') ?? undefined, device: p.get('device') ?? undefined },
  };
}

/** A theme name as it appears in a selector and a file name. */
export const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

/**
 * The theme as a CSS file: one rule that sets knobs. Every knob is written,
 * so the file stands alone. With a skin it imports the skin's stylesheet;
 * given `skinCss` (the skin written out by build/skins.js) it holds the
 * skin's token assignments instead, so the one file is the whole look.
 */
export function themeCss(values, { name = '', skin, comment, skinCss } = {}) {
  const selector = name ? `[data-void-theme="${name}"]` : ':root';
  const lines = knobs.filter((k) => values[k.name] !== undefined).map((k) => `  ${k.name}: ${values[k.name]};`);
  const head = [];
  if (comment) head.push(`/* ${comment} */`);
  if (skin && !skinCss) head.push(`@import '@voidable/theme/skins/${skin}.css';`);
  const rule = `${head.join('\n')}${head.length ? '\n' : ''}${selector} {\n${lines.join('\n')}\n}\n`;
  if (!skin || !skinCss) return rule;
  const label = skins.find((s) => s.id === skin)?.label ?? skin;
  return `${rule}\n/* The ${label} skin: role and component tokens, in the layer above the\n   components. It applies where data-void-skin="${skin}" is set. */\n@layer components.void.skins {\n${skinCss.trim().split('\n').map((l) => (l ? `  ${l}` : l)).join('\n')}\n}\n`;
}

// ── Describing a theme in words ──────────────────────────────────────

const HUES = [
  [15, 'rose'], [40, 'red'], [60, 'orange'], [80, 'amber'], [105, 'yellow'], [135, 'lime'], [172, 'green'], [185, 'teal'],
  [215, 'cyan'], [245, 'sky blue'], [270, 'blue'], [295, 'violet'], [320, 'purple'], [345, 'magenta'], [361, 'rose'],
];
/** A plain name for an OKLCH hue angle. */
export const hueName = (h) => HUES.find(([limit]) => (((h % 360) + 360) % 360) < limit)[1];

const pick = (n, steps) => steps.find(([limit]) => n <= limit)[1];

/**
 * One sentence that says what the theme looks like, then the exact knob
 * values, for pasting into a prompt.
 */
export function describe(values, defaults, { skin, url } = {}) {
  const n = (name) => knobNumber(values[name] ?? defaults[name]);
  const chroma = n('--void-accent-chroma');
  const accent = chroma < 0.02 ? 'no accent colour (primary actions are the inverse of the page)' : `${pick(chroma, [[0.08, 'a muted'], [0.15, 'a clear'], [1, 'a vivid']])} ${hueName(n('--void-accent-hue'))} accent`;
  const nc = n('--void-neutral-chroma');
  const greys = nc < 0.002 ? 'pure greys' : `${pick(nc, [[0.008, 'barely'], [0.018, 'lightly'], [1, 'clearly']])} ${temperature(n('--void-neutral-hue'))} greys`;
  const tint = n('--void-page-tint');
  const page = skin === 'loft' ? 'a soft tinted page with lifted white cards and shadows instead of hairlines' : skin === 'slab' ? `${tint < 0.15 ? 'a pure black or white page' : 'a tinted page'} ruled with heavy ink lines, square framed boxes with hard offset shadows and an inverted current link` : tint < 0.15 ? 'a pure black or white page' : tint < 0.6 ? 'a slightly tinted page' : 'a soft tinted page';
  const radius = n('--void-radius');
  const corners = skin === 'slab' ? 'square corners' : radius >= 100 ? 'pill-shaped controls' : radius === 0 ? 'square corners' : `${radius}px corners`;
  const density = pick(n('--void-density'), [[0.88, 'compact'], [1.06, 'modest'], [9, 'roomy']]);
  const rhythm = pick(n('--void-rhythm'), [[0.85, 'tight'], [1.1, 'generous'], [9, 'very generous']]);
  const chrome = skin ? '' : `, ${pick(n('--void-chrome'), [[0.15, 'almost no chrome'], [0.55, 'hairline dividers'], [9, 'clear dividers and filled containers']])}`;
  const sans = values['--void-font-sans'] ?? defaults['--void-font-sans'];
  const face = fontStacks['--void-font-sans'][fontKey('--void-font-sans', sans)]?.label ?? sans.split(',')[0].replace(/['"]/g, '');
  const size = Math.round(n('--void-font-size') * 16 * 10) / 10;
  const set = knobs
    .filter((k) => values[k.name] !== undefined && values[k.name] !== defaults[k.name])
    .map((k) => `${k.name}: ${values[k.name]}`)
    .join('; ');
  const look = `A Voidable theme with ${accent}, ${greys} on ${page}, ${corners}, ${density} controls with ${rhythm} spacing${chrome}, set in ${face} at ${size}px.`;
  const how = set ? ` Set these knobs on :root and nothing else: ${set}.` : ' It is the default: set no knobs.';
  const skinNote = skin ? ` Import '@voidable/theme/skins/${skin}.css' and put data-void-skin="${skin}" on <html>.` : '';
  return `${look}${how}${skinNote}${url ? ` Preview: ${url}` : ''}`;
}

function temperature(hue) {
  const h = ((hue % 360) + 360) % 360;
  if (h < 115 || h >= 330) return 'warm';
  if (h < 200) return 'green-tinted';
  if (h < 290) return 'cool';
  return 'violet-tinted';
}

// ── A harmonious random theme ────────────────────────────────────────
// Not noise: a few decisions a designer would make, each constraining the
// next. One hue is chosen; the greys take that hue or its warm or cool
// neighbour at a low chroma; shape, density and rhythm come from one
// "character" so a theme is consistently crisp, soft or technical.

/** A small seeded generator (mulberry32), so a surprise can be reproduced from its seed. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CHARACTERS = [
  // crisp: sharp corners, hairlines, pure page
  { radius: [0, 2, 3, 4], density: [0.9, 1], rhythm: [1, 1.2], chrome: [0.1, 0.4], tint: [0, 0], contrast: [0.2, 0.5], fonts: ['inter', 'inter', 'system', 'geometric'], size: [0.8125, 0.875] },
  // soft: round corners, filled containers, tinted page
  { radius: [8, 10, 12, 14], density: [1, 1.14], rhythm: [1, 1.2], chrome: [0.5, 0.95], tint: [0.5, 1], contrast: [0.15, 0.4], fonts: ['inter', 'humanist', 'rounded', 'system'], size: [0.875, 0.9375] },
  // technical: square or nearly, compact, strong lines
  { radius: [0, 0, 2], density: [0.8, 0.92], rhythm: [0.7, 0.95], chrome: [0.4, 0.7], tint: [0, 0.3], contrast: [0.35, 0.6], fonts: ['mono', 'inter', 'system'], size: [0.8125, 0.875] },
  // editorial: a serif, paper, little chrome, room to read
  { radius: [0, 2, 4], density: [1, 1.08], rhythm: [1.1, 1.35], chrome: [0, 0.25], tint: [0.6, 1], contrast: [0.25, 0.5], fonts: ['serif', 'serif', 'humanist'], size: [0.9375, 1] },
  // pill: fully round controls, airy, quiet
  { radius: [999], density: [1, 1.1], rhythm: [1.1, 1.3], chrome: [0.1, 0.35], tint: [0, 0.4], contrast: [0.15, 0.35], fonts: ['inter', 'geometric', 'system'], size: [0.875, 0.9375] },
];

/** A random theme that hangs together. Returns canonical knob values for every knob. */
export function surprise(defaults, random = Math.random) {
  const between = ([lo, hi], step) => Math.round((lo + (hi - lo) * random()) / step) * step;
  const one = (list) => list[Math.floor(random() * list.length)];
  const c = one(CHARACTERS);
  const hue = Math.round(random() * 359);
  // One theme in five has no accent colour at all, which is the house style.
  const mono = random() < 0.2;
  // Greys: the accent's own hue, or its nearest warm (70) or cool (250) anchor.
  const relation = random();
  const neutralHue = relation < 0.55 ? hue : hue > 110 && hue < 320 ? 250 : 70;
  const tint = between(c.tint, 0.05);
  // A tinted page wants tinted greys; a pure page wants them nearly neutral.
  const neutralChroma = round(tint > 0.4 ? 0.012 + random() * 0.018 : 0.003 + random() * 0.009, 3);
  const values = { ...defaults };
  const set = (name, v) => {
    const k = knobs.find((x) => x.name === name);
    values[name] = parseKnob(k, v);
  };
  set('--void-accent-hue', hue);
  set('--void-accent-chroma', mono ? 0 : round(0.11 + random() * 0.09, 2));
  set('--void-neutral-hue', neutralHue);
  set('--void-neutral-chroma', neutralChroma);
  set('--void-page-tint', round(tint, 2));
  set('--void-contrast', round(between(c.contrast, 0.05), 2));
  set('--void-chrome', round(between(c.chrome, 0.05), 2));
  set('--void-radius', one(c.radius));
  set('--void-density', round(between(c.density, 0.02), 2));
  set('--void-rhythm', round(between(c.rhythm, 0.05), 2));
  set('--void-font-size', one(c.size));
  set('--void-font-sans', one(c.fonts));
  return values;
}
