# @voidable/ui

Core web components for Voidable UI, a framework-agnostic component library built with Lit 3. Components render in the Light DOM and ship with no visual CSS: without a theme loaded they are unstyled. Load [`@voidable/theme`](https://www.npmjs.com/package/@voidable/theme) for the default look.

## Install

```bash
npm install @voidable/ui @voidable/theme
```

## Usage with a bundler

Import the theme (CSS) and the components (registers every `<void-*>` element) in your app entry point. This needs a bundler that handles CSS imports, such as Vite.

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

Prefer smaller bundles? Import single components: `import '@voidable/ui/button'`.

## Usage without a bundler

A bare `import '@voidable/theme'` cannot work in a browser, because the theme is CSS and the package entry point is not a URL. Use a stylesheet link for the theme and a CDN that resolves the `lit` dependency for the components:

```html
<!doctype html>
<html lang="en" data-theme="dark">
  <head>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@voidable/theme/src/index.css" />
    <script type="module" src="https://esm.sh/@voidable/ui"></script>
  </head>
  <body>
    <void-button variant="filled" color="success">Save</void-button>
  </body>
</html>
```

In production, pin both URLs to the release you use by inserting `@<version>` after the package name. Every Voidable package shares one version number, so the theme and the components take the same one (see the [release notes](https://github.com/VoidableUI/Voidable/releases)).

## Component attributes

Components that take a `color` accept `default`, `error`, `warning`, `success`, `info` or `notice`. Buttons take `variant="outline"` (default) or `variant="filled"`. See the docs for each component's attributes.

## Components

`void-button`, `void-input`, `void-select`, `void-checkbox`, `void-radio`, `void-switch`,
`void-dialog`, `void-drawer`, `void-tabs`, `void-accordion`, `void-table`, `void-toast`,
`void-alert`, `void-badge`, `void-tag`, `void-avatar`, `void-spinner`, `void-skeleton`,
`void-progress`, `void-panel`, `void-card`, `void-popover`, `void-tooltip`, `void-banner`,
`void-breadcrumbs`, `void-list`, `void-stepper`, `void-pagination`, `void-combobox`,
`void-slider`, `void-file-upload`, `void-nav-bar`, `void-bar-chart`, `void-gauge`, and more.
The full list is in the [component overview](https://voidable.dev/components/overview/).

## Documentation

- [Docs](https://voidable.dev)
- [Storybook](https://voidable.dev/storybook/)
- [GitHub](https://github.com/VoidableUI/Voidable)
- [npm](https://www.npmjs.com/package/@voidable/ui)

## License

MIT
