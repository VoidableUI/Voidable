# Voidable

Voidable is a framework-agnostic web component library built on Lit 3, with adapters for React, Vue, Solid, Svelte, Angular, Hotwire, Alpine and LiveView. Every component renders in the Light DOM and carries no visual CSS of its own.

The core idea: components are **devoid** of style until you load a theme. `@voidable/ui` ships structure and behavior only; all colors, spacing and shape come from `--void-*` CSS custom properties defined by `@voidable/theme` (or by your own theme). Because there is no Shadow DOM, your CSS and your tokens reach every part of every component.

- Docs: https://voidable.dev
- Storybook: https://voidable.dev/storybook/

## Install

```bash
npm install @voidable/ui @voidable/theme
```

## Usage

In a bundler-based app (for example Vite), import the theme and the components once in your entry point:

```js
import '@voidable/theme';
import '@voidable/ui';
```

```html
<void-button variant="filled" color="success">Save</void-button>

<void-field label="Name">
  <void-input placeholder="Ada Lovelace"></void-input>
</void-field>
```

To load components on demand instead of registering all of them, import `@voidable/ui/autoloader` (see [Loading components](https://voidable.dev/getting-started/loading/)). Without a bundler, use a stylesheet link and a CDN module import; see the [`@voidable/ui` README](packages/ui/README.md#usage-without-a-bundler). Framework guides are in the [docs](https://voidable.dev/frameworks/react/).

## Packages

| Package | Path | Registry | Description |
|---------|------|----------|-------------|
| `@voidable/ui` | [`packages/ui`](packages/ui) | npm | Lit web components (core) |
| `@voidable/theme` | [`packages/theme`](packages/theme) | npm | Design tokens, reset and component styles |
| `@voidable/ui-react` | [`packages/react`](packages/react) | npm | React wrappers with event bridging |
| `@voidable/ui-vue` | [`packages/vue`](packages/vue) | npm | Vue composables |
| `@voidable/ui-solid` | [`packages/solid`](packages/solid) | npm | Solid utilities |
| `@voidable/ui-svelte` | [`packages/svelte`](packages/svelte) | npm | Svelte utilities |
| `@voidable/ui-angular` | [`packages/angular`](packages/angular) | npm | Angular module and theme service |
| `@voidable/ui-hotwire` | [`packages/hotwire`](packages/hotwire) | npm | Stimulus controller and Turbo morph protection |
| `@voidable/ui-alpine` | [`packages/alpine`](packages/alpine) | npm | Alpine.js plugin and Livewire morph protection |
| `@voidable/ui-liveview` | [`packages/liveview`](packages/liveview) | npm | Phoenix LiveView hooks |
| `live_voidable` | [`packages/liveview/hex`](packages/liveview/hex) | Hex | Phoenix function components |
| `voidable-hotwire` | [`packages/hotwire/gem`](packages/hotwire/gem) | RubyGems | Rails helpers and asset integration |
| `voidable/laravel` | [`packages/alpine/laravel`](packages/alpine/laravel) | Composer | Laravel integration for the Alpine adapter |
| `@voidable/storybook` | [`packages/storybook`](packages/storybook) | private | Storybook, published at voidable.dev/storybook |

The documentation site lives in [`docs`](docs) (Astro Starlight).

All of these share one version number and are released together: every merge to `master` that changes a package publishes the next version of every package, even those without changes. Install matching versions; each adapter requires exactly the `@voidable/ui` it was released with. Releases and their notes are on [GitHub](https://github.com/VoidableUI/Voidable/releases); [CONTRIBUTING.md](CONTRIBUTING.md#releases) explains how the version is chosen.

## Development

Tooling is managed by [mise](https://mise.jdx.dev); run everything through it rather than calling npm or pnpm directly.

```bash
mise run install   # install dependencies
mise run build     # build all packages
mise run test      # run tests
mise run lint      # lint
mise run storybook # Storybook dev server
mise run docs      # docs dev server
mise run ci        # full pipeline: build, test, typecheck, lint and all lint:* checks
```

`mise tasks` lists every task. See [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md) for conventions.

## License

MIT. See [LICENSE.md](LICENSE.md).
