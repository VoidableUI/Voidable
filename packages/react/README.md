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
  const theme = useTheme(); // 'dark' | 'light': the scheme the page is in

  return (
    <div>
      <Button variant="filled" color="error" onVoidClick={() => {}}>
        Click me
      </Button>
      <Input placeholder="Name" onVoidChange={(e) => console.log(e.detail.value)} />
      <TagsInput value={['a', 'b']} onVoidChange={(e) => console.log(e.detail.value)} />
      <Dialog open><DialogTitle>Confirm</DialogTitle><DialogBody>Are you sure?</DialogBody></Dialog>
    </div>
  );
}
```

Valid `color` values are `default`, `error`, `warning`, `success`, `info` and `notice` (not every component supports every value; see the component docs).

All Voidable components are available as React components with ref forwarding. Charts (`BarChart`, `LineChart`, `DonutChart`, `Gauge`) take their data through the `data` prop.

### Element registration

Importing `@voidable/ui-react` also imports `@voidable/ui`, which defines the `<void-*>` custom elements, so you do not need to import the core package yourself. All elements are registered, not only the ones you render.

### Props

- Booleans, arrays and objects are set as element properties, so `disabled={false}` really is false and `TagsInput` `value` stays an array. This is the same on React 18 and 19. It also means booleans that default to true can be turned off: `<NavBar hideBorder>`.
- Native input attributes (`autocomplete`, `minlength`, `maxlength`, `pattern`, `inputMode`, `enterKeyHint`, `autocapitalize`, `spellcheck`) are typed on `Input`, `Textarea` and `ActionInput`.
- `className` is mapped to `class`.
- Other attributes such as `aria-*` and `data-*` are passed through.

### Events

Custom events are exposed as typed `onVoid*` props: `void-change` becomes `onVoidChange`, `void-click` becomes `onVoidClick`, and so on. `event.detail` is typed per component, for example `Switch` `onVoidChange` receives `CustomEvent<{ checked: boolean }>`.

Overlays (`Dialog`, `Drawer`, `Popover`, `DropdownMenu`, `Tooltip`, `HoverCard`, `Combobox`, `Multiselect`, `DatePicker`) take a controlled `open` and fire `onVoidOpen` / `onVoidClose` with `{ reason }` (`OverlayOpenReason`, `OverlayCloseReason`). Set your state to false in `onVoidClose`, or call `event.preventDefault()` there to keep a user-closed overlay open.

### Parts

Components with regions take explicit parts, exported next to them: `DialogTitle`, `DialogBody`, `DialogActions`, `PopoverTrigger`, `PopoverContent`, `DropdownMenuTrigger`, `DropdownMenuContent`, `TabsList`, `TabsTrigger`, `TabsContent`, `CardHeader`, `CardBody` and so on (generated from the manifest; each renders the matching `void-*` tag). A trigger part wraps exactly one element, the button or link that opens the overlay. React can re-key, reorder or conditionally render the parts freely: the component finds them where they are and never moves them.

```tsx
<DropdownMenu>
  <DropdownMenuTrigger><Button>Actions</Button></DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onVoidSelect={edit}>Edit</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

Pickers take their options in a content part: `<Combobox name="country"><ComboboxContent><Option value="de">Germany</Option></ComboboxContent></Combobox>`, and the same with `Multiselect` and `MultiselectContent`.

### Forms

Form controls take `name`, `value`, `required` and `disabled` and take part in a surrounding `<form>` (submission, `form.reset()`, `<fieldset disabled>`), whether they render a native control or are form-associated custom elements. `Select` is the exception: it wraps a native `<select>` you write inside it, and the form attributes go on that select (`<Select><select name="plan" required>...</select></Select>`).

### Next.js

The package starts with `"use client"`, so the components can be imported from App Router server components. They render on the server as plain custom elements and upgrade on the client.

### Theme

`useTheme()` returns the colour scheme in force, `'dark'` or `'light'`: what the page shows, not just the attribute. With `<html data-theme>` unset or `"system"` it reports what the theme resolves, so a theme or skin that prefers a scheme (Loft prefers light) is counted, and otherwise the operating system's `prefers-color-scheme`. It updates when the attribute or the operating system preference changes. During server rendering, and on the first render of a hydrating tree, it is `'dark'` (the server cannot know the visitor's preference); React then re-renders with the real value, with no hydration warning. It is read-only: set `data-theme` on `<html>` to change the scheme.

## Documentation

- [Documentation](https://voidable.dev)
- [Storybook](https://voidable.dev/storybook/)
- [GitHub](https://github.com/VoidableUI/Voidable)

## License

MIT
