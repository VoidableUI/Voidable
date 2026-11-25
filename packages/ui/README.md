# @voidable/ui

Core web components for Voidable UI, a framework-agnostic component library built with Lit 3. Components render in the Light DOM and ship with no visual CSS: without a theme loaded they are unstyled. Load [`@voidable/theme`](https://www.npmjs.com/package/@voidable/theme) for the default look.

## Install

```bash
npm install @voidable/ui @voidable/theme
```

[Lit](https://lit.dev) 3 is a peer dependency, so your app and every Voidable package share one copy of it. npm, pnpm and Bun install it for you. With Yarn, add it yourself: `yarn add lit`.

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

Prefer smaller bundles? Import single components: `import '@voidable/ui/components/button'`.

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

## Server-side rendering

Every module registers its custom element when it is imported, which needs `customElements` and `HTMLElement`. Import `@voidable/ui` only in the browser (for example in a client-only entry or behind a dynamic `import()`); the elements are not rendered on the server. Server-rendered markup that uses `<void-*>` tags upgrades once the module loads.

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

## Keyboard and ARIA

The composite widgets follow the matching [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/patterns/) pattern. The widget role sits on the element that holds focus, not on the `<void-*>` host. Disabled options, tabs and items are skipped. Children added after the first render are wired when they arrive. Inside a `<void-dialog>`, Escape closes the open list or menu first. The same tables, with more detail, are on the [docs site](https://voidable.dev/components/keyboard/).

**`void-combobox`** (combobox with listbox popup; the native input is the combobox, `aria-activedescendant` marks the highlighted option)

| Key | Action |
|-----|--------|
| Down Arrow / Up Arrow | Open the list, or highlight the next / previous option (wraps) |
| Alt + Down Arrow | Open without highlighting |
| Enter | Choose the highlighted option; with none highlighted it is left alone, so a surrounding form submits |
| Escape | Close the list |
| Home / End | Move the text cursor |
| Tab | Close the list and move on |

**`void-multiselect`** (select-only combobox with a multiselectable listbox; the trigger is the combobox)

| Key | Action |
|-----|--------|
| Enter / Space / Down Arrow / Up Arrow | Open the list |
| Home / End | Open on the first / last option; when open, highlight it |
| Down Arrow / Up Arrow (open) | Highlight the next / previous option (wraps) |
| Enter / Space (open) | Toggle the highlighted option; the list stays open |
| Characters (open) | Jump to the next option starting with them |
| Escape / Tab | Close the list |

**`void-tabs`** (tabs; manual activation by default, `activation="auto"` selects on focus; roving tabindex)

| Key | Action |
|-----|--------|
| Right Arrow / Left Arrow | Focus the next / previous tab (wraps) |
| Home / End | Focus the first / last tab |
| Enter / Space | Select the focused tab (manual activation) |
| Tab | Move to the visible panel |

**`void-segmented-control`** (radio group; one tab stop, selection follows focus)

| Key | Action |
|-----|--------|
| Right Arrow / Down Arrow | Select the next item (wraps; first when none is selected) |
| Left Arrow / Up Arrow | Select the previous item (wraps; last when none is selected) |
| Space | Select the focused item |

**`void-menu`** (menu; the items are one tab stop; keys are handled on the menu, never on the document)

| Key | Action |
|-----|--------|
| Down Arrow / Up Arrow | Focus the next / previous item (wraps); from the search field, the first / last |
| Home / End | Focus the first / last item |
| Characters | Jump to the next item starting with them (not when `searchable`) |
| Enter / Space | Activate the item |
| Escape | Close the menu |

**`void-dropdown-menu`** (menu button; the trigger gets `aria-haspopup`, `aria-expanded` and `aria-controls`)

| Key | Action |
|-----|--------|
| Enter / Space / Down Arrow (trigger) | Open and focus the first item |
| Up Arrow (trigger) | Open and focus the last item |
| Down Arrow / Up Arrow / Home / End | Move between items (wraps) |
| Characters | Jump to the next item starting with them |
| Enter / Space (item) | Activate the item |
| Escape | Close and return focus to the trigger |
| Tab | Close and move on |

## Documentation

- [Docs](https://voidable.dev)
- [Storybook](https://voidable.dev/storybook/)
- [GitHub](https://github.com/VoidableUI/Voidable)
- [npm](https://www.npmjs.com/package/@voidable/ui)

## License

MIT
