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

## Usage

### Event bridging with `x-void-on`

Listen for Voidable custom events and evaluate Alpine expressions:

```html
<div x-data="{ name: '' }">
  <void-input
    x-void-on:void-change="name = $event.detail.value"
    label="Name"
  ></void-input>

  <p x-text="name"></p>
</div>
```

### Morph protection with `x-void-preserve`

Prevent Livewire from clobbering internal state of Voidable components:

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
  <void-input x-ref="search" label="Search"></void-input>
  <button @click="$voidable($refs.search, 'void-clear')">Clear</button>
</div>
```

## Blade example

```blade
<div x-data="{ selected: @entangle('selected') }">
  <void-select
    x-void-on:void-select="selected = $event.detail.value"
    x-void-preserve
  >
    @foreach($options as $option)
      <option value="{{ $option->id }}">{{ $option->name }}</option>
    @endforeach
  </void-select>
</div>
```
