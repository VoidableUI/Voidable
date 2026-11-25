import { VoidableAlpine, registerLivewireHooks } from '@voidable/ui-alpine';
import '@voidable/ui';
import '@voidable/theme';

document.addEventListener('alpine:init', () => {
    window.Alpine.plugin(VoidableAlpine);
});

// Livewire is not on window yet when this module runs; wait for its init event.
document.addEventListener('livewire:init', registerLivewireHooks);
