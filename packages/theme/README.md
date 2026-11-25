# @voidable/theme

CSS theme for Voidable UI — design tokens, primitives, reset, and component styles.

## Install

```bash
npm install @voidable/theme
```

## Usage

Import the full theme (includes primitives, tokens, reset, and all component styles):

```css
@import '@voidable/theme';
```

Or import individual layers:

```css
@import '@voidable/theme/primitives';
@import '@voidable/theme/tokens';
@import '@voidable/theme/reset';
```

Without a bundler, link the stylesheet directly (the entry point pulls in the other files with relative `@import`s):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@voidable/theme/src/index.css" />
```

In a JavaScript entry point processed by a bundler (for example Vite), `import '@voidable/theme';` also works.

## Dark mode

Dark is the default (true black surfaces). Set the `data-theme` attribute on `<html>` to choose a theme explicitly:

```html
<html data-theme="light">
```

## Documentation

- [Docs](https://voidable.dev)
- [Storybook](https://voidable.dev/storybook/)
- [GitHub](https://github.com/VoidableUI/Voidable)
- [npm](https://www.npmjs.com/package/@voidable/theme)

## License

MIT
