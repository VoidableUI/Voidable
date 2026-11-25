# @voidable/theme

CSS theme for Voidable UI — design tokens, primitives, reset, and component styles.

## Install

```bash
npm install @voidable/theme
```

## Usage

Import the full theme (tokens, scoped reset, and all component styles):

```css
@import '@voidable/theme';
```

Or import parts of it, or one component at a time (always with the tokens):

```css
@import '@voidable/theme/tokens';
@import '@voidable/theme/base';        /* html and body; in the full theme already */
@import '@voidable/theme/components/button.css';
@import '@voidable/theme/patterns/page.css';
```

Without a bundler, link the built file directly:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@voidable/theme/dist/void.min.css" />
```

Everything is in named cascade layers (`components.void.reset`, `components.void.tokens`, `components.void.components` and so on), so an unlayered rule in your app overrides the theme without `!important`. See Theming on the docs site.

In a JavaScript entry point processed by a bundler (for example Vite), `import '@voidable/theme';` also works.

## Before components load

Until a component's script has loaded, its tag is an unknown element and the page can flash or jump. `src/pre-upgrade.css`, part of the main entry, styles the not-yet-defined state with `:not(:defined)` rules: closed overlays, inactive tab panels and option lists stay hidden, and the space of inputs, selects, tab lists and similar is reserved. The rules stop applying when the element is defined. See [Loading components](https://voidable.dev/getting-started/loading/#before-a-component-loads).

## Dark and light

Dark is the default (a true black page). Set the `data-theme` attribute on `<html>`, or on any element, to choose a scheme explicitly:

```html
<html data-theme="light">
```

## Retheming: the knobs

The whole theme is derived from about a dozen inputs, in plain CSS, in both colour schemes. To retheme, set knobs; do not edit individual tokens.

```css
:root {
  --void-accent-hue: 250;      /* OKLCH hue in degrees */
  --void-accent-chroma: 0.16;  /* 0 = monochrome (default) */
  --void-radius: 8px;
}
```

| Knob | Default | Changes |
|---|---|---|
| `--void-accent-hue`, `--void-accent-chroma` | `250`, `0` | Accent colour. Chroma 0 is no accent: primary actions are the inverse of the page |
| `--void-neutral-hue`, `--void-neutral-chroma` | `60`, `0.004` | Tint of text, borders and surfaces |
| `--void-page-tint` | `0` | 0 is a pure black or white page; 1 is a soft, tinted page |
| `--void-contrast` | `0.2` | Strength of secondary text and control borders, 0 to 1. Never below WCAG AA |
| `--void-chrome` | `0.3` | Strength of divider lines and container fills, 0 to 1 |
| `--void-radius` | `4px` | Corner radius of a control; other radii scale from it |
| `--void-density` | `1` | Control height (36px at 1), padding and the spacing scale |
| `--void-rhythm` | `1` | Space between groups and sections |
| `--void-font-size` | `0.875rem` | Body text size; other sizes scale from it |
| `--void-font-sans`, `--void-font-mono` | Inter, JetBrains Mono | Typefaces (no font files are shipped) |
| `--void-anim-scale` | `1` | Multiplies every duration; 0 is off |

They are documented in full in [`src/knobs.css`](./src/knobs.css).

### Themes

Turn them on a real application in the [theme builder](https://voidable.dev/theme/) and copy the result. A link to the builder is a theme: every knob is a query parameter named after it without `--void-` (`https://voidable.dev/theme/?accent-hue=162&accent-chroma=0.19&radius=8`).

A theme is a file that sets knobs and nothing else. Eight ship, each about a dozen lines: `void` (the default), `dune` (warm, rounded, comfortable), `console` (dense, sharp, monospace), `orbit` (monochrome, very airy), `capsule` (pill controls), `aurora` (a vivid green accent), `iris` (violet, on a tinted page) and `paper` (a serif, editorial).

### Skins

A skin changes structure, which knobs cannot. It is one rule of token assignments and combines with any theme and any knobs. Two ship: `loft` is soft and elevated (a tinted page, white cards with shadows, no hairlines); `slab` is dense, square and ruled (heavy ink lines, framed boxes with hard offset shadows, an inverted current link). Both prefer the light scheme; `data-theme` still decides when it is set.

```css
@import '@voidable/theme';
@import '@voidable/theme/skins/loft.css';
```

```html
<html data-void-skin="loft">
```

To write your own, see [Build a skin](https://voidable.dev/getting-started/skins/): one `[data-void-skin="mine"] { … }` rule, expanded for nested regions with `expandSkin()` from `@voidable/theme/skin`.

### Component tokens

Below the knobs and the derived semantic tokens sit **component tokens**: per-component override points named `--void-<component>-<part?>-<property>-<state?>`, each defaulting to a semantic or role token. The theme never declares them, so one declaration wins anywhere, with no `!important`:

```css
:root { --void-card-shadow: var(--void-shadow-sm); }   /* every card */
.billing { --void-card-radius: 0; }                    /* the cards of one region */
```

Role tokens restyle a whole kind of component: `--void-container-*`, `--void-float-*`, `--void-control-*`, `--void-field-*`, `--void-item-*-selected` and the `--void-rule*` lines. The full list with defaults is in the [theming guide](https://voidable.dev/getting-started/theming/#component-token-reference) and in `@voidable/theme/component-tokens.json`.

### Tokens as data

Every token, resolved for each theme and skin in both colour schemes, for tools that cannot run CSS:

| Import | Contents |
|---|---|
| `@voidable/theme/dtcg/<theme>.<scheme>.tokens.json` | [Design Tokens Community Group](https://www.designtokens.org/TR/2025.10/format/) format, Format Module 2025.10 (Tokens Studio, Style Dictionary) |
| `@voidable/theme/dtcg/voidable.resolver.json` | A DTCG resolver document listing those files |
| `@voidable/theme/json/<theme>.<scheme>.json` | `{ "--void-color-bg": "#000000", ... }`: custom property to resolved CSS value |
| `@voidable/theme/knobs.json` | The knobs as data: range, step, unit, default, description, and each shipped theme's values |
| `@voidable/theme/component-tokens.json` | Component tokens grouped by component (name, default, what it styles), the role tokens and the naming vocabulary |
| `@voidable/theme/names` | `tokenNames`, `roleTokenNames`, `componentTokenNames`, `componentTokens`, `knobNames`, `themeNames`, `skinNames`, `cssVar()`, and the types `TokenName`, `RoleTokenName`, `ComponentTokenName`, `KnobName`, `ThemeName`, `SkinName` |
| `@voidable/theme/skin` | `expandSkin(css, name)`: a skin source written out for every scope of the theme |

`<theme>` is a theme or skin name, `<scheme>` is `dark` or `light`: `@voidable/theme/dtcg/dune.light.tokens.json`. The values are computed at build time and tested to equal what Chromium computes from the CSS.

```css
@import '@voidable/theme';
@import '@voidable/theme/themes/dune.css';
```

```html
<html data-void-theme="dune">
```

### Part of a page

Knobs take effect on `:root` and on any element that carries `data-void-theme` (named or empty):

```html
<section data-void-theme style="--void-radius: 0px">…</section>
```

A knob set on an element without that attribute changes nothing below it, because the derived tokens are only recomputed on `:root`, `[data-theme]`, `[data-void-theme]` and `[data-shape]`.

### Type roles

`data-void-type` applies a named text role: `label`, `value`, `unit`, `caption`, `heading`, `title`, `body`, `code`. Components use the same `--void-type-<role>-*` tokens, so restyling a role restyles it everywhere.

```html
<span data-void-type="label">Uptime</span>
<span data-void-type="value">99.98</span> <span data-void-type="unit">%</span>
```

### Browser support

`oklch()`, `color-mix()` and `calc()` inside both: Chrome 111, Firefox 113, Safari 16.2.

## Documentation

- [Docs](https://voidable.dev)
- [Storybook](https://voidable.dev/storybook/)
- [GitHub](https://github.com/VoidableUI/Voidable)
- [npm](https://www.npmjs.com/package/@voidable/theme)

## License

MIT
