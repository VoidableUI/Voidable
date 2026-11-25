# @voidable/ui-svelte

Svelte utilities for Voidable UI web components.

## Install

```bash
npm install @voidable/ui-svelte @voidable/ui @voidable/theme svelte
```

## Usage

```svelte
<script>
  import '@voidable/ui';
  import '@voidable/theme';
  import { theme } from '@voidable/ui-svelte';

  // $theme is 'dark' | 'light' (readable store)
</script>

<void-button variant="filled" color="success">Click me</void-button>
<p>Current theme: {$theme}</p>
```

Svelte handles `<void-*>` custom elements natively in templates.

## Documentation

- [Docs](https://voidable.dev/frameworks/svelte/)
- [Storybook](https://voidable.dev/storybook/)
- [GitHub](https://github.com/VoidableUI/Voidable)
- [npm](https://www.npmjs.com/package/@voidable/ui-svelte)

## License

MIT
