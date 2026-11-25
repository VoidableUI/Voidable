# @voidable/ui-hotwire

Hotwire (Turbo + Stimulus) adapter for [Voidable UI](https://github.com/VoidableUI/Voidable) web components.

## Install

```bash
npm install @voidable/ui @voidable/theme @voidable/ui-hotwire
```

## Setup

```js
import { Application } from '@hotwired/stimulus';
import { VoidTurbo } from '@voidable/ui-hotwire';

Application.start();
VoidTurbo.start(); // returns a function that detaches the listeners
```

`VoidTurbo` keeps client-managed state (`open`, `checked`, `selected`, `aria-*`)
across Turbo morphs while the server keeps rendering the same value, and lets
the server win as soon as it renders a different one.

## Usage

Stimulus handles custom events natively, so wire Voidable events straight to
your controllers with `data-action`:

```erb
<void-button data-action="void-click->form#submit">Save</void-button>

<void-select data-action="void-change->filter#update">
  <option value="a">Option A</option>
  <option value="b">Option B</option>
</void-select>
```

### `VoidEventController` (deprecated)

`VoidEventController` is kept as a no-op for backwards compatibility and can be
removed from your setup (`application.register('void-event', ...)`). The old
version re-dispatched events with an empty prefix, which fired the same event on
the same element again and recursed until the stack overflowed.

## Documentation

- [Storybook](https://voidableui.github.io/Voidable/)
- [GitHub](https://github.com/VoidableUI/Voidable)
