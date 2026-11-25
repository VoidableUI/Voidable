# @voidable/ui-react

React wrappers for [Voidable UI](https://voidable.dev) web components.

## Install

```bash
npm install @voidable/ui-react @voidable/ui @voidable/theme react
```

Supports React 18 and 19.

## Usage

Components ship without any styling. Load the theme once at your app entry:

```tsx
import '@voidable/theme';
```

```tsx
import { Button, Input, Dialog, TagsInput, useTheme } from '@voidable/ui-react';
import '@voidable/theme';

function App() {
  const theme = useTheme(); // 'dark' | 'light' (dark is the default)

  return (
    <div>
      <Button variant="filled" color="error" onVoidClick={() => {}}>
        Click me
      </Button>
      <Input placeholder="Name" onVoidChange={(e) => console.log(e.detail.value)} />
      <TagsInput value={['a', 'b']} onVoidChange={(e) => console.log(e.detail.value)} />
      <Dialog open heading="Confirm">Are you sure?</Dialog>
    </div>
  );
}
```

Valid `color` values are `default`, `error`, `warning`, `success`, `info` and `notice` (not every component supports every value; see the component docs).

All Voidable components are available as React components with ref forwarding. Charts (`BarChart`, `LineChart`, `DonutChart`, `Gauge`) take their data through the `data` prop.

### Element registration

Importing `@voidable/ui-react` also imports `@voidable/ui`, which defines the `<void-*>` custom elements, so you do not need to import the core package yourself. All elements are registered, not only the ones you render.

### Props

- Booleans, arrays and objects are set as element properties, so `disabled={false}` really is false and `TagsInput` `value` stays an array. This is the same on React 18 and 19. It also means booleans that default to true can be turned off: `<Toast dismissable={false}>`, `<NavBar bordered={false}>`.
- Native input attributes (`autocomplete`, `minlength`, `maxlength`, `pattern`, `inputMode`, `enterKeyHint`, `autocapitalize`, `spellcheck`) are typed on `Input`, `Textarea` and `ActionInput`.
- `className` is mapped to `class`.
- Other attributes such as `aria-*` and `data-*` are passed through.

### Events

Custom events are exposed as typed `onVoid*` props: `void-change` becomes `onVoidChange`, `void-click` becomes `onVoidClick`, and so on. `event.detail` is typed per component, for example `Switch` `onVoidChange` receives `CustomEvent<{ checked: boolean }>`.

Overlays (`Dialog`, `Drawer`, `Popover`, `DropdownMenu`, `Tooltip`, `HoverCard`, `Combobox`, `Multiselect`, `DatePicker`) take a controlled `open` and fire `onVoidOpen` / `onVoidClose` with `{ reason }` (`OverlayOpenReason`, `OverlayCloseReason`). Set your state to false in `onVoidClose`, or call `event.preventDefault()` there to keep a user-closed overlay open.

### Triggers

`DropdownMenu`, `Popover` and `HoverCard` need to know which child is the trigger. Give it `slot="trigger"`; every other child is the menu, popover or card content. Without the slot the first child element is used, which goes wrong as soon as React re-keys or swaps that child.

```tsx
<DropdownMenu>
  <Button slot="trigger">Actions</Button>
  <DropdownMenuItem onVoidSelect={edit}>Edit</DropdownMenuItem>
</DropdownMenu>
```

### Forms

Form controls take `name`, `value`, `required` and `disabled` and take part in a surrounding `<form>` (submission, `form.reset()`, `<fieldset disabled>`), whether they render a native control or are form-associated custom elements.

### Next.js

The package starts with `"use client"`, so the components can be imported from App Router server components. They render on the server as plain custom elements and upgrade on the client.

### Theme

`useTheme()` returns the current value of `<html data-theme>`. It is `'dark'` when the attribute is unset and during server rendering.

## Documentation

- [Documentation](https://voidable.dev)
- [Storybook](https://voidable.dev/storybook/)
- [GitHub](https://github.com/VoidableUI/Voidable)

## License

MIT
