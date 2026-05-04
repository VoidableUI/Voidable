<div x-data="{ count: 0 }">
    <h1 class="text-2xl font-bold mb-8">Voidable + Livewire + Alpine Showcase</h1>

    {{-- 1. void-button with Alpine click counter --}}
    <section class="mb-8">
        <h2 class="text-lg font-semibold mb-2">Button with Alpine counter</h2>
        <void-button x-void-on:void-click="count++">
            Clicked: <span x-text="count"></span> times
        </void-button>
    </section>

    {{-- 2. void-input bound to Livewire via wire:model --}}
    <section class="mb-8">
        <h2 class="text-lg font-semibold mb-2">Input with wire:model</h2>
        <void-input
            x-void-on:void-change="$wire.set('name', $event.detail.value)"
            wire:model="name"
            placeholder="Type your name..."
        ></void-input>
        <p class="mt-2 text-sm text-gray-400">Livewire value: <span class="text-white">{{ $name }}</span></p>
    </section>

    {{-- 3. void-switch with morph protection --}}
    <section class="mb-8">
        <h2 class="text-lg font-semibold mb-2">Switch with morph protection</h2>
        <void-switch x-void-preserve label="Dark mode"></void-switch>
        <p class="mt-2 text-sm text-gray-400">This switch preserves state during Livewire re-renders.</p>
    </section>

    {{-- 4. void-select with event handling --}}
    <section class="mb-8">
        <h2 class="text-lg font-semibold mb-2">Select with event handling</h2>
        <void-select
            x-void-on:void-change="$wire.set('selectedOption', $event.detail.value)"
            placeholder="Choose a framework..."
        >
            <void-option value="laravel">Laravel</void-option>
            <void-option value="livewire">Livewire</void-option>
            <void-option value="alpine">Alpine.js</void-option>
        </void-select>
        <p class="mt-2 text-sm text-gray-400">Selected: <span class="text-white">{{ $selectedOption }}</span></p>
    </section>
</div>
