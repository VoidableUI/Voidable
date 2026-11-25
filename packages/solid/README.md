# @voidable/ui-solid

SolidJS utilities for Voidable UI web components.

## Install

```bash
npm install @voidable/ui-solid @voidable/ui @voidable/theme solid-js
```

## Usage

```tsx
import '@voidable/ui';
import '@voidable/theme';
import { useTheme } from '@voidable/ui-solid';

function App() {
  const theme = useTheme(); // signal: 'dark' | 'light'

  return (
    <void-button variant="filled" color="success">
      Click me
    </void-button>
  );
}
```

SolidJS handles `<void-*>` custom elements natively in JSX.

## Documentation

- [Docs](https://voidable.dev/frameworks/solid/)
- [Storybook](https://voidable.dev/storybook/)
- [GitHub](https://github.com/VoidableUI/Voidable)
- [npm](https://www.npmjs.com/package/@voidable/ui-solid)

## License

MIT
