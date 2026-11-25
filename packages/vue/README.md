# @voidable/ui-vue

Vue composables for Voidable UI web components.

## Install

```bash
npm install @voidable/ui-vue @voidable/ui @voidable/theme vue
```

## Setup

Configure Vue to recognize custom elements:

```ts
// vite.config.ts
export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith('void-'),
        },
      },
    }),
  ],
});
```

## Usage

```vue
<script setup>
import '@voidable/ui';
import '@voidable/theme';
import { useTheme } from '@voidable/ui-vue';

const theme = useTheme(); // readonly ref: 'dark' | 'light'
</script>

<template>
  <void-button variant="filled" color="success">Click me</void-button>
</template>
```

## Documentation

- [Docs](https://voidable.dev/frameworks/vue/)
- [Storybook](https://voidable.dev/storybook/)
- [GitHub](https://github.com/VoidableUI/Voidable)
- [npm](https://www.npmjs.com/package/@voidable/ui-vue)

## License

MIT
