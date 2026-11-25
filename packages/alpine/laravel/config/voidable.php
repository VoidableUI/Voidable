<?php

return [
    // Path to the compiled Voidable UI script (relative to public/). It is
    // emitted as <script type="module" src="..."> by @voidableScripts.
    // Set to null when you load your JS through Vite (@vite) instead.
    'script_path' => 'build/assets/voidable-ui.js',

    // Path to the compiled theme CSS (relative to public/)
    // Set to null to disable — useful when providing your own theme
    'theme_path' => 'build/assets/voidable-theme.css',

    // Alpine plugin auto-registration
    // Exposed to your bundle as window.voidableConfig.alpinePlugin (see README)
    'alpine_plugin' => true,

    // Development warnings (@voidable/ui/dev): misused <void-*> markup (an attribute
    // a component does not have, a value outside its set, a child in the wrong
    // parent) is logged to the browser console. @voidableScripts emits the script
    // when this is truthy. Defaults to on for the `local` environment only, so a
    // production page never loads it. Set VOIDABLE_DEV_WARNINGS=false to turn it
    // off, or 'throw' to turn warnings into thrown errors for browser tests.
    'dev_warnings' => env('VOIDABLE_DEV_WARNINGS', env('APP_ENV', 'production') === 'local'),

    // Where the development warnings script comes from: a self-contained file with
    // no imports. Point it at a pinned CDN version or your own copy (the
    // @voidable/ui package ships it as dist/dev.js).
    'dev_script' => 'https://cdn.jsdelivr.net/npm/@voidable/ui@latest/dist/dev.js',

    // Livewire morph protection
    // Exposed to your bundle as window.voidableConfig.livewireMorphProtection
    'livewire_morph_protection' => true,
];
