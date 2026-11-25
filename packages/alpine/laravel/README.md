# Voidable Laravel

Laravel integration for [Voidable UI](https://voidable.dev) web components with Livewire + Alpine.js.

## Installation

```bash
composer require voidable/laravel
```

The service provider is auto-discovered. No manual registration needed.

## Publish Configuration

```bash
php artisan vendor:publish --tag=voidable-config
```

This publishes `config/voidable.php` where you can customize asset paths and feature flags.

## Blade Directives

### @voidableScripts

Add to your layout's `<head>` or before `</body>`:

```blade
<!DOCTYPE html>
<html>
<head>
    @voidableStyles
</head>
<body>
    {{ $slot }}

    @voidableScripts
</body>
</html>
```

This emits two things:
- an inline `window.voidableConfig = { alpinePlugin, livewireMorphProtection }`
  object built from your config, and
- `<script type="module" src="...">` pointing at `config('voidable.script_path')`
  (nothing is emitted when `script_path` is `null`).

A browser cannot resolve bare specifiers such as `@voidable/ui` from an inline
module without an import map, so the directive never inlines imports. Your
JavaScript bundle is responsible for importing the components.

#### Vite route (recommended)

Set `'script_path' => null` in `config/voidable.php`, load your entry with
`@vite`, and register everything there:

```js
// resources/js/app.js
import '@voidable/ui';
import { VoidableAlpine, registerLivewireHooks } from '@voidable/ui-alpine';

const cfg = window.voidableConfig ?? { alpinePlugin: true, livewireMorphProtection: true };

document.addEventListener('alpine:init', () => {
    if (cfg.alpinePlugin) window.Alpine.plugin(VoidableAlpine);
});
if (cfg.livewireMorphProtection) {
    document.addEventListener('livewire:init', registerLivewireHooks);
}
```

```blade
@voidableScripts
@vite(['resources/js/app.js'])
```

If you pre-build a standalone bundle instead, set `script_path` to its location
under `public/`.

### @voidableStyles

Outputs a `<link>` tag pointing to `config('voidable.theme_path')`. Nothing is
emitted when `theme_path` is `null`.

## Usage with Livewire

Voidable components work seamlessly with Livewire. The morph-protection hooks (enabled by default) ensure custom element state is preserved during Livewire DOM patches.

```blade
<div>
    <void-button
        x-on:void-click="$wire.submit()"
    >
        Submit
    </void-button>

    <void-dialog
        x-data="{ open: @entangle('showDialog') }"
        x-bind:open="open"
    >
        <p>Are you sure?</p>
        <void-button x-on:void-click="$wire.confirm()">Confirm</void-button>
        <void-button x-on:void-click="open = false" variant="ghost">Cancel</void-button>
    </void-dialog>
</div>
```

## Usage with Plain Blade + Alpine

Without Livewire, use Alpine.js directly for client-side interactivity:

```blade
<div x-data="{ count: 0 }">
    <void-button x-on:void-click="count++">
        Clicked <span x-text="count"></span> times
    </void-button>
</div>
```

### Tabs

```blade
<void-tabs x-data="{ active: 'overview' }" x-on:void-change="active = $event.detail.value">
    <void-tab value="overview" x-bind:selected="active === 'overview'">Overview</void-tab>
    <void-tab value="settings" x-bind:selected="active === 'settings'">Settings</void-tab>
</void-tabs>

<div x-show="active === 'overview'">Overview content</div>
<div x-show="active === 'settings'">Settings content</div>
```

### Form Controls

```blade
<form x-data="{ name: '', email: '' }" x-on:submit.prevent="$wire.save()">
    <void-input
        placeholder="Name"
        x-model="name"
    ></void-input>

    <void-input
        placeholder="Email"
        type="email"
        x-model="email"
    ></void-input>

    <void-button type="submit">Save</void-button>
</form>
```

## Helper Function

The `void_attrs` helper generates Alpine.js attributes for wiring Voidable events:

```blade
<void-button {!! \Voidable\Laravel\void_attrs('void-click', 'handlePress()') !!}>
    Click me
</void-button>
```

## Configuration

| Key | Default | Description |
|-----|---------|-------------|
| `script_path` | `build/assets/voidable-ui.js` | Compiled UI script emitted as a module `<script src>` (null to disable, e.g. with Vite) |
| `theme_path` | `build/assets/voidable-theme.css` | Path to compiled theme CSS (null to disable) |
| `alpine_plugin` | `true` | Exposed as `window.voidableConfig.alpinePlugin` for your bundle |
| `livewire_morph_protection` | `true` | Exposed as `window.voidableConfig.livewireMorphProtection` for your bundle |

## Requirements

- PHP >= 8.1
- Laravel >= 10.0
- `@voidable/ui` and `@voidable/ui-alpine` npm packages installed in your frontend build
