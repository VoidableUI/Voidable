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

To load each component only when its tag first appears (including tags that
arrive in Turbo visits, streams and frames), import `@voidable/ui/autoloader`
instead of `@voidable/ui`; see
[Loading components](https://voidable.dev/getting-started/loading/).

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

## Documentation

- [Storybook](https://voidableui.github.io/Voidable/)
- [GitHub](https://github.com/VoidableUI/Voidable)
