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

    // Livewire morph protection
    // Exposed to your bundle as window.voidableConfig.livewireMorphProtection
    'livewire_morph_protection' => true,
];
