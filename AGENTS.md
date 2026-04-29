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

Without a theme package loaded, components are completely devoid of styling. `@voidable/ui` ships **zero visual CSS**. All visual properties resolve through `--vdb-*` CSS custom properties defined by a theme package. Component CSS may reference `var(--vdb-*)` tokens but those tokens have **no fallback values** in the component package. Theme loading is the consumer's responsibility.

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
| CSS custom properties | `--vdb-*` | `--vdb-color-accent` |
| Custom elements | `vdb-*` | `<vdb-button>`, `<vdb-panel>` |
| TypeScript classes | `Vdb*` | `VdbButton`, `VdbPanel` |
| Custom events | `vdb-*` | `vdb-click`, `vdb-change` |
| Base class | — | `VoidElement` |

## CSS Token Architecture

Three-tier token system with `--vdb-*` prefix.

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

- Dark mode default with true black (`#000000`) OLED-friendly surfaces
- White glow shadows (not dark drop shadows) for elevation on dark backgrounds
- Monochrome hierarchy — color used sparingly, reserved for status indication
- Stone warm neutrals for text and borders
- Status palette: red (error), amber (warning), green (success), blue (info), purple (notice), pink (highlight)

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
   if (!customElements.get('vdb-button')) {
     customElements.define('vdb-button', VdbButton);
   }
   ```
3. Components render in Light DOM — this enables shared CSS tokens from the parent scope.
4. Components have zero visual styling without a theme loaded.
5. Never hardcode color values — always use `var(--vdb-*)`.
6. Never import CSS in the `@voidable/ui` package entry point.

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

Scope to the affected package when possible (e.g., `feat(ui): add vdb-dialog component`).

## Reference Files

The `ref/` directory contains source CSS and component patterns from upstream projects for porting reference. These are **not shipped** — they exist for development reference only.

## Rules

- **NEVER** add visual CSS to `@voidable/ui` — all styling comes from theme tokens.
- **NEVER** use Shadow DOM — all components use Light DOM.
- **NEVER** call npm/pnpm directly — always use `mise run <task>`.
- **NEVER** hardcode color values in components — always use `var(--vdb-*)`.
- **NEVER** import CSS in the `@voidable/ui` package entry point — theme loading is the consumer's responsibility.
