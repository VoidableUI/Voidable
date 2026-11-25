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

`VoidTurbo` calls each component's pre-morph hook during Turbo morphs: the
state of every reflected property (`open`, `checked`, `pressed`, `collapsed`,
`value`, ...) and the component's own `role` / `tabindex` / `aria-*` survive
while the server keeps rendering the same value, and the server wins as soon
as it renders a different one. The rule lives in `@voidable/ui` and is the
same for the Livewire and LiveView adapters.

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
