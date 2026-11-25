# @voidable/ui-alpine

Alpine.js integration for Voidable web components. Bridges Voidable custom events into the Alpine reactivity system and protects component state during Livewire morphs.

## Installation

```bash
npm install @voidable/ui-alpine
```

## Setup

### With Alpine.js

```js
import Alpine from 'alpinejs';
import { VoidableAlpine } from '@voidable/ui-alpine';

Alpine.plugin(VoidableAlpine);
Alpine.start();
```

### With Livewire

```js
import { registerLivewireHooks } from '@voidable/ui-alpine';

registerLivewireHooks();
```

The hook calls each component's pre-morph hook during Livewire morphs: client
state of every reflected property (`open`, `checked`, `pressed`, `collapsed`,
`value`, ...) survives while the server keeps rendering the same value, and
the server wins as soon as it renders a different one.

## Usage

### Event bridging with `x-void-on`

Listen for Voidable custom events and evaluate Alpine expressions:

```html
<div x-data="{ name: '' }">
  <void-input
    x-void-on:void-change="name = $event.detail.value"
    placeholder="Name"
  ></void-input>

  <p x-text="name"></p>
</div>
```

### Morph protection with `x-void-preserve`

Prevent Livewire from morphing a Voidable component at all. The directive adds
`wire:ignore`, which makes Livewire skip the element and its children. This
matters because Voidable components move their children into Lit-rendered
wrappers that a server morph would otherwise strip. (`wire:ignore.self` would
protect only the element's own attributes and still morph its children.)
Server-side attribute changes to a preserved element are ignored too, so use it
for elements the client fully owns:

```html
<void-select x-void-preserve wire:model="status">
  <option value="active">Active</option>
  <option value="inactive">Inactive</option>
</void-select>
```

### Dispatching events with `$voidable`

Dispatch a custom event to a Voidable component from an Alpine expression:

```html
<div x-data>
  <void-input x-ref="search" placeholder="Search"></void-input>
  <button @click="$voidable($refs.search, 'void-clear')">Clear</button>
</div>
```

## Blade example

```blade
<div x-data="{ selected: @entangle('selected') }">
  <void-select
    x-void-on:void-change="selected = $event.detail.value"
    x-void-preserve
  >
    @foreach($options as $option)
      <option value="{{ $option->id }}">{{ $option->name }}</option>
    @endforeach
  </void-select>
</div>
```
