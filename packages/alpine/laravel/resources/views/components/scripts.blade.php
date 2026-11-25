<script>
window.voidableConfig = @json([
    'alpinePlugin' => (bool) config('voidable.alpine_plugin'),
    'livewireMorphProtection' => (bool) config('voidable.livewire_morph_protection'),
]);
</script>
@if(config('voidable.dev_warnings') && config('voidable.dev_script'))
@if(config('voidable.dev_warnings') === 'throw')
<script>window.VOIDABLE_DEV = { throw: true };</script>
@endif
<script type="module" src="{{ config('voidable.dev_script') }}"></script>
@endif
@if(config('voidable.script_path'))
<script type="module" src="{{ asset(config('voidable.script_path')) }}"></script>
@endif
