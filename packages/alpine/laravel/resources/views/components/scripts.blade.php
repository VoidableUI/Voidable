<script type="module">
import '@voidable/ui';
@if(config('voidable.alpine_plugin'))
import { VoidableAlpine, registerLivewireHooks } from '@voidable/ui-alpine';

document.addEventListener('alpine:init', () => {
    Alpine.plugin(VoidableAlpine);
});

@if(config('voidable.livewire_morph_protection'))
registerLivewireHooks();
@endif
@endif
</script>
