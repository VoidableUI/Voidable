<form method="POST">
    @csrf
    <void-select x-void-on.void-change="$wire.set('plan', $event.detail.value)" size="huge" {{ $attributes }}>
        <option value="a">A</option>
    </void-select>
    <void-dialog closable="false" @if($open) open @endif><void-dialog-title>{{ $title }}</void-dialog-title></void-dialog>
    <void-buton>Typo</void-buton>
</form>
