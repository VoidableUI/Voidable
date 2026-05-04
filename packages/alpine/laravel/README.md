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

This outputs a `<script type="module">` block that:
- Imports `@voidable/ui` (registers all void-* custom elements)
- Imports and initializes the Alpine.js plugin from `@voidable/ui-alpine`
- Registers Livewire morph-protection hooks (if enabled)

### @voidableStyles

Outputs a `<link>` tag pointing to your compiled Voidable theme CSS.

## Usage with Livewire

Voidable components work seamlessly with Livewire. The morph-protection hooks (enabled by default) ensure custom element state is preserved during Livewire DOM patches.

```blade
<div>
    <void-button
        x-on:void-press="$wire.submit()"
    >
        Submit
    </void-button>

    <void-dialog
        x-data="{ open: @entangle('showDialog') }"
        x-bind:open="open"
    >
        <p>Are you sure?</p>
        <void-button x-on:void-press="$wire.confirm()">Confirm</void-button>
        <void-button x-on:void-press="open = false" variant="ghost">Cancel</void-button>
    </void-dialog>
</div>
```

## Usage with Plain Blade + Alpine

Without Livewire, use Alpine.js directly for client-side interactivity:

```blade
<div x-data="{ count: 0 }">
    <void-button x-on:void-press="count++">
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
        label="Name"
        x-model="name"
    ></void-input>

    <void-input
        label="Email"
        type="email"
        x-model="email"
    ></void-input>

    <void-button type="submit">Save</void-button>
</form>
```

## Helper Function

The `void_attrs` helper generates Alpine.js attributes for wiring Voidable events:

```blade
<void-button {!! \Voidable\Laravel\void_attrs('void-press', 'handlePress()') !!}>
    Click me
</void-button>
```

## Configuration

| Key | Default | Description |
|-----|---------|-------------|
| `script_path` | `build/assets/voidable-ui.js` | Path to compiled Voidable UI script |
| `theme_path` | `build/assets/voidable-theme.css` | Path to compiled theme CSS (null to disable) |
| `alpine_plugin` | `true` | Auto-register Alpine plugin in @voidableScripts |
| `livewire_morph_protection` | `true` | Register Livewire hooks for element state |

## Requirements

- PHP >= 8.1
- Laravel >= 10.0
- `@voidable/ui` and `@voidable/ui-alpine` npm packages installed in your frontend build
