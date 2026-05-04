<?php

return [
    // Path to the compiled Voidable UI script (relative to public/)
    'script_path' => 'build/assets/voidable-ui.js',

    // Path to the compiled theme CSS (relative to public/)
    // Set to null to disable — useful when providing your own theme
    'theme_path' => 'build/assets/voidable-theme.css',

    // Alpine plugin auto-registration
    // When true, @voidableScripts will include the Alpine plugin initialization
    'alpine_plugin' => true,

    // Livewire morph protection
    // When true, registers Livewire hooks to preserve Voidable element state
    'livewire_morph_protection' => true,
];
