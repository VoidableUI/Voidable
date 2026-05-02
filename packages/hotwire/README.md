# @voidable/ui-hotwire

Hotwire (Turbo + Stimulus) adapter for [Voidable UI](https://github.com/VoidableUI/Voidable) web components.

## Install

```bash
npm install @voidable/ui @voidable/theme @voidable/ui-hotwire
```

## Setup

```js
import { Application } from '@hotwired/stimulus';
import { VoidEventController, VoidTurbo } from '@voidable/ui-hotwire';

const application = Application.start();
application.register('void-event', VoidEventController);
VoidTurbo.start();
```

## Usage

```erb
<void-button
  data-controller="void-event"
  data-void-event-events-value="void-click"
  data-action="void-click->form#submit"
>
  Save
</void-button>

<void-select
  data-controller="void-event"
  data-void-event-events-value="void-change"
  data-action="void-change->filter#update"
>
  <option value="a">Option A</option>
  <option value="b">Option B</option>
</void-select>
```

## Documentation

- [Storybook](https://voidableui.github.io/Voidable/)
- [GitHub](https://github.com/VoidableUI/Voidable)
