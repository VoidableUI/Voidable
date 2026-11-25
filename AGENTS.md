# Void UI

A component library monorepo built on Lit 3 web components with framework adapters, design tokens, and a strict theme-separation architecture.

- **npm scope**: `@voidable/*`
- **GitHub**: `github.com/VoidableUI/Voidable`
- **Domain**: `voidable.dev`
- **License**: MIT

## Packages

| Package | Path | Description |
|---------|------|-------------|
| `@voidable/ui` | `packages/ui/` | Lit web components (core), generated typings (`@voidable/ui/types/*`), Angular forms accessor (`@voidable/ui/angular`) |
| `@voidable/theme` | `packages/theme/` | CSS custom properties, design tokens, resets |
| `@voidable/ui-react` | `packages/react/` | React adapter |
| `@voidable/ui-hotwire` | `packages/hotwire/` | Stimulus controller and Turbo morph protection |
| `@voidable/ui-alpine` | `packages/alpine/` | Alpine.js plugin and Livewire morph protection |
| `@voidable/ui-liveview` | `packages/liveview/` | Phoenix LiveView hooks |
| `@voidable/storybook` | `packages/storybook/` | Storybook (private, published to GH Pages) |
| — | `docs/` | Documentation site (Astro Starlight, published to GH Pages) |

Server-side companions live inside the adapter packages and are released together with the npm packages, at the same version:

| Package | Path | Registry |
|---------|------|----------|
| `live_voidable` | `packages/liveview/hex/` | Hex |
| `voidable-hotwire` | `packages/hotwire/gem/` | RubyGems |
| `voidable/laravel` | `packages/alpine/laravel/` | Composer (via a split repo) |

`packages/voidable-gem/` holds a second gemspec named `voidable` whose relationship to `voidable-hotwire` is not documented. The Qwik and Astro pages on the docs site are guides, not packages; `examples/` holds runnable sample apps.

Counts of components, custom elements and adapter packages are not maintained by hand: the docs site derives them at build time (`docs/src/lib/stats.ts`). Do not hard-code them in new prose.

## Architecture

### Light DOM Web Components

All components extend `VoidElement`, a base class that overrides `createRenderRoot()` to return `this`, eliminating Shadow DOM. This allows CSS custom properties from any ancestor scope to style components without piercing boundaries.

Exception (#52): `<void-dialog>` and `<void-drawer>` are the only components with a shadow root (`attachChrome` in `packages/ui/src/parts.ts`), for internal structure the author never writes: the native `<dialog>` that `showModal()` needs, around a `<slot>`, and a close button. The author's parts stay light-DOM children; the theme styles the internals through `::part(surface)` and `::part(close)`. Nothing else has a shadow root: a dismissible notice (alert, banner, toast) takes an author-written `-close` part wrapping the author's own button.

### Theme Separation (Core Tenet)

Without a theme package loaded, components are completely devoid of styling. `@voidable/ui` ships **zero visual CSS**. All visual properties resolve through `--void-*` CSS custom properties defined by a theme package. Component CSS may reference `var(--void-*)` tokens but those tokens have **no fallback values** in the component package. Theme loading is the consumer's responsibility.

### Framework Adapters

- **React** (`@voidable/ui-react`): Uses a `wrapWc` factory + `useWcEvents` hook pattern. React does not forward custom events to Custom Elements natively, so the adapter bridges this gap.
- **SolidJS / Vue / Svelte / Angular**: No package. A package survives only if it holds runtime behaviour a user cannot get from `@voidable/ui` plus its generated output, so these frameworks are served by configuration, documented in `docs/src/content/docs/frameworks/`, and by what the `@voidable/ui` build generates from the Custom Elements Manifest (`packages/ui/cem/generate.js`, never hand-maintained): typings at `@voidable/ui/types/{elements,react,solid,solid2,svelte,vue}` (Solid 2 is a separate entry because its JSX namespace lives in `@solidjs/web` and it dropped `on:`), and for Angular a component-agnostic `ControlValueAccessor` at `@voidable/ui/angular` (`VoidValueAccessor`, written in Angular's partial-compilation format from `cem/angular-accessor.*.template`; its selector and per-tag table come from the manifest). Angular's template type checker cannot check custom element bindings, so there are no Angular typings. Do not add a package for these frameworks; extend the generator.
- **Hotwire / Alpine / LiveView**: Server-rendered stacks. Each adapter bridges Voidable custom events to the framework (Stimulus controller, `x-void-on` directive, LiveView hooks) and protects component state across DOM morphs. The framework's own bindings come first (`phx-click`, `phx-change`, `phx-submit` work on the components); the LiveView bridge is opt-in per element (`events` on the `live_voidable` components), and generated HEEx/Blade components write no attribute the caller did not set. Morph hooks are re-entrant: `voidBeforeMorph` may run twice before re-projection and may be handed a rendered copy of an element (LiveView's lock clones); typing under morphs from all three frameworks is covered by the server browser tests (`typeFast`).

### Development warnings (`@voidable/ui/dev`)

A separate entry (`packages/ui/src/dev/`, built to `dist/dev.js`, no imports) that warns through `console.warn` about misused `<void-*>` markup: unknown attributes, values outside the declared set, `attr="false"` on booleans, wrong parent or missing required child, undefined tags, listeners for events nothing dispatches. It is never imported by the root entry, a component or the autoloader (a test enforces this), so production pays nothing; apps import it in development only. What is valid comes from the Custom Elements Manifest through `cem/dev-table.js` (generated `src/dev/table.generated.ts`, not committed). Facts the analyzer cannot see (allowed parents, required children, advice for guessed attributes) live in `packages/ui/cem/supplement.js` and are written into the manifest as `voidParents`, `voidRequires`, `voidHints` (and `voidHostAttributes`, derived from `setHostAttribute` calls); the `voidable` Go tool reads the same fields. The CSS-only pattern elements (`void-shell`, `void-page`, ...) are not in the manifest: the Go tool's `rules.json` declares them in its `styled` list (with their own `parents` and `hints`), and `dev-table.js` reads that list into the generated table so the dev entry never calls them "not a Void UI element". When you add a component, a parent/child family or a host attribute that is not role, tabindex or `aria-*`, the table follows from the manifest; run `mise run warnings:sweep` and fix every warning (a real mistake in the repo, or a false positive in the detector: fix the detector).

### Module Federation Support

The library works as a normal npm import and is shareable as a singleton via Module Federation. This requires:
- Idempotent `customElements.define()` calls (guard against double-registration)
- No side-effectful CSS injection at import time
- No module-scoped mutable state

### No External Component Dependencies

No Material, Chakra, shadcn, or similar. Everything is built from scratch.

## Naming Conventions

| Entity | Prefix | Example |
|--------|--------|---------|
| CSS custom properties | `--void-*` | `--void-color-accent` |
| Custom elements | `void-*` | `<void-button>`, `<void-panel>` |
| TypeScript classes | `Void*` | `VoidButton`, `VoidPanel` |
| Custom events | `void-*` | `void-click`, `void-change` |
| Base class | — | `VoidElement` |

## CSS Token Architecture

Everything visual is a `--void-*` custom property in `@voidable/theme`, in three layers.

### Layer 1 — Primitives (`@voidable/theme/primitives`)

Fixed values with no semantic meaning, never derived from anything:
- **Stone palette**: 50–950 (includes 450)
- **Status palettes**: red, orange, amber, green, blue, purple, pink
- **Typography constants**: weights, line heights, tracking
- **Other**: easings, z-index, chart stroke widths

### Layer 2 — Knobs (`@voidable/theme/knobs`)

The inputs a theme sets. To retheme, change these and nothing else:

| Knob | Default | Changes |
|------|---------|---------|
| `--void-accent-hue`, `--void-accent-chroma` | `250`, `0` | Accent colour (OKLCH). Chroma 0 = no accent: primary actions are the inverse of the page |
| `--void-neutral-hue`, `--void-neutral-chroma` | `60`, `0.004` | Tint of text, borders and surfaces |
| `--void-page-tint` | `0` | 0 = pure black/white page; 1 = soft tinted page |
| `--void-contrast` | `0.2` | Strength of secondary text and control borders, 0–1; clamped, never below AA |
| `--void-chrome` | `0.3` | Strength of dividers and container fills, 0–1 |
| `--void-radius` | `4px` | Radius of a control; the other radii scale from it |
| `--void-density` | `1` | Control height, padding, spacing scale |
| `--void-rhythm` | `1` | Space between groups and sections |
| `--void-font-size`, `--void-font-sans`, `--void-font-mono` | `0.875rem`, Inter, JetBrains Mono | Type |
| `--void-anim-scale` | `1` | Multiplies durations |

A **theme** is a file in `packages/theme/src/themes/` with one `[data-void-theme="name"]` rule that sets knobs only (`lint:contrast` rejects anything else). Eight ship: `void`, `dune`, `console`, `orbit`, `capsule`, `aurora`, `iris`, `paper`. Each file starts with a comment of the form `/* Name — one line.`, which the theme builder shows.

A **skin** is a file in `packages/theme/src/skins/` selected with `data-void-skin="name"` (on `<html>`, or beside `data-void-theme`). It changes structure, which knobs cannot, and its source is exactly one rule, `[data-void-skin="name"] { … }`, holding nothing but assignments of semantic, role and component tokens (its own working values are `--_void-<name>-*`). No selector in a skin names a component: `build/skins.js` refuses anything else, and so do `lint:component-tokens` and `lint:contrast`. The build writes the rule out for every scope (the list is read from `tokens.css`), and for the surface scopes (media, glass, `[data-void-surface]`) it leaves out the colours a surface owns and resets the skin's component colour tokens, so on a surface a skin keeps its structure and the surface keeps its colours. `loft` and `slab` ship; a new one is listed in `build/knobs.js`. If a design cannot be said in tokens, add the missing component token (below); never add a selector to a skin, and never edit a file under `components/` for a skin.

### Three tiers, and when a component token exists

1. **Knobs**: the inputs (`knobs.css`). A theme sets these and nothing else.
2. **Semantic tokens**: derived from the knobs in `tokens.css`. They include the **role tokens**, what a kind of component is drawn with: `--void-container-*` (surface, border, border-width, radius, shadow, padding), `--void-float-*` (the same, for what lies over the page), `--void-control-*` (radius, border, border-width, and the height/padding/text steps), `--void-field-*` (surface, border), `--void-item-*-selected` (surface, ink) and `--void-rule`, `--void-rule-between`, `--void-rule-edge`, `--void-rule-head`, `--void-rule-frame` (whole border shorthands, so `none` removes a line).
3. **Component tokens**: per-component override points, `--void-<component>-<part?>-<property>-<state?>`. The vocabulary is fixed in `build/skins.js` (`PARTS`, `PROPERTIES`, `STATES`, `ROLES`); parts are the part-element words (`header`, `footer`, `title`, `body`, `actions`, `trigger`, `content`, `item`, `label`, `icon`, `value`).

Rules for component tokens:

- **Never declared by the theme.** A component reads one with its default as the fallback, `var(--void-card-shadow, var(--void-container-shadow))`, so one declaration by an application or a skin wins on the element, an ancestor or `:root` with no `!important`. Where a file reads a token several times or it must compose with size steps, alias it once to a private property on the host (`--_void-button-height: var(--void-button-height, var(--void-control-height))`) and let the size rules reassign the private one.
- **A component reads a role, not a raw semantic colour, for anything a role covers.** A card's edge is `var(--void-card-border, var(--void-container-border))`, not `var(--void-color-border)`.
- **A token exists only when all three hold:** a shipped or plausible design treats this component differently from the others of its role; the difference is not already an attribute or variant; and it is a decision (surface, ink, border, radius, shadow, rule, padding, gap, height, type) and not a mechanic (display, position, transition, z-index). No token per declaration. A layout parameter that is not in the grammar is allowed when its description starts with `Setting:`.
- **Documented where it is read.** Each stylesheet that reads component tokens starts with a `/* @tokens void-<name>` comment listing `--name  what it styles`, one per line. The docs tables, `dist/component-tokens.json`, the `component` group of the DTCG files, `componentTokenNames` in `@voidable/theme/names` and the per-component pages are generated from that comment and the fallback in the CSS.
- **Private properties are `--_void-*`** (the tone system is `--_void-tone*`). They are not API and may change.
- `mise run lint:component-tokens` fails on a token documented but not read, read but not documented, outside the grammar, declared by the theme, and on a skin that is not one rule of token assignments, sets a knob, thins the focus ring, shrinks a control below 24px or sets a duration that ignores `--void-anim-scale`.

**Colour scheme.** Three sources, strongest first: `data-theme="dark|light|system"` on the element or an ancestor; the scheme a theme or skin prefers (`--void-preferred-scheme: light; --void-preferred-scheme-dark: 0;`, always as a pair); the operating system. `--void-scheme-dark` (0 or 1) and `--void-color-scheme` are derived from that chain in `tokens.css`; do not set them directly.

The knobs are also data: `packages/theme/build/knobs.js` holds each knob's range, step, unit and URL parameter, the font stacks, the link format of the theme builder (`builderUrl`, `fromParams`), the theme-file writer, the prose description and the random theme. The builder page, the token export and `@voidable/theme/knobs.json` read it, and a test fails if its knob list, the knob table in the `voidable` skill template or `knobs.css` disagree. Add or change a knob in `knobs.css`, `build/knobs.js` and `tools/voidable/internal/infra/skillgen/templates/SKILL.md.tmpl` together.

### Layer 3 — Derived Tokens (`@voidable/theme/tokens`)

Computed from the knobs in plain CSS (`oklch()`, `color-mix()`, `calc()`; no build step, no relative colour syntax, no `light-dark()`):
- **Surfaces**: `bg`, `surface`, `bg-secondary`, `bg-elevated`, `bg-hover`, `bg-active`, `bg-overlay`
- **Text**: `text`, `text-secondary`, `text-muted`, `text-disabled`, `text-on-accent`
- **Borders**: `border` (divider), `border-strong`, `border-control` (3:1 control boundary), `border-focus`
- **Accent**, and **status colours**: error, warning, caution, success, info, notice, highlight (each with a subtle variant); every component's `color` attribute takes the same eight values (default plus these)
- **Control size**: `--void-control-height*`, `--void-control-padding*`, `--void-control-text*`
- **Layout rhythm**: `--void-gap-tight|inside|stack|group|section`, `--void-gutter`, `--void-measure*`
- **Type roles**: `--void-type-<role>-*` for label, value, unit, caption, heading, title, display, lede, body, code
- **Surfaces over imagery**: `--void-scrim-strength`, `--void-scrim-alpha`, `--void-color-scrim`, `--void-scrim-fade`, `--void-glass-blur`, `--void-glass-solid`, `--void-color-control-fill`, `--void-color-page`
- **Spacing, text sizes, radii, shadows, durations**

How the derivation works, and the rules that keep it working:
- The colour scheme is a number, `--void-scheme-dark` (1 or 0), set by `data-theme` or the system preference. Formulas blend between their dark and light results with it, so light mode is never a second hand-written block.
- Every grey is one neutral foreground (`--void-fg`) at an alpha step. Do not add hand-picked grey values.
- Derived tokens are declared on `:where(:root, [data-theme], [data-void-theme], [data-shape], [data-void-surface], void-media, void-glass)`. A custom property computed from another is resolved where it is declared, so a knob set on a subtree only takes effect if that element carries `data-void-theme`.
- A surface (on-media, glass) is a set of overrides of the *inputs* to those formulas (the scheme number, the alpha steps, `--void-color-bg`), declared on `void-media`, `void-glass` and `[data-void-surface]`. Components need no surface-specific CSS; never add one.
- Never put a `var()` in `primitives.css` or `knobs.css`, and never put a raw value in a theme file.
- **Colour scheme**: `data-theme="dark"` or `"light"` on an element or an ancestor is the explicit choice, and `"system"` follows the operating system. Without one, the scheme a theme or skin prefers (`--void-preferred-scheme`, Loft and Slab prefer light) applies, and without that the operating system (`prefers-color-scheme`; dark where the browser cannot say). Dark is a true black `#000000` page, light a true white one.

### Token export

`packages/theme` has a build (`scripts/build.mjs`, part of `mise run build`) that resolves every `--void-*` property for each theme and skin in both schemes and writes `dist/`: `dtcg/<theme>.<scheme>.tokens.json` (Design Tokens Community Group Format Module 2025.10), `dtcg/voidable.resolver.json`, `json/<theme>.<scheme>.json` (flat, CSS values), `knobs.json` and `names.js`/`names.d.ts`; exported as `@voidable/theme/dtcg/*`, `/json/*`, `/knobs.json` and `/names`. The values come from the evaluator in `build/css-eval.js` (`var()`, `calc()`, `min/max/clamp`, `oklch()`, `color-mix(in srgb)`, shadows), so the build needs no browser; `test/chromium.test.mjs` compares every exported value with what Chromium computes and fails in CI when no Chromium is found. The evaluator throws on CSS it does not implement: when you use a new construct in `tokens.css`, teach it to the evaluator.

### Theme builder

`docs/src/pages/theme/index.astro` (voidable.dev/theme/) is the builder: knob controls, the reference screens in iframes (`theme/preview.astro`, the Storybook's reference HTML files), a live contrast readout, and the theme as CSS, a link, a prompt and DTCG JSON. Its behaviour is `docs/src/lib/theme-builder.ts`. A link to it is a theme: each knob is the query parameter named after it without `--void-`. The home page's picker and the theming guide link into it with `?theme=<name>`; do not add a second set of knob sliders elsewhere.

## Design Values

The name "Void" reflects two core ideas: components are **devoid** of styling without a theme loaded, and the visual language embraces the **void** — negative space as a first-class design element.

The default look is light and airy. It gets there with three decisions, each a knob:

- **Control size: modest** (`--void-density`). Controls are 36px tall, 28px small, 44px large, and every control shares the height of its size step so a row of mixed controls lines up. Use `--void-control-*` tokens; never a raw height. Padding inside a component is only what the control needs: more padding makes elements heavier, not the page airier.
- **Layout rhythm: generous** (`--void-rhythm`). Space between groups (40px) and sections (72px) is several times the space inside a group (8, 16, 24px). This is where the airiness comes from. Use `--void-gap-*` for layout.
- **Chrome: minimal** (`--void-chrome`). Hairline dividers rather than boxes; containers have a barely visible fill; tables and lists sit directly on the page; no fills behind headers. Borders have two jobs with two tokens: `--void-color-border` divides and may be faint, `--void-color-border-control` bounds a control and keeps 3:1.

And these:

The primary author of code that uses this library is an LLM agent, so design for that author. APIs are chosen to be guessable: the name an agent would reach for first is the name that exists. Failures are loud: a wrong attribute, a missing label or a misused part is reported by `voidable check` and the development warnings rather than silently ignored. Correctness is established by functional tests in real browsers, not by reading code; a change is done when it has been run and observed to work.

- **Human and agent friendly** — the UI is designed for both human users and AI agents. Light DOM exposes component structure. Reflected attributes make state machine-readable without executing JS. Semantic ARIA roles and properties give agents a structured understanding of the interface. Stable tag+attribute selectors provide reliable handles for programmatic interaction.
- **Pure backgrounds by default** — true black (`#000000`) in dark mode, true white (`#ffffff`) in light mode. A theme may soften the page with `--void-page-tint`.
- **Monochrome hierarchy** — hierarchy comes from the opacity of one foreground colour, not from weight or hue. Colour is reserved for status. The default accent has no colour.
- **Quiet type** — regular weights (medium for headings and labels, nothing bolder by default), small uppercase mono labels, large plain numerals. Use the type roles; do not set `text-transform` or a tracking value directly.
- **Elevation only for what overlaps** — menus, popovers, dialogs and toasts get a lifted surface, a hairline and a soft dark shadow. Nothing in the page flow has a shadow. No white glows.
- **Status palette**: red (error), orange (warning), amber (caution), green (success), blue (info), purple (notice), pink (highlight), at the 400 step on black and the 700/800 step on white so each keeps 4.5:1 as text. Components that take a `color` attribute accept `default`, `error`, `warning`, `success`, `info` and `notice`.

### Shape Variants

`--void-radius` is the knob. `[data-shape]` on an ancestor is a preset for it:

| Variant | Radii | Character |
|---------|-------|-----------|
| `curvy` (default) | scale from `--void-radius` (4px by default) | The theme's corners |
| `sharp` | All radii resolve to `0` | Angular, technical |

Consumers toggle shape globally (`<html data-shape="sharp">`) or locally on any ancestor.

### Patterns (CSS-only elements)

`packages/theme/src/patterns/` and `packages/theme/src/media/` style `void-*` tags that `@voidable/ui` never registers: the frame and parts of a page (`void-shell`, `void-brand`, `void-nav-links`, `void-spacer`, `void-page`, `void-page-head`, `void-actions`, `void-section`, `void-section-head`, `void-split`, `void-stack`, `void-figures`, `void-figure`, `void-delta`, `void-state`, `void-description-list`, `void-rows`, `void-row`, `void-row-text`, `void-toolbar`, `void-empty`) and UI over imagery (`void-media`, `void-media-content`, `void-glass`).

- Build pages from them. Do not write page padding, max-widths, grids for figures or margins between sections.
- A pattern has no behaviour, so it has no JavaScript. If something needs behaviour it is a component in `@voidable/ui`; if it only arranges or styles, it is a pattern. `lint:styles` fails if a pattern tag is registered.
- Semantics come from native elements inside the pattern (`main`, `h1`, `h2`, `dl`, `a`). A pattern takes a real heading as a child, never a `heading` attribute.
- Each pattern is declared in `tools/voidable/internal/infra/embedded/data/supplement/rules.json` under `styled` (tag, description, attributes) with a snippet in `snippets/<tag>.html`; a Go test keeps that list and the CSS in step in both directions. Add a pattern in all three places and give it a docs page under `docs/src/content/docs/patterns/` and a story in `packages/storybook/stories/Patterns.stories.ts`.
- Do not name an attribute `align`: browsers still apply the legacy HTML `align` attribute to unknown elements. Use `valign` or `justify`.
- Text over an image goes in `void-media-content` (which draws the scrim) or `void-glass`. Never use `text-shadow` or a hand-written gradient for legibility; `lint:contrast` proves 4.5:1 for those two and for nothing else.

### Reference Screens

`packages/storybook/stories/reference/` holds five realistic screens (application overview, data table with toolbar, form, settings, and a page that opens on a photograph with navigation and a glass panel over it) built only from components, patterns and type roles, shown in Storybook under Reference/Screens. No screen has CSS of its own. Besides these five it holds `empty`, `form-dialog`, `sheet` (every component), `states` and `overlays`, all photographed by `mise run shots` (see Visual Review). Judge any theme change by looking at them at 1440x900 and 390x844, in dark and light, under the Void, Dune and Console themes and the Loft skin.

Photographs for stories and docs live in `docs/public/media/` (Storybook serves the same directory at `media/`). Only freely licensed images, never hot-linked, each listed in `docs/public/media/CREDITS.txt`.

## Tooling

### mise

`mise` manages all tooling versions via `mise.toml` (Node 24, pnpm 10, plus Ruby, PHP, Elixir and Erlang for the server-side packages). **All tasks run through mise** — never call npm or pnpm directly.

Tasks live as shell scripts in `.mise/tasks/` with `#MISE` directives (not inline in `mise.toml`).

Task script pattern:
```bash
#!/usr/bin/env bash
#MISE description="Description here"
#MISE depends=["other-task"]
set -euo pipefail
# ... task body
```

### Key Tasks

| Command | Description |
|---------|-------------|
| `mise run install` | Install dependencies |
| `mise run dev` | Start the Storybook dev server |
| `mise run build` | Build all packages |
| `mise run test` | Run all tests |
| `mise run storybook` | Start Storybook dev server |
| `mise run storybook:build` | Build Storybook for deployment |
| `mise run typecheck` | TypeScript type checking |
| `mise run lint` | Lint all packages |
| `mise run clean` | Remove build artifacts and node_modules |
| `mise run liveview:demo` | Start the LiveView demo server |
| `mise run ci` | Full CI pipeline: build, test, typecheck, lint, every `lint:*` task below and `release:test` |
| `mise run lint` | ESLint with lit-a11y (WCAG checks on Lit templates) |
| `mise run theme:build` | Build `packages/theme/dist/` (layered single file, minified copy, per-component files, exports) |
| `mise run lint:theme` | Check the cascade-layer structure, that nothing global leaks outside the base, that `!important` is justified, and that the built output is layered and complete |
| `mise run lint:tokens` | Ensure no raw values (colors, sizes, control heights, tracking, text case, backdrop blurs, scrim colours, text shadows) in component CSS; values live in primitives.css, knobs.css and tokens.css |
| `mise run lint:undefined-tokens` | Fail if a `--void-*` token is referenced (in the theme, the components, the docs, the stories or the examples) but neither defined in theme CSS nor set from TypeScript |
| `mise run lint:component-tokens` | Fail on a component token that is documented but unread, read but undocumented, outside the naming grammar or declared by the theme, and on a skin file that is anything but one rule of token assignments |
| `mise run lint:contrast` | Evaluate the derived colours and check WCAG contrast in dark and light for the default knobs, every theme file, every skin and the extremes of each colour knob, on the page, on the on-media surface and on glass (over white, grey and black images, across the scrim strength); reject theme files that set anything but knobs |
| `mise run lint:styles` | Ensure UI components contain no visual styles and that the CSS-only pattern elements are styled by the theme and never registered |
| `mise run lint:exports` | Verify every component has a subpath export, self-registers and is re-exported from the index |
| `mise run lint:manifest` | Fail when a tag in the Custom Elements Manifest has no story, React wrapper or LiveView component (known gaps: `.mise/manifest-drift-allowlist.txt`) |
| `mise run lint:versions` | Fail when a manifest holds a real version or a file hand-types a Voidable package version |
| `mise run release:plan` | Print whether HEAD releases, the unified version and why |
| `mise run release:dry-run` | Build, pack and verify every package at the planned version; publishes nothing |
| `mise run release:test` | Unit tests for the release scripts (bump rules, plan, version lint, binary packaging, `install.sh`, the workflow's job graph) |
| `mise run release:binaries` | Build the `voidable` binaries for all six targets into `release-artifacts/binaries` (needs `VERSION`; `release:dry-run` does it for you) |
| `mise run voidable:ci` | Lint, test and build the Go CLI in `tools/voidable` (installs the pinned Go on demand; `VOIDABLE_SKIP_GO=1` skips it and `lint:markup`) |
| `mise run lint:markup` | `voidable check` over docs, stories, examples and adapter templates; open product decisions are in `.voidable/markup-allowlist.txt` |
| `mise run evals:setup` | Prepare the agent evals (library, voidable CLI, Blade and HEEx fixtures, Chromium) |
| `mise run evals -- <cmd>` | Agent evals CLI: `run`, `report`, `estimate`, `calibrate`, `list`, `contract` (live runs cost money; not in `ci`) |
| `mise run evals:test` | Unit, scoring and contract tests of the eval harness (part of `ci`; browser tests skip without Chromium) |
| `mise run evals:calibrate` | Score the reference solutions and rewrite `evals/results/calibration.json` |
| `mise run warnings:sweep` | Load every Storybook story and every built docs page in headless Chromium (needs Chromium: `CHROMIUM_PATH`, default `/usr/bin/chromium`) with `@voidable/ui/dev` running and fail on any `[voidable]` warning. Not part of `ci`; run it after changing components, stories or docs markup |
| `mise run docs` | Start docs dev server |
| `mise run docs:build` | Build docs for deployment |
| `mise run test:browser` | Real-browser suite (Playwright; Chromium, Firefox, WebKit) against the built packages; not part of `ci` |
| `mise run test:browser:install` | Download the browsers for it (`-- --with-deps` adds system libraries on Debian/Ubuntu) |
| `mise run test:screen-readers` | Scripted VoiceOver (macOS) or NVDA (Windows) scenarios through Guidepup; refuses to run on Linux; not part of `ci` or any release gate |
| `mise run test:screen-readers:setup` | One-time machine setup for it (Guidepup setup and assets, the browser); macOS or Windows only |
| `mise run test:screen-readers:record` | Merge a run's result files into `docs/src/data/screen-reader-results.json` for the accessibility statement |
| `mise run test:server` | Server-backed suite: starts the Rails, Phoenix LiveView and Laravel Livewire demos on the built packages and drives each (`VOID_SERVER_APPS=rails,phoenix,laravel` selects; each needs its toolchain from `mise.toml`) |
| `mise run shots` | Photograph the reference pages (every theme and skin, dark and light, 1440 and 390 px) and build the review gallery in `tmp/shots/gallery`; filters `--page --theme --skin --scheme --width --smoke --stories` |
| `mise run shots:compare -- <base> [<head>]` | Before/after gallery for two refs, each built in a temporary worktree (`tmp/shots/compare/gallery`) |
| `mise run shots:check` | Check a gallery in Chromium: layout at 1440 and 390 px, keyboard, every view, axe |
| `mise run test:coverage` | Unit tests with V8 coverage, per-package summary (no thresholds) |

### Browser Tests

`tests/browser/` holds the Playwright suite; "Browser tests" in CONTRIBUTING.md covers running it. For agents:

- Specs are in `tests/browser/specs/`, pages in `tests/browser/pages/`, helpers in `tests/browser/helpers/`. Bundles are built from `packages/*/dist`, so run `mise run build` (the task does) after changing a package.
- Never wait with sleeps or timeouts. Use `settle(page)` (every `updateComplete` plus two frames), `expect` retries, `expect.poll` or component events.
- A failing test that shows a real defect is not fixed by changing the test. Mark it with `expectedFailure('#n', detail)` (key in `helpers/known-issues.ts`, `untracked:` when no issue exists yet), keep the assertion of the correct behaviour, and report it.
- When a fix makes an expected failure pass, remove its marker in the same change. `VOID_RUN_EXPECTED=1` runs every expected failure as an ordinary test, to see how each still fails.
- The `browser`, `server` (Rails), `phoenix` and `laravel` jobs of `ci.yml` run on pull requests and, through `workflow_call`, gate every release: `release.yml` tags and publishes only if all of `ci.yml` passed.
- Overlay specs: `overlays.spec.ts` (per component) and `overlay-stress.spec.ts` (nesting, containers, corners, focus return, cancelled close, close reasons, fifty-cycle leaks, morphs), with pages `overlays`, `overlay-deep` and `overlay-corners`. `expectPerceivable` and `scrollLocked` in `helpers/test.ts` are the overlay assertions. A failure in one engine only is an `expectedFailure(key, detail, { browsers: [...] })` naming the engine.
- CI gets Ruby, Erlang/Elixir and PHP from `ruby/setup-ruby`, `erlef/setup-beam` and `shivammathur/setup-php` (pinned to commit SHAs, versions read from `mise.toml`), not from mise, which would compile them. `tests/browser/server/start.mjs` falls back to `PATH` when mise has not installed a tool, and retries registry steps three times.
- Performance budgets are in `tests/browser/budgets.ts`, the axe baseline in `tests/browser/axe-baseline.json`, and the server apps in `tests/browser/server/apps.mjs`.
- **Screen readers** (`tests/browser/screen-readers/`, README there): scenarios are data (`scenarios.ts`, and `scenarios-pickers.ts` for select, combobox and multiselect, whose markup is being redesigned) on `pages/sr-*.html`. Every scenario is replayed against the accessibility tree in the normal suite (`specs/screen-reader-tree*.spec.ts`; run it after changing a component's markup, roles or ARIA) and, on a Mac or Windows machine, with VoiceOver or NVDA (`mise run test:screen-readers`, `.github/workflows/screen-readers.yml`). Speech is matched loosely (name, a role word, state words) through the tables in `words.ts`; never assert a whole spoken phrase. You cannot run the real screen readers on Linux: a failing tree replay is a real defect, so mark it with `knownIssue` on the scenario and report it, as with any expected failure. The screen-reader workflow is separate from `ci.yml`, has no `workflow_call`, and never gates a release; do not add it to `ci.yml` or `release.yml`. The accessibility statement (`docs/src/content/docs/guides/accessibility-statement.mdx`) says only what is tested, and its "Last verified" table is generated from `docs/src/data/screen-reader-results.json`; do not type results into it.

### Visual Review

`tests/browser/shots/` photographs the reference pages in `packages/storybook/stories/reference/` (the markup lives only there) in every theme and skin the theme package exports, dark and light, at 1440x900 and 390x844. `mise run shots` captures and builds a gallery (`tmp/shots/gallery/index.html`; filters `--page --theme --skin --scheme --width`, `--smoke`); `mise run shots:compare -- <base-ref> [<head-ref>]` builds each ref in a temporary worktree and writes a before/after gallery (changed images worst first, with slider and highlighted difference) in `tmp/shots/compare/gallery/`. For agents:

- **Changing the theme, a token, a component's styles or markup, or a reference page: run `mise run shots:compare -- master` (or your base) and look at the changed images yourself, at both widths, both schemes, the default theme and Loft, before you report the work done.** Say in the report what changed and whether each change is intended. Passing tests are not a visual review.
- The reference markup is in one place: add a component to `reference/sheet.html`, a state to `reference/states.html`, an overlay to `reference/overlays.html` plus an entry in `tests/browser/shots/pages.mjs`. Change markup there when a component's markup changes. Charts take data from `data-json-data`.
- Themes and skins are discovered from `packages/theme/dist/exports.json`; never list them in the tooling.
- Nothing is committed: no screenshots, no baselines. CI's `visual` job (pull requests only, skipped in the release path) compares base and head on one runner and fails only when the look changed and the change touches none of `packages/theme/`, `packages/ui/src/`, `packages/storybook/stories/reference/`; a `Visual-Change: <why>` commit trailer accepts an intended change.
- Captures are byte-identical on one machine and differ across machines: compare only captures made on the same machine.

### Tech Stack

- **Lit 3** — web components
- **TypeScript 6**
- **Vite 8** — build
- **pnpm 10** — package management
- **Storybook 10** with `@storybook/web-components-vite`
- **Vitest** (4 in `@voidable/ui`, 3 in some adapters) — testing
- **happy-dom** (20 in `@voidable/ui`) — test DOM environment
- **Astro 6 + Starlight** — docs site (`docs/`)

The docs Open Graph image is generated from `docs/scripts/og-image.svg` with `mise run docs_og` (the PNG is committed). With the current mise (2026.11) task files whose names contain a colon (`docs:build`, `storybook:build`, `docs:og`) are exposed with an underscore (`docs_build`, `storybook_build`, `docs_og`); run `mise tasks` to see the exact names. Tasks in directories (`lint:tokens`, `liveview:demo`) keep the colon.

## Agent Evals

`evals/` measures whether AI agents build working UIs with Voidable (#54, #27). A model gets a task from `evals/tasks/` under one of three context conditions (package name only; the `voidable ref` index and lookup tool; the generated skill with the ref/check/snippet tools), its file is rendered in headless Chromium (HTML, React, Svelte, and ERB/HEEx/Blade through the real template engines), and it is scored by `voidable check`, task checks written against roles, labels and text, console errors, 390 px overflow and axe. Runs go through the Anthropic TypeScript SDK's tool runner with `ANTHROPIC_API_KEY` from the environment; cassettes allow exact offline replay and a stub tests the harness without a key. `evals/README.md` covers running, adding a task and scoring.

- Changing a component's roles, names or reflected state: update `evals/contract/contract.mjs`, run `mise run evals -- contract` to regenerate `evals/CONTRACT.md`, and keep `mise run evals:test` green.
- Changing what a reference solution relies on: `mise run evals:calibrate` and commit `evals/results/calibration.json`.
- After a live run worth keeping: `mise run evals -- report <run> --baseline` and commit `evals/results/baseline.json`.

## Component Conventions

1. All components extend `VoidElement` (Light DOM Lit base class).
2. Guard `customElements.define()` for idempotent registration:
   ```ts
   if (!customElements.get('void-button')) {
     customElements.define('void-button', VoidButton);
   }
   ```
3. Components render in Light DOM — this enables shared CSS tokens from the parent scope.
4. Components have zero visual styling without a theme loaded.
5. Never hardcode color values — always use `var(--void-*)`.
6. Never import CSS in the `@voidable/ui` package entry point.
7. Components with regions take **explicit parts** (`PartsController`, `packages/ui/src/parts.ts`; see "Explicit parts" below). Components not converted yet still host consumer children with `ProjectionController` (`packages/ui/src/projection.ts`), never a `childNodes` snapshot; region containers hold no Lit bindings. New components use parts.
8. Form controls use the `NativeFormControl` or `InternalsFormControl` mixin (`packages/ui/src/form-control.ts`).
9. Multi-word properties declare a kebab-case `attribute` (enforced by the manifest test).
10. A component whose host is not its control declares `static labelTarget` (a selector) so `aria-label` / `aria-labelledby` on the host move onto the control, and attributes the user edits while focused (`value` of a text field) are listed in `static editState` (`packages/ui/src/base.ts`).
11. Boolean ARIA a component manages is written as `"true"` and removed (not `"false"`) where absence is the convention (`aria-disabled`, `aria-required`); `aria-pressed`, `aria-checked` and `aria-expanded` keep `"false"`.
12. Overlays (anything that opens above the page) use `OverlayController` (`packages/ui/src/overlay.ts`): a native `<dialog>` with `showModal()` for modals, `popover="manual"` for everything else, CSS anchor positioning with the built-in JS positioner as fallback, and the shared stack for Escape, outside presses, focus return and the counted scroll lock. Never add document-level listeners or `z-index` stacking for an overlay. `void-open` / `void-close` come from the controller, carry a `reason` and do not bubble. Browser baseline: the Popover API (Chrome 114, Firefox 125, Safari 17); see `docs/src/content/docs/components/overlays.mdx`.

### Explicit parts (#52)

A component with regions (title, body, trigger, list of tabs) is written with part elements, plain `void-<component>-<region>` tags the component finds where they are and never moves. The rules and the full inventory are in `docs/src/content/docs/guides/composition.mdx`; the machine-readable form is `voidParts` in `packages/ui/cem/supplement.js`, which feeds the manifest, the React part wrappers (`packages/react/scripts/parts.mjs`), the dev warnings (`packages/ui/cem/dev-table.js`), and `voidable check` / `ref` / `snippet` / the skill.

Rules: one way per component (remove the implicit form, no compatibility path; record it under `removed` so both checkers report it with the fix); names end in `-trigger`, `-content`, `-title`, `-description`, `-body`, `-actions`, `-header`, `-footer`, `-item`, `-list` or `-separator`; at most two levels; a part with no behaviour is CSS-only (styled by the theme, never `customElements.define`d); a trigger part wraps exactly one control and is `display: contents`; state lives on the parent's reflected attributes (`open`, `value`) or as a plain attribute the parent writes on a part (`active`); ids are generated only when missing and never replace an author or server id.

Recipe for converting a component:

1. **Design** the parts: write the target markup, decide attribute-or-part (on-screen content is a part, settings stay attributes), and add `voidParts` (tag, `required`, `max`, `ordered`, `control` for triggers, `transparent` wrappers such as `form`, a one-line `fix`) and `removed` entries (old tag or attribute → what to write) in `packages/ui/cem/supplement.js`.
2. **Component**: replace `ProjectionController` and `render()` with a `PartsController` (`tags`: every part tag; `onChange`: an idempotent `_wire()` that looks the parts up and writes roles, ids and ARIA through `set` / `provide` / `token` / `id`). Overlays pass `attr` / `style` hooks to `OverlayController` so the parts controller owns what it writes. Delete the removed properties.
3. **Theme**: style the part tags in the component's own CSS file (tag selectors, state from the parent's attributes); add the closed or not-yet-revealed state to `packages/theme/src/pre-upgrade.css`; `node packages/theme/scripts/build.mjs` regenerates the scoped reset with the new tags.
4. **Tokens when converting**: the theme's component CSS is written against the three tiers (see "Three tiers" above), and a conversion keeps it that way; a part selector is only a new place to read the same tokens. Take the new selectors and layout from the converted CSS, then express every value as the component read it before the conversion (`git show master:packages/theme/src/components/<name>.css` against the converted file shows what to carry over): lines are `var(--void-rule-head)` under a header or title, `var(--void-rule-between)` between items and above a footer, `var(--void-rule-edge)` for the end of a list, never `1px solid var(--void-color-border)`; the box of a card-like part is `var(--void-container-*)`, of an overlay `var(--void-float-*)`; padding is `--void-container-padding` (aliased once to a private `--_void-<name>-padding` on the host when several parts read it). Every public token in the component's `@tokens` comment keeps its meaning on the new structure: a token that styled the generated header styles `void-<name>-header` and its title, and the comment says which parts it reaches (`Padding of the header (inline), the body and the footer`). Do not add part-named tokens (`--void-card-header-rule`) unless the three conditions of the token rule hold: a skin or design really treats that part differently from the rest of the component. Shadow internals (dialog and drawer only) are styled through `::part(surface)` and `::part(close)`: custom properties inherit into the shadow root, so `var(--void-dialog-radius, ...)` read in a `::part()` rule works and one declaration on the host or an ancestor overrides it. `::part()` rules sit in the same cascade layer as the rest of the theme and lose to unlayered application CSS, as intended. Finish with `mise run lint:component-tokens`, `lint:theme`, `lint:undefined-tokens` and a look at the component under Loft and Slab (`?skin=slab` in the theme builder): neither skin may need a selector.
5. **Generated outputs**: `mise run build` regenerates the manifest, React wrappers and dev table; rewrite the snippets in `tools/voidable/internal/infra/embedded/data/supplement/snippets/`; add a case to `tools/voidable/internal/cli/testdata/bad/parts.html`.
6. **Adapters and templates**: HEEx function components in `packages/liveview/hex/lib/voidable_ui/components.ex` (drop removed attrs, document the parts), Rails generator templates in `packages/hotwire/gem`, Blade docs, the React README.
7. **Usages**: convert every usage (docs pages and data, stories, examples, demos, evals solutions, browser pages and specs). `python3`-style converters are fine; then `mise run lint:markup` must pass with an empty `.voidable/markup-allowlist.txt`, and `mise run warnings:sweep` must pass.
8. **Tests**: unit tests for structure (nodes unmoved), ARIA wiring, late, reordered and removed parts, morph carry-over (`voidBeforeMorph`) and the dev warnings; browser specs in Chromium and Firefox; `mise run evals -- contract` and `mise run evals:calibrate`.
9. **Docs**: the component page, the composition inventory row (status becomes Parts), keyboard and component notes data, Storybook argTypes.

Checklist per component: parts in the supplement and the manifest; implicit form gone and reported by the dev warnings and `voidable check`, each with the fix; no node moved after upgrade; layout identical before and after upgrade; generated ids only when missing; React wrapper exported; HEEx, ERB and Blade updated; every usage converted; `lint:markup` and `warnings:sweep` clean; `Breaking (0.x):` line in the commit.

Remaining components, in the order to convert them (grouping and open questions in the composition guide's inventory):

1. **Fields**: field, checkbox-group, radio-group, then checkbox and radio (label, description, error parts; the `label`/`helper`/`error` attributes are used everywhere, so this group needs an owner decision first).
2. **Generated internals**: tag, scroll-area (no parts; the owner's rule is that nothing but dialog and drawer has a shadow root, so their remove button and viewport are to be settled as author-written parts like the notices' `-close`, or as light-DOM content the component keeps rendering; an owner decision).
3. **Pickers**: combobox, multiselect, option, select (the content part for options; select's native options are open).

### CSS Selector Strategy

Use **tag + attribute selectors** (not BEM classes) for all component styling in `@voidable/theme`:

```css
/* Base — tag selector */
void-button { display: inline-flex; }

/* Variants — attribute selectors */
void-button[variant="filled"] { background: var(--_void-tone); }
void-button[disabled] { opacity: 0.5; pointer-events: none; }

/* States — pseudo-classes */
void-button:hover { background: var(--_void-tone-hover); }
void-button:focus-visible { outline: 2px solid var(--void-color-border-focus); }
```

Rationale:
- Lower specificity (0,1,1) — easier for consumers to override.
- Attributes exist in SSR HTML before hydration — no FOUC.
- Aligns with Lit's `@property({ reflect: true })` — no extra JS to toggle classes.
- No class collision risk with utility CSS frameworks.

### Tone System

Components that support color variants use a **tone variable** pattern. The base rule defines derived values via `color-mix()`, and each color variant only overrides `--_void-tone`:

```css
void-button {
  --_void-tone: var(--void-color-accent);
  --_void-tone-text: var(--void-color-text);
  --_void-tone-subtle: transparent;
  --_void-tone-border: var(--void-color-border-control);
  --_void-tone-hover: color-mix(in srgb, var(--_void-tone) 8%, transparent);
  --_void-tone-active: color-mix(in srgb, var(--_void-tone) 13%, transparent);
}

/* A coloured button tints itself with the shared tint strength */
void-button[color]:not([color="default"]) {
  --_void-tone-subtle: color-mix(in srgb, var(--_void-tone) var(--void-tone-tint), transparent);
  --_void-tone-border: color-mix(in srgb, var(--_void-tone) 50%, transparent);
}

/* One override cascades to all derived states */
void-button[color="error"]   { --_void-tone: var(--void-color-error); }
void-button[color="warning"] { --_void-tone: var(--void-color-warning); }
void-button[color="success"] { --_void-tone: var(--void-color-success); }
void-button[color="info"]    { --_void-tone: var(--void-color-info); }
void-button[color="notice"]  { --_void-tone: var(--void-color-notice); }
```

Component CSS in `@voidable/theme` lives in `src/components/` with one file per component, imported by `src/core.css`, each into a cascade layer. `src/layers.css` declares the order (`theme, base, components.void.reset, components.void.tokens, components.void.themes, components.void.type, components.void.components, components.void.patterns, components.void.skins, components.void.a11y, utilities`: the theme's layers are children of `components` so Tailwind utilities beat them whichever stylesheet loads first; a skin lives in `components.void.skins`); a source file is never wrapped in `@layer` itself, only its `@import` is. `src/reset.css` is generated (scoped to `void-*` tags and what they contain): never hand-edit it, and never put a selector that matches an element outside a `void-*` component in the theme; `src/base.css` (`html`, `body`) is the one optional exception. `mise run theme:build` generates `packages/theme/dist/` (the single `void.css` and `void.min.css`, per-component and per-pattern files, `exports.json`); `lint:theme` checks the layer structure and the built output. Apps override the theme with unlayered CSS and no `!important`.

Every enumerated attribute uses one scale: `size` is `sm | md | lg` (default `md`), `color` is `default | error | warning | caution | success | info | notice | highlight`. Do not add steps or values to one component.

`void-button` has three variants of one size: `outline` (default), `filled` and `ghost` (nothing drawn at rest, a faint fill on hover; for row actions, toolbars and the quiet action beside a primary one).

## Release & Versioning

- **One version for everything.** Every package (npm, the `voidable-hotwire` gem, the `live_voidable` Hex package, the `voidable/laravel` Composer package) is released together at one version, tagged `vX.Y.Z`, even packages without changes. The first unified release is 0.8.0; the old per-package tags (`ui-v*`, `theme-v*`, `gem-hotwire-v*`, ...) are history only.
- **Automatic on merge.** `.github/workflows/release.yml` runs on every push to `master`. It computes the next version from the conventional commits since the last `vX.Y.Z` tag that touch `packages/**` (not Storybook, the placeholder `voidable` gem or the unpublished demo apps `packages/*/demo*`) or `release.yml`: `feat` minor, `fix`/`perf`/`revert` patch, breaking (`type!:` or `BREAKING CHANGE:`) major, which is a **minor** bump while the major is 0. No releasing commit, no release. Logic: `scripts/release/version.mjs`, tested by `mise run release:test`.
- **Order:** plan, CI (`ci.yml` via `workflow_call`, the only CI run for a push), tag, npm theme and core, npm adapters, then gem, Hex and Composer, then the GitHub release (notes from `scripts/release/notes.mjs`; the binaries are attached to it afterwards), then docs and Storybook to GitHub Pages. Docs-only pushes skip the packages and deploy Pages.
- **Versions are stamped, never committed.** Manifests hold `0.0.0` (`package.json` files, `packages/hotwire/gem/lib/voidable/hotwire/version.rb`, `packages/liveview/hex/mix.exs`); `scripts/release/stamp.mjs` writes the release version into the CI checkout. Internal npm dependencies are `workspace:*`, which `pnpm pack` turns into the exact version. The gem's CDN pins (`Voidable::Hotwire::CDN`) derive from its `VERSION`. Composer has no version field; the tag on the `VoidableUI/laravel` mirror is the version.
- **Never hand-type a Voidable version** (CDN URL, Gemfile/mix requirement, demo pin). `mise run lint:versions` fails on it; derive it (the docs use `stats.versionNumber` from `docs/src/lib/stats.ts`) or leave it out.
- **Idempotent and resumable.** Each publish step skips a version already on its registry; a commit that already carries its `vX.Y.Z` tag resumes at that version. A manual run of the Release workflow defaults to a dry run that builds and packs everything and publishes nothing; `mise run release:dry-run` does the same locally.
- **The `voidable` binaries** (linux, darwin, windows on amd64 and arm64) are attached to the GitHub release as `voidable_<os>_<arch>.tar.gz` (`.zip` for windows) with `checksums.txt` and a GitHub build-provenance attestation. The `binaries` job runs beside `npm-core` and `binaries-attach` runs after `github-release`; no other job needs either, so a failure there never stops a publish (`scripts/release/workflow.test.mjs` pins this graph). `scripts/release/binaries.sh` stamps the version, builds `@voidable/ui` and the theme, fills the Go embed directory (`build:assets`, which also writes `VERSION`), compiles with `-tags assets` and finally runs the binary's `install` against this checkout's build. `docs/public/install.sh` is the installer served at `voidable.dev/install.sh`. `go install` cannot work: the manifest and assets the binary embeds are build output, not committed. Change an archive name or the release URL layout in `binaries.mjs` and `install.sh` together.
- Every script the workflow calls lives in `scripts/release/` and has a `mise run release:*` task; keep logic there, not in inline YAML.

## Commit Messages

Follow conventional commits (Angular convention):
- `feat:` — new feature
- `fix:` — bug fix
- `chore:` — maintenance, dependency updates
- `ci:` — CI/CD changes
- `docs:` — documentation changes

Scope to the affected package when possible (e.g., `feat(ui): add void-dialog component`).

The type decides the release (see Release & Versioning): `feat` minor, `fix`/`perf`/`revert` patch, anything else none. Mark a breaking change with `type!:` or a `BREAKING CHANGE:` footer; while Voidable is 0.x it bumps the minor version, never 1.0.0.

## Rules

- **NEVER** add visual CSS to `@voidable/ui` — all styling comes from theme tokens.
- **NEVER** use Shadow DOM — all components use Light DOM.
- **NEVER** call npm/pnpm directly — always use `mise run <task>`.
- **NEVER** hardcode color values in components — always use `var(--void-*)`.
- **NEVER** import CSS in the `@voidable/ui` package entry point — theme loading is the consumer's responsibility.
