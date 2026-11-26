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

Or load components on demand. The autoloader registers nothing up front: it watches the document for `<void-*>` tags (including ones added later by Turbo, LiveView, Livewire or your own code) and imports each component the first time its tag appears.

```js
import '@voidable/ui/autoloader';
```

```js
import { ready } from '@voidable/ui/autoloader';

await ready(); // every <void-*> element on the page is defined
```

It suits server-rendered pages and pages whose components vary by route. If your pages use most of the library, the full import above is simpler and has no per-component startup latency. With an import map and no bundler, the subpath needs its file name (`@voidable/ui/autoloader.js`); see [Loading components](https://voidable.dev/getting-started/loading/).

## Usage without a bundler

A bare `import '@voidable/theme'` cannot work in a browser, because the theme is CSS and the package entry point is not a URL. Use a stylesheet link for the theme and a CDN that resolves the `lit` dependency for the components:

```html
<!doctype html>
<html lang="en" data-theme="dark">
  <head>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@voidable/theme/dist/void.min.css" />
    <script type="module" src="https://esm.sh/@voidable/ui"></script>
  </head>
  <body>
    <void-button variant="filled" color="success">Save</void-button>
  </body>
</html>
```

In production, pin both URLs to the release you use by inserting `@<version>` after the package name. Every Voidable package shares one version number, so the theme and the components take the same one (see the [release notes](https://github.com/VoidableUI/Voidable/releases)).

## Development warnings

A misspelled attribute, a value outside the allowed set, `disabled="false"` or a child in the wrong parent does nothing and says nothing. In development, import the separate `dev` entry and the browser console reports each one with the element, the valid alternatives and a "did you mean":

```js
if (import.meta.env.DEV) import('@voidable/ui/dev');
// no bundler, with an import map: <script type="module">import '@voidable/ui/dev.js'</script>
```

`import '@voidable/ui'`, a single-component import and the autoloader never contain it. What counts as valid is generated from the Custom Elements Manifest. In tests, `configure({ throw: true })` from `@voidable/ui/dev` turns warnings into thrown errors. See [Development warnings](https://voidable.dev/getting-started/development-warnings/).

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

## Tables

`void-table` wraps a native `<table>` and decides how it behaves when space is short:

```html
<void-table stack hoverable>
  <table>
    <thead>
      <tr><th data-stack="title">Name</th><th>Role</th><th data-align="end">Seats</th><th data-stack="actions">Actions</th></tr>
    </thead>
    <tbody>
      <tr><td>Ada</td><td>Admin</td><td>4</td><td><void-button variant="ghost" size="sm">Edit</void-button></td></tr>
    </tbody>
  </table>
</void-table>
```

- `stack` turns each row into a block of label and value pairs while the table's *container* (not the viewport) is narrower than a breakpoint: `stack` alone uses the theme's (`--void-table-stack-at`, 40rem), `stack="48rem"` sets one, `stack="always"` always stacks. The header text is the label of every value; `data-stack` on a header cell makes its column the block's `title`, a row `select` checkbox, the `actions` or `hide`s it.
- `scrollable` makes a table that stays tabular a horizontal scroll region that is focusable and labelled (`label`, else the `<caption>`) while it overflows, with faded edges; `sticky-header`, `sticky-column` and `max-height` pin the header or first column. Without `scrollable` nothing clips, so a menu opened from the last row is fully visible.
- `inset` fits a table inside a card or panel; `striped`, `hoverable`, `compact` and `bordered` are row treatments.

A stacked row keeps its table semantics for assistive technology (explicit `table`, `row` and `cell` roles). See the [table page](https://voidable.dev/components/table/) for live examples.

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
| Enter / Space (item) | Activate the item, close and return focus to the trigger (unless the item has `keep-open`) |
| Escape | Close and return focus to the trigger |
| Tab | Close and move on |

## Overlays

Dialog and drawer are native `<dialog>` elements opened with `showModal()`, so the page behind them is inert, focus moves in, and focus returns to the opener when they close. Popover, hover card, dropdown menu, tooltip, the picker lists and the toast container are `popover="manual"` elements in the top layer, placed next to their trigger with CSS anchor positioning (with a built-in fallback) and flipped at the viewport edges, never clipped by an `overflow` or `transform` ancestor. Open overlays form one stack: Escape and outside presses close only the topmost one, and the page scroll lock is counted.

Every overlay takes `open`, `side` and `align` where it is anchored, and fires `void-open` and `void-close` with a `reason` (`escape`, `outside`, `select`, `api`, ...). These two events do not bubble, and `void-close` can be cancelled when the user caused it. Browser baseline: the Popover API (Chrome 114, Firefox 125, Safari 17). Details on the [docs site](https://voidable.dev/components/overlays/).

## Documentation

- [Docs](https://voidable.dev)
- [Storybook](https://voidable.dev/storybook/)
- [GitHub](https://github.com/VoidableUI/Voidable)
- [npm](https://www.npmjs.com/package/@voidable/ui)

## License

MIT
