# Void UI Monorepo Scaffold Implementation Plan

> Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Scaffold the `@voidable/*` monorepo with theme, UI, framework adapters, Storybook, docs site, CI/CD, and mise task runner.

**Architecture:** pnpm monorepo with 6 packages. `@voidable/theme` owns all CSS tokens (`--vdb-*`). `@voidable/ui` is Lit web components (Light DOM) with zero visual CSS — completely unstyled without a theme. Framework adapters (react, solid, vue, svelte) wrap the core. Storybook and a docs site publish to GitHub Pages. Mise manages tooling versions and all task execution via `.mise/tasks/` shell scripts.

**Tech Stack:** Lit 3, TypeScript 5, Vite 6, pnpm 10, Storybook 10 (`@storybook/web-components-vite`), Vitest, mise

---

### Task 1: Root workspace scaffolding

**Files:**
- Create: `mise.toml`
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `.npmrc`
- Create: `LICENSE`

**Step 1: Create `mise.toml`**

```toml
[tools]
node = "lts"
"npm:pnpm" = "10"
```

**Step 2: Create root `package.json`**

```json
{
  "private": true,
  "type": "module",
  "packageManager": "pnpm@10.11.0"
}
```

**Step 3: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - packages/*
  - docs
```

**Step 4: Create base `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

**Step 5: Create `.gitignore`**

```
node_modules/
dist/
.turbo/
*.tgz
.DS_Store
storybook-static/
```

**Step 6: Create `.npmrc`**

```
shamefully-hoist=false
strict-peer-dependencies=true
```

**Step 7: Create `LICENSE`**

Apache-2.0 license text with `Copyright 2026 VoidableUI`.

**Step 8: Run `mise install && mise run install`**

Verify node and pnpm are available.

**Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold workspace root"
```

---

### Task 2: Mise task scripts

**Files:**
- Create: `.mise/tasks/install`
- Create: `.mise/tasks/build`
- Create: `.mise/tasks/test`
- Create: `.mise/tasks/dev`
- Create: `.mise/tasks/storybook`
- Create: `.mise/tasks/storybook:build`
- Create: `.mise/tasks/lint`
- Create: `.mise/tasks/clean`
- Create: `.mise/tasks/typecheck`

**Step 1: Create all task scripts**

Each script follows the pattern:
```bash
#!/usr/bin/env bash
#MISE description="..."
set -euo pipefail
```

- `install` — `pnpm install`
- `build` — `pnpm --filter './packages/*' build` (depends on install)
- `test` — `pnpm --filter './packages/*' test` (depends on build)
- `dev` — `pnpm --filter @voidable/storybook dev`
- `storybook` — `pnpm --filter @voidable/storybook dev`
- `storybook:build` — `pnpm --filter @voidable/storybook build` (depends on build)
- `lint` — `pnpm --filter '*' lint`
- `clean` — `rm -rf node_modules packages/*/dist packages/*/node_modules docs/node_modules`
- `typecheck` — `pnpm --filter '*' typecheck`

**Step 2: Make scripts executable**

```bash
chmod +x .mise/tasks/*
```

**Step 3: Commit**

```bash
git add .mise/
git commit -m "chore: add mise task scripts"
```

---

### Task 3: `@voidable/theme` package

**Files:**
- Create: `packages/theme/package.json`
- Create: `packages/theme/src/primitives.css`
- Create: `packages/theme/src/tokens.css`
- Create: `packages/theme/src/reset.css`
- Create: `packages/theme/src/index.css`

**Step 1: Create `package.json`**

```json
{
  "name": "@voidable/theme",
  "version": "0.0.0",
  "type": "module",
  "license": "Apache-2.0",
  "exports": {
    ".": "./src/index.css",
    "./primitives": "./src/primitives.css",
    "./tokens": "./src/tokens.css",
    "./reset": "./src/reset.css"
  },
  "files": ["src"],
  "repository": {
    "type": "git",
    "url": "https://github.com/VoidableUI/Voidable",
    "directory": "packages/theme"
  }
}
```

Note: Pure CSS package — no build step, no JS dependencies. Ships source CSS directly.

**Step 2: Create `primitives.css`**

Port from the mockup's `colors_and_type.css` Tier 1 section. Rename all `--wf-*` to `--vdb-*`. Include:
- Stone palette (50–950 including 450)
- Status palettes: red, amber, green, blue, purple, pink (400/500/600 from mockup)
- Full 50–950 scales for red, amber, green, blue, purple
- Spacing scale (1–24 + xs/sm/md/lg/xl aliases)
- Typography sizes (2xs–5xl), weights, line heights
- Font stacks (system stacks — no specific webfonts bundled)
- Radii (none–full)
- Shadows (white glows from mockup for dark mode)
- Ring-hair shadows from mockup
- Motion durations + easings
- Z-index layers

**Step 3: Create `tokens.css`**

Port Tier 2 semantic tokens. Rename `--wf-*` to `--vdb-*`. Use enhanced dark-mode values (true black surfaces, hairline white borders). Include:
- Dark theme (`:root`) — true black surfaces from mockup
- Light theme (`[data-theme="light"]`) — stone-50 surfaces from mockup
- Status colors (error, warning, success, info, notice, highlight)
- Subtle status variants (color-mix)
- Named spacing aliases

**Step 4: Create `reset.css`**

Minimal reset: box-sizing, margin/padding zero, antialiasing, inherit fonts.

**Step 5: Create `index.css`**

```css
@import './primitives.css';
@import './tokens.css';
@import './reset.css';
```

**Step 6: Commit**

```bash
git add packages/theme/
git commit -m "feat(theme): add design tokens — primitives, semantic tokens, reset"
```

---

### Task 4: `@voidable/ui` package

**Files:**
- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`
- Create: `packages/ui/vite.config.ts`
- Create: `packages/ui/src/base.ts`
- Create: `packages/ui/src/index.ts`

**Step 1: Create `package.json`**

```json
{
  "name": "@voidable/ui",
  "version": "0.0.0",
  "type": "module",
  "license": "Apache-2.0",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "development": "./src/index.ts",
      "default": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "vite build",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "lit": "^3.2.0"
  },
  "devDependencies": {
    "typescript": "^5.8.0",
    "vite": "^6.0.0",
    "vite-plugin-dts": "^4.0.0",
    "vitest": "^3.0.0",
    "happy-dom": "^17.0.0"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/VoidableUI/Voidable",
    "directory": "packages/ui"
  }
}
```

**Step 2: Create `tsconfig.json`**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

**Step 3: Create `vite.config.ts`**

Vite lib mode config: entry `src/index.ts`, output ESM, generate .d.ts via `vite-plugin-dts`. No CSS processing — this package has no CSS.

**Step 4: Create `src/base.ts`**

```typescript
import { LitElement } from 'lit';

export class VoidElement extends LitElement {
  createRenderRoot(): this {
    return this;
  }
}
```

Light DOM, no Shadow DOM.

**Step 5: Create `src/index.ts`**

```typescript
export { VoidElement } from './base.js';
```

**Step 6: Write a basic test**

Create `packages/ui/tests/base.test.ts` — verify `VoidElement` extends `LitElement` and `createRenderRoot` returns `this`.

**Step 7: Run build and test**

```bash
mise run build
mise run test
```

**Step 8: Commit**

```bash
git add packages/ui/
git commit -m "feat(ui): add VoidElement base class — Lit Light DOM"
```

---

### Task 5: Framework adapter stubs

**Files:**
- Create: `packages/react/package.json`, `packages/react/tsconfig.json`, `packages/react/src/index.tsx`
- Create: `packages/solid/package.json`, `packages/solid/tsconfig.json`, `packages/solid/src/index.ts`
- Create: `packages/vue/package.json`, `packages/vue/tsconfig.json`, `packages/vue/src/index.ts`
- Create: `packages/svelte/package.json`, `packages/svelte/tsconfig.json`, `packages/svelte/src/index.ts`

**Step 1: Create each adapter**

Each follows the same pattern:
- `package.json` with `@voidable/ui` as peer dependency + framework as peer dependency
- `tsconfig.json` extending root
- `src/index.ts` (or `.tsx` for React) — empty barrel export with a placeholder comment

Package names: `@voidable/ui-react`, `@voidable/ui-solid`, `@voidable/ui-vue`, `@voidable/ui-svelte`

React adapter will eventually contain the `useWcEvents` hook and `wrapWc` factory. For now, stub only.

**Step 2: Commit**

```bash
git add packages/react/ packages/solid/ packages/vue/ packages/svelte/
git commit -m "chore: add framework adapter package stubs"
```

---

### Task 6: Storybook setup

**Files:**
- Create: `packages/storybook/package.json`
- Create: `packages/storybook/.storybook/main.ts`
- Create: `packages/storybook/.storybook/preview.ts`
- Create: `packages/storybook/stories/Introduction.mdx`

**Step 1: Create Storybook package**

`packages/storybook/package.json` — private package, depends on `@voidable/ui` and `@voidable/theme` as workspace deps. Uses `@storybook/web-components-vite`.

```json
{
  "name": "@voidable/storybook",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "storybook dev -p 6006",
    "build": "storybook build -o ../../storybook-static"
  },
  "dependencies": {
    "@voidable/ui": "workspace:*",
    "@voidable/theme": "workspace:*"
  },
  "devDependencies": {
    "@storybook/web-components-vite": "^10.0.0",
    "@storybook/addon-essentials": "^10.0.0",
    "@storybook/blocks": "^10.0.0",
    "storybook": "^10.0.0",
    "lit": "^3.2.0",
    "vite": "^6.0.0"
  }
}
```

**Step 2: Create `.storybook/main.ts`**

Configure to discover stories from `../stories/**/*.stories.ts` and `../../packages/ui/src/**/*.stories.ts`.

**Step 3: Create `.storybook/preview.ts`**

Import `@voidable/theme` CSS. Set dark background as default. Import `@voidable/ui` to register custom elements.

**Step 4: Create intro story**

`stories/Introduction.mdx` — brief intro page for the Void UI Storybook.

**Step 5: Verify Storybook starts**

```bash
mise run storybook
```

**Step 6: Commit**

```bash
git add packages/storybook/
git commit -m "feat: add Storybook setup with theme integration"
```

---

### Task 7: Docs site scaffolding

**Files:**
- Create: `docs/package.json`
- Create: `docs/astro.config.mjs`
- Create: `docs/src/content/docs/index.mdx`

**Step 1: Scaffold Astro Starlight docs site**

`docs/package.json` — uses `@astrojs/starlight` for documentation. Private package.

**Step 2: Create minimal Astro config**

Configure Starlight with Void UI branding, link to Storybook, GitHub repo link.

**Step 3: Create index page**

Landing page with overview of `@voidable/theme`, `@voidable/ui`, and adapters.

**Step 4: Add `docs:dev` and `docs:build` mise tasks**

Create `.mise/tasks/docs` and `.mise/tasks/docs:build`.

**Step 5: Commit**

```bash
git add docs/ .mise/tasks/docs*
git commit -m "feat: add docs site scaffold (Astro Starlight)"
```

---

### Task 8: GitHub Actions — release workflows

**Files:**
- Create: `.github/workflows/release-ui.yml`
- Create: `.github/workflows/release-theme.yml`
- Create: `.github/workflows/release-ui-react.yml`
- Create: `.github/workflows/release-ui-solid.yml`
- Create: `.github/workflows/release-ui-vue.yml`
- Create: `.github/workflows/release-ui-svelte.yml`

**Step 1: Create release workflow for each package**

Follow this pattern:
1. Trigger on push to `master` with `paths` filter per package
2. Build + test job
3. Tag job using `Work-Fort/github-tag-action@v6.3` with package-specific `tag_prefix` and `paths`
4. Release job: set version from tag, build, `npm publish --provenance --access public`, create GitHub Release

Tag prefixes: `ui-v`, `theme-v`, `ui-react-v`, `ui-solid-v`, `ui-vue-v`, `ui-svelte-v`

Uses `jdx/mise-action@v3` for tooling setup.

**Step 2: Commit**

```bash
git add .github/
git commit -m "ci: add per-package release workflows"
```

---

### Task 9: GitHub Actions — Pages deployment

**Files:**
- Create: `.github/workflows/deploy-pages.yml`

**Step 1: Create Pages workflow**

Triggers on push to `master`. Builds Storybook and docs site. Deploys both to GH Pages:
- `/` — docs site (Starlight)
- `/storybook/` — Storybook

Uses `actions/deploy-pages@v4` with artifact upload.

**Step 2: Commit**

```bash
git add .github/workflows/deploy-pages.yml
git commit -m "ci: add GitHub Pages deployment for docs + Storybook"
```

---

### Task 10: Install dependencies and verify

**Step 1: Run `mise run install`**

**Step 2: Run `mise run build`**

Verify all packages build cleanly.

**Step 3: Run `mise run test`**

Verify base test passes.

**Step 4: Run `mise run storybook`**

Verify Storybook starts and shows the intro page with theme tokens active.

**Step 5: Commit any lockfile or fixups**

```bash
git add pnpm-lock.yaml
git commit -m "chore: add lockfile"
```

---

### Task 11: AGENTS.md

**Files:**
- Create: `AGENTS.md`

**Step 1: Create AGENTS.md**

Document project conventions:
- Monorepo structure and package purposes
- Mise for all task execution (never call npm/pnpm directly)
- Available mise tasks
- Token prefix `--vdb-*`
- Theme separation principle
- Lit Light DOM pattern
- Conventional commits for semver tagging
- Component naming: `vdb-*` custom elements, `Vdb*` class names, `VoidElement` base class
- Product name is "Void UI" (not "Voidable" — that's the npm scope)

**Step 2: Commit**

```bash
git add AGENTS.md
git commit -m "docs: add AGENTS.md with project conventions"
```
