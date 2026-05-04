import { VoidableAlpine, registerLivewireHooks } from '@voidable/ui-alpine';
import '@voidable/ui';
import '@voidable/theme';

document.addEventListener('alpine:init', () => {
    window.Alpine.plugin(VoidableAlpine);
});

registerLivewireHooks();
