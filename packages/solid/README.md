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
    <void-button variant="filled" color="primary">
      Click me
    </void-button>
  );
}
```

SolidJS handles `<void-*>` custom elements natively in JSX.

## Documentation

- [Storybook](https://voidableui.github.io/Voidable/)
- [GitHub](https://github.com/VoidableUI/Voidable)

## License

MIT
