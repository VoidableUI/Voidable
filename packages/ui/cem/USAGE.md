# Generated metadata in `@voidable/ui`

The `@voidable/ui` build writes a [Custom Elements Manifest](https://github.com/webcomponents/custom-elements-manifest), generates editor data and framework typings from it, and puts everything in `dist/`. Nothing here is committed. This file is meant to be moved into the docs later.

| Subpath | File | What it is |
|---|---|---|
| `@voidable/ui/custom-elements.json` | `dist/custom-elements.json` | The manifest: every tag with its attributes, properties, defaults and `void-*` events. `package.json` points to it through `customElements`. |
| `@voidable/ui/web-types.json` | `dist/web-types.json` | JetBrains web-types. WebStorm and other JetBrains IDEs find it through the `web-types` field in `package.json`, so no setup is needed. |
| `@voidable/ui/vscode.html-custom-data.json` | `dist/vscode.html-custom-data.json` | VS Code HTML custom data: completions and hover docs for tags, attributes and attribute values. |
| `@voidable/ui/components.json` | `dist/components.json` | Summary: `componentCount`, `tagCount`, `tags`, `components` (`[{ module, tags }]`), `eventNames`, `elements`. |
| `@voidable/ui/types/react` | `dist/types/react.d.ts` | React 19 `JSX.IntrinsicElements` for every `<void-*>` tag. |
| `@voidable/ui/types/solid` | `dist/types/solid.d.ts` | Solid `JSX.IntrinsicElements`. |
| `@voidable/ui/types/svelte` | `dist/types/svelte.d.ts` | Svelte 5 `SvelteHTMLElements`. |
| `@voidable/ui/types/vue` | `dist/types/vue.d.ts` | Vue `GlobalComponents`. |
| `@voidable/ui/types/elements` | `dist/types/elements.d.ts` | Shared maps the four above build on: `VoidElementTagNameMap`, `VoidElementProperties`, `VoidElementAttributeNames`, `VoidElementEvents`. |

## Framework typings

The `types/*` subpaths are types only. They have no runtime code and no `default` export condition, so a value import such as `import '@voidable/ui/types/react'` fails at bundle or run time with `ERR_PACKAGE_PATH_NOT_EXPORTED`. Load them in one of these two ways:

```ts
// anywhere in the project, e.g. src/env.d.ts or the app entry
import type {} from '@voidable/ui/types/react';
```

```jsonc
// or in tsconfig.json
{ "compilerOptions": { "types": ["@voidable/ui/types/react"] } }
```

Register the elements at runtime as usual (`import '@voidable/ui'` or a per-component import). The typings only describe the elements.

Property types come straight from the element classes. Attribute values are typed as the matching property type. Events use each framework's convention:

| Framework | Event handler | Notes |
|---|---|---|
| React | `onvoid-change={(e) => e.detail.value}` | Needs **React 19** and `@types/react` 19. React 18 does not set properties or attach custom-event handlers on custom elements, so under `@types/react` 18 every `<void-*>` tag reports the missing requirement. Use `@voidable/ui-react` with React 18. `class` is accepted alongside `className`. |
| Solid | `on:void-change={(e) => …}` | `prop:`, `attr:` and `bool:` prefixes are typed per element. |
| Svelte 5 | `onvoid-change={(e) => …}` | |
| Vue | `@void-change="…"` in templates, `onVoidChange` in render functions | `slot` is accepted. |

These frameworks are optional peer dependencies of `@voidable/ui` (`@types/react >=19`, `solid-js >=1.8`, `svelte >=5`, `vue >=3.5`). Install only the one you use.

## VS Code

VS Code does not read custom data from dependencies on its own. Add this to the workspace `.vscode/settings.json`:

```json
{
  "html.customData": ["./node_modules/@voidable/ui/dist/vscode.html-custom-data.json"]
}
```

## Component counts on the docs site

```ts
import summary from '@voidable/ui/components.json' with { type: 'json' };

summary.componentCount; // component modules
summary.tagCount;       // registered custom element tags
```

This import resolves only after `mise run build`, because `dist/` is not committed.

## What the manifest does not know

Component source has no `@slot`, `@cssprop` or `@fires` JSDoc yet. As a result, the manifest lists no slots or projected children and no CSS custom properties, and it has no event descriptions. Event `detail` types are inferred from the dispatch code. Facts the analyzer cannot see live in `cem/supplement.js`: attributes a parent reads from its children, events that bubble from child tags to a parent of the same family, and detail types inference cannot resolve. `cem/plugins.js` merges them into the manifest.
