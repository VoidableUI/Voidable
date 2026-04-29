# Void UI

A component library monorepo built on Lit 3 web components with framework adapters, design tokens, and a strict theme-separation architecture.

- **npm scope**: `@voidable/*`
- **GitHub**: `github.com/VoidableUI/Voidable`
- **Domain**: `voidable.dev`
- **License**: MIT

## Packages

| Package | Path | Description |
|---------|------|-------------|
| `@voidable/ui` | `packages/ui/` | Lit web components (core) |
| `@voidable/theme` | `packages/theme/` | CSS custom properties, design tokens, resets |
| `@voidable/ui-react` | `packages/react/` | React adapter |
| `@voidable/ui-solid` | `packages/solid/` | SolidJS adapter |
| `@voidable/ui-vue` | `packages/vue/` | Vue adapter |
| `@voidable/ui-svelte` | `packages/svelte/` | Svelte adapter |
| `@voidable/storybook` | `packages/storybook/` | Storybook (private, published to GH Pages) |
| — | `docs/` | Documentation site (Astro Starlight, published to GH Pages) |

## Architecture

### Light DOM Web Components

All components extend `VoidElement`, a base class that overrides `createRenderRoot()` to return `this`, eliminating Shadow DOM. This allows CSS custom properties from any ancestor scope to style components without piercing boundaries.

### Theme Separation (Core Tenet)

Without a theme package loaded, components are completely devoid of styling. `@voidable/ui` ships **zero visual CSS**. All visual properties resolve through `--void-*` CSS custom properties defined by a theme package. Component CSS may reference `var(--void-*)` tokens but those tokens have **no fallback values** in the component package. Theme loading is the consumer's responsibility.

### Framework Adapters

- **React** (`@voidable/ui-react`): Uses a `wrapWc` factory + `useWcEvents` hook pattern. React does not forward custom events to Custom Elements natively, so the adapter bridges this gap.
- **SolidJS / Vue / Svelte**: These frameworks handle Custom Elements natively. Adapters export composable hooks only with minimal wrapping.

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

Three-tier token system with `--void-*` prefix.

### Tier 1 — Primitives (`@voidable/theme/primitives`)

Raw color scales with no semantic meaning:
- **Stone palette**: 50–950 (includes 450)
- **Status palettes**: red, amber, green, blue, purple, pink
- **Spacing scale**: rem-based
- **Typography**: sizes, weights, line heights, system font stacks
- **Other**: border radii, shadows, motion durations, z-index

### Tier 2 — Semantic Tokens (`@voidable/theme/tokens`)

Semantic aliases that reference Tier 1 primitives:
- **Surfaces**: `bg`, `bg-secondary`, `bg-elevated`, `bg-hover`, `bg-accent`, `bg-overlay`
- **Text**: `text`, `text-secondary`, `text-muted`, `text-tertiary`, `text-disabled`, `text-on-accent`
- **Borders**: `border`, `border-strong`, `border-focus`
- **Accent**
- **Status colors**: error, warning, success, info, notice, highlight (each with subtle variants)
- **Dark mode** is default (true black `#000000` surfaces)
- **Light mode** via `[data-theme="light"]`

### Tier 3 — App-Specific Themes

Consumer applications define their own Tier 3 tokens. These are not part of Void UI.

## Design Values

The name "Void" reflects two core ideas: components are **devoid** of styling without a theme loaded, and the visual language embraces the **void** — negative space as a first-class design element.

- **Pure backgrounds** — true black (`#000000`) in dark mode, true white (`#ffffff`) in light mode. No off-white, no near-black.
- **Negative space** — generous padding, margins, and gaps. Let content breathe. Density comes from the consumer, not the library.
- **Monochrome hierarchy** — color used sparingly, reserved for status indication.
- **Stone warm neutrals** for text and borders.
- **White glow shadows** (not dark drop shadows) for elevation on dark backgrounds.
- **Status palette**: red (error), amber (warning), green (success), blue (info), purple (notice), pink (highlight).

### Shape Variants

Two shape modes controlled by `[data-shape]` on an ancestor (defaults to `"curvy"`):

| Variant | Radii | Character |
|---------|-------|-----------|
| `curvy` (default) | `--void-radius-*` values (4px–16px) | Rounded, approachable |
| `sharp` | All radii resolve to `0` | Angular, technical |

Consumers toggle shape globally (`<html data-shape="sharp">`) or locally on any ancestor.

## Tooling

### mise

`mise` manages all tooling versions (Node LTS, pnpm 10) via `mise.toml`. **All tasks run through mise** — never call npm or pnpm directly.

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
| `mise run dev` | Start all packages in watch/dev mode |
| `mise run build` | Build all packages |
| `mise run test` | Run all tests |
| `mise run storybook` | Start Storybook dev server |
| `mise run storybook:build` | Build Storybook for deployment |
| `mise run typecheck` | TypeScript type checking |
| `mise run lint` | Lint all packages |
| `mise run clean` | Remove build artifacts and node_modules |
| `mise run docs` | Start docs dev server |
| `mise run docs:build` | Build docs for deployment |

### Tech Stack

- **Lit 3** — web components
- **TypeScript 6**
- **Vite 8** — build (powered by Rolldown)
- **pnpm 10** — package management
- **Storybook 10** with `@storybook/web-components-vite`
- **Vitest 4** — testing
- **happy-dom 20** — test DOM environment

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

### CSS Selector Strategy

Use **tag + attribute selectors** (not BEM classes) for all component styling in `@voidable/theme`:

```css
/* Base — tag selector */
void-button { display: inline-flex; }

/* Variants — attribute selectors */
void-button[variant="filled"] { background: var(--tone); }
void-button[disabled] { opacity: 0.5; pointer-events: none; }

/* States — pseudo-classes */
void-button:hover { background: var(--tone-hover); }
void-button:focus-visible { outline: 2px solid var(--void-color-border-focus); }
```

Rationale:
- Lower specificity (0,1,1) — easier for consumers to override.
- Attributes exist in SSR HTML before hydration — no FOUC.
- Aligns with Lit's `@property({ reflect: true })` — no extra JS to toggle classes.
- No class collision risk with utility CSS frameworks.

### Tone System

Components that support color variants use a **tone variable** pattern. The base rule defines derived values via `color-mix()`, and each color variant only overrides `--tone`:

```css
void-button {
  --tone: var(--void-color-accent);
  --tone-text: var(--tone);
  --tone-subtle: color-mix(in srgb, var(--tone) 10%, transparent);
  --tone-border: color-mix(in srgb, var(--tone) 28%, transparent);
  --tone-hover: color-mix(in srgb, var(--tone) 16%, transparent);
}

/* One override cascades to all derived states */
void-button[color="error"]   { --tone: var(--void-color-error); }
void-button[color="warning"] { --tone: var(--void-color-warning); }
void-button[color="success"] { --tone: var(--void-color-success); }
void-button[color="info"]    { --tone: var(--void-color-info); }
void-button[color="notice"]  { --tone: var(--void-color-notice); }
```

Component CSS in `@voidable/theme` lives in `src/components/` with one file per component, imported by `src/index.css`.

## Release & Versioning

- **Conventional commits** (Angular convention) for automatic semver.
- Per-package tagging with prefixes: `ui-v`, `theme-v`, `ui-react-v`, `ui-solid-v`, `ui-vue-v`, `ui-svelte-v`.
- Each package has its own release workflow triggered by path-scoped changes on `master`.
- Version comes from git tags at publish time — no manual version management in `package.json`.
- Storybook and docs deploy to GitHub Pages via a separate workflow.

## Commit Messages

Follow conventional commits (Angular convention):
- `feat:` — new feature
- `fix:` — bug fix
- `chore:` — maintenance, dependency updates
- `ci:` — CI/CD changes
- `docs:` — documentation changes

Scope to the affected package when possible (e.g., `feat(ui): add void-dialog component`).

## Reference Files

The `ref/` directory contains source CSS and component patterns from upstream projects for porting reference. These are **not shipped** — they exist for development reference only.

## Rules

- **NEVER** add visual CSS to `@voidable/ui` — all styling comes from theme tokens.
- **NEVER** use Shadow DOM — all components use Light DOM.
- **NEVER** call npm/pnpm directly — always use `mise run <task>`.
- **NEVER** hardcode color values in components — always use `var(--void-*)`.
- **NEVER** import CSS in the `@voidable/ui` package entry point — theme loading is the consumer's responsibility.
