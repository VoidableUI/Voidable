<script>
window.voidableConfig = @json([
    'alpinePlugin' => (bool) config('voidable.alpine_plugin'),
    'livewireMorphProtection' => (bool) config('voidable.livewire_morph_protection'),
]);
</script>
@if(config('voidable.script_path'))
<script type="module" src="{{ asset(config('voidable.script_path')) }}"></script>
@endif
