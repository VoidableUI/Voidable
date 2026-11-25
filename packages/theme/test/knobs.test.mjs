// SPDX-License-Identifier: MIT
//
// The knob data (build/knobs.js) against the CSS it describes, the link
// format of the theme builder, and the evaluator on values with known
// answers.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { color, contrast, evaluate, hex, numeric, over } from '../build/css-eval.js';
import { BUILDER_URL, builderUrl, describe, fontStacks, fromParams, hueName, knobs, parseKnob, rng, surprise, themeCss, toParams } from '../build/knobs.js';
import { environment, knobsToDtcg, readTheme, resolve, toDtcg } from '../build/tokens.js';
import { load } from '../scripts/export-tokens.mjs';

const { source, themes, skinTokens } = load();
const defaults = source.knobs;

test('the knob data lists exactly the knobs of knobs.css', () => {
  assert.deepEqual(knobs.map((k) => k.name).sort(), Object.keys(defaults).sort());
});

test('every default and every shipped theme value parses to itself', () => {
  for (const [theme, values] of [['defaults', defaults], ...Object.entries(themes)]) {
    for (const [name, value] of Object.entries(values)) {
      const knob = knobs.find((k) => k.name === name);
      assert.ok(knob, `${theme}: ${name} is not a knob`);
      const parsed = parseKnob(knob, value);
      if (knob.type === 'fontFamily') assert.equal(parsed.replace(/\s+/g, ' '), value.replace(/"/g, "'").replace(/\s+/g, ' '));
      else assert.equal(parseFloat(parsed), parseFloat(value), `${theme}: ${name}`);
    }
  }
});

test('a link round-trips every knob', () => {
  const values = {
    ...defaults,
    '--void-accent-hue': '162',
    '--void-accent-chroma': '0.185',
    '--void-neutral-hue': '200',
    '--void-neutral-chroma': '0.013',
    '--void-page-tint': '0.35',
    '--void-contrast': '0.55',
    '--void-chrome': '0.05',
    '--void-radius': '999px',
    '--void-density': '0.83',
    '--void-rhythm': '1.35',
    '--void-font-size': '0.9375rem',
    '--void-font-sans': "'Iowan Old Style', 'Palatino Linotype', 'URW Palladio L', P052, serif",
    '--void-font-mono': "ui-monospace, 'SF Mono', 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace",
    '--void-anim-scale': '0.5',
  };
  const url = builderUrl(values, defaults, { skin: 'loft', name: 'acme', view: { screen: 'table', scheme: 'light' } });
  const back = fromParams(new URL(url).searchParams, defaults, themes);
  assert.deepEqual(back.values, values);
  assert.equal(back.skin, 'loft');
  assert.equal(back.name, 'acme');
  assert.deepEqual(back.view, { screen: 'table', scheme: 'light', device: undefined });
  // every knob is in the link, by its own name
  for (const k of knobs) assert.ok(new URL(url).searchParams.has(k.param), `${k.param} missing from ${url}`);
});

test('the default theme is the bare URL, and a shipped theme is ?theme=name plus nothing', () => {
  assert.equal(builderUrl(defaults, defaults), 'https://voidable.dev/theme/');
  const dune = fromParams('theme=dune', defaults, themes);
  assert.deepEqual(dune.values, { ...defaults, ...themes.dune });
  assert.equal(dune.theme, 'dune');
  const tweaked = fromParams('theme=dune&radius=0', defaults, themes);
  assert.equal(tweaked.values['--void-radius'], '0px');
  assert.equal(tweaked.values['--void-accent-hue'], themes.dune['--void-accent-hue']);
});

test('a link accepts what a person or an agent would type, and ignores what is not a value', () => {
  const read = (q) => fromParams(q, defaults, themes).values;
  assert.equal(read('radius=8')['--void-radius'], '8px');
  assert.equal(read('radius=0.5rem')['--void-radius'], '8px');
  assert.equal(read('font-size=14px')['--void-font-size'], '0.875rem');
  assert.equal(read('font-size=1')['--void-font-size'], '1rem');
  assert.equal(read('font-sans=serif')['--void-font-sans'], "'Iowan Old Style', 'Palatino Linotype', 'URW Palladio L', P052, serif");
  assert.equal(read('font-sans=Georgia%2C+serif')['--void-font-sans'], 'Georgia, serif');
  for (const bad of ['radius=red', 'accent-hue=12px', 'font-sans=x%3B%7D+body%7Bdisplay%3Anone', 'font-sans=url(x)', 'contrast=%3Cscript%3E', 'skin=nope', 'theme=nope']) {
    const got = fromParams(bad, defaults, themes);
    assert.deepEqual(got.values, defaults, bad);
    assert.equal(got.skin, undefined);
  }
  assert.equal(fromParams('name=My+Theme%21%3C', defaults, themes).name, 'my-theme');
});

test('the theme CSS sets knobs only and reads back as the same theme', () => {
  const values = { ...defaults, ...themes.console };
  const css = themeCss(values, { name: 'acme', comment: 'made in the builder' });
  assert.match(css, /^\/\* made in the builder \*\/\n\[data-void-theme="acme"\] \{/);
  assert.deepEqual(readTheme(css), values);
  assert.match(themeCss(values), /^:root \{/);
  assert.match(themeCss(values, { skin: 'loft' }), /^@import '@voidable\/theme\/skins\/loft\.css';\n:root/);
});

test('the description names the look and the exact knobs', () => {
  const text = describe({ ...defaults, ...themes.dune }, defaults, { url: 'https://voidable.dev/theme/?theme=dune' });
  assert.match(text, /clear red accent|clear orange accent/);
  assert.match(text, /warm greys/);
  assert.match(text, /--void-radius: 10px/);
  assert.match(text, /Preview: https:\/\/voidable\.dev\/theme\/\?theme=dune$/);
  assert.match(describe(defaults, defaults), /no accent colour/);
  assert.equal(hueName(250), 'blue');
  assert.equal(hueName(162), 'green');
});

test('a surprise is reproducible from its seed, sets valid knobs, and keeps contrast', () => {
  assert.deepEqual(surprise(defaults, rng(7)), surprise(defaults, rng(7)));
  const seen = new Set();
  for (let seed = 1; seed <= 200; seed++) {
    const values = surprise(defaults, rng(seed));
    seen.add(JSON.stringify(values));
    for (const k of knobs) {
      assert.equal(parseKnob(k, values[k.name]), values[k.name], `seed ${seed}: ${k.name}`);
      if (k.type !== 'fontFamily' && values[k.name] !== '999px') {
        const n = parseFloat(values[k.name]);
        assert.ok(n >= k.min - 1e-9 && n <= k.max + 1e-9, `seed ${seed}: ${k.name} = ${n} outside ${k.min}–${k.max}`);
      }
    }
    for (const scheme of ['dark', 'light']) {
      const r = resolve(environment(source, { scheme, knobs: values }));
      const c = (n) => r.get(`--void-color-${n}`).color;
      const page = c('bg');
      for (const fg of ['text', 'text-secondary', 'text-muted', 'accent']) {
        const ratio = contrast(c(fg), page);
        assert.ok(ratio >= 4.5, `seed ${seed}, ${scheme}: ${fg} on the page is ${ratio.toFixed(2)}`);
      }
      assert.ok(contrast(c('text-on-accent'), c('accent')) >= 4.5, `seed ${seed}, ${scheme}: text on accent`);
    }
  }
  assert.ok(seen.size > 190, 'surprises should differ');
});

test('the evaluator agrees with values worked by hand', () => {
  assert.deepEqual(numeric('calc(0.25rem * 1.5)'), { n: 0.375, unit: 'rem' });
  assert.deepEqual(numeric('clamp(0, 0.2 + 1, 1)'), { n: 1, unit: '' });
  assert.deepEqual(numeric('min(calc(4px * 2), calc(4px + 8px), 24px)'), { n: 8, unit: 'px' });
  assert.deepEqual(numeric('calc(1rem + 4px)'), { n: 20, unit: 'px' });
  assert.equal(numeric('clamp(1rem, calc(4vw * 1.1), 3rem)').sym, 'clamp(1rem, 4.4vw, 3rem)');
  assert.equal(hex(color('oklch(1 0 0)')), '#ffffff');
  assert.equal(hex(color('oklch(0 0 0)')), '#000000');
  assert.equal(hex(color('#abc')), '#aabbcc');
  assert.equal(hex(color('color-mix(in srgb, #ffffff 50%, #000000)')), '#808080');
  assert.equal(hex(color('color-mix(in srgb, #ff0000 20%, transparent)'), true), '#ff000033');
  assert.equal(contrast(color('#ffffff'), color('#000000')), 21);
  assert.equal(Math.round(contrast(color('#777777'), color('#ffffff')) * 100) / 100, 4.48);
  assert.equal(Math.round(contrast(color('#767676'), color('#ffffff')) * 100) / 100, 4.54);
  assert.equal(hex(over(color('oklch(0 0 0 / 0.5)'), color('#ffffff'))), '#808080');
  assert.equal(evaluate('var(--a, 3px)', {}).n, 3);
  assert.throws(() => evaluate('var(--missing)', {}), /undefined custom property/);
  assert.throws(() => numeric('calc(1px * 2px)'), /cannot multiply/);
});

test('the DTCG documents follow the 2025.10 format', () => {
  for (const [what, cfg] of [['void', { knobs: themes.void }], ['loft', { skin: skinTokens.loft }]]) {
    const doc = toDtcg(resolve(environment(source, { scheme: 'light', ...cfg })));
    const types = new Set();
    const walk = (node, path, inherited) => {
      for (const [key, child] of Object.entries(node)) {
        if (key.startsWith('$') && key !== '$root') continue;
        assert.ok(!/[{}.]/.test(key), `${what}: token name ${key} holds a reserved character`);
        const type = child.$type ?? inherited;
        if ('$value' in child) {
          assert.ok(type, `${what}: ${[...path, key].join('.')} has no $type`);
          types.add(type);
          const v = child.$value;
          if (type === 'color') {
            assert.equal(v.colorSpace, 'srgb');
            assert.equal(v.components.length, 3);
            for (const c of v.components) assert.ok(c >= 0 && c <= 1);
            assert.match(v.hex, /^#[0-9a-f]{6}$/);
          }
          if (type === 'dimension') assert.ok(['px', 'rem'].includes(v.unit) && typeof v.value === 'number');
          if (type === 'duration') assert.ok(['ms', 's'].includes(v.unit));
          if (type === 'fontWeight') assert.ok(v >= 1 && v <= 1000);
          if (type === 'cubicBezier') assert.equal(v.length, 4);
        } else walk(child, [...path, key], type);
      }
    };
    walk(doc, [], undefined);
    for (const t of ['color', 'dimension', 'duration', 'number', 'fontFamily', 'fontWeight', 'shadow', 'cubicBezier', 'typography']) assert.ok(types.has(t), `${what}: no ${t} token`);
    assert.equal(doc.color.bg.$value.hex, what === 'void' ? '#ffffff' : doc.color.page.$value.hex);
    assert.ok(doc.measure.$root, 'a one-word property beside a group is its $root token');
  }
  const k = knobsToDtcg({ ...defaults, ...themes.paper });
  assert.deepEqual(k.knob.radius.$value, { value: 2, unit: 'px' });
  assert.equal(k.knob['accent-hue'].$value, 258);
  assert.equal(k.knob['font-sans'].$value[0], 'Iowan Old Style');
  assert.deepEqual(toParams({ ...defaults, ...themes.paper }, defaults).get('font-sans'), 'serif');
});

test('the voidable skill documents every knob, its default, and the link format', () => {
  const skill = readFileSync(new URL('../../../tools/voidable/internal/infra/skillgen/templates/SKILL.md.tmpl', import.meta.url), 'utf8');
  assert.ok(skill.includes(BUILDER_URL), 'the skill names the builder URL');
  for (const k of knobs) {
    const row = skill.split('\n').find((line) => line.startsWith(`| \`${k.name}\``));
    assert.ok(row, `the skill has no row for ${k.name}`);
    if (k.type !== 'fontFamily') {
      assert.ok(row.includes(`\`${defaults[k.name]}\``), `${k.name}: the skill's default differs from knobs.css (${defaults[k.name]})`);
      assert.ok(row.includes(`${k.min}`) && row.includes(`${k.max}`), `${k.name}: the skill's range differs from ${k.min}–${k.max}`);
    }
    assert.ok(skill.includes(`\`${k.param}\``), `the skill does not name the parameter ${k.param}`);
  }
  for (const key of [...Object.keys(fontStacks['--void-font-sans']), ...Object.keys(fontStacks['--void-font-mono'])]) {
    assert.ok(skill.includes(`\`${key}\``), `the skill does not list the font key ${key}`);
  }
  for (const theme of Object.keys(themes)) assert.ok(skill.includes(`\`${theme}\``), `the skill does not list the theme ${theme}`);
  // the example link in the skill is a real theme
  const example = /https:\/\/voidable\.dev\/theme\/\?[^\s`]+/.exec(skill)[0];
  const got = fromParams(new URL(example).searchParams, defaults, themes).values;
  assert.equal(got['--void-accent-hue'], '162');
  assert.equal(got['--void-radius'], '8px');
});
