# @voidable/ui-react

React wrappers for Voidable UI web components.

## Install

```bash
npm install @voidable/ui-react @voidable/ui @voidable/theme react
```

## Usage

```tsx
import { Button, Input, Dialog, useTheme } from '@voidable/ui-react';
import '@voidable/theme';

function App() {
  const theme = useTheme(); // 'dark' | 'light'

  return (
    <div>
      <Button variant="filled" color="primary" onVoidClick={() => {}}>
        Click me
      </Button>
      <Input label="Name" />
      <Dialog open heading="Confirm">Are you sure?</Dialog>
    </div>
  );
}
```

All Voidable components are available as React components with proper typing and ref forwarding.

## Documentation

- [Storybook](https://voidableui.github.io/Voidable/)
- [GitHub](https://github.com/VoidableUI/Voidable)

## License

MIT
