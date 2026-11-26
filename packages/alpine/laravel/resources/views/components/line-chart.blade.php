{{-- A <void-line-chart> drawn from server data: `data` (an array or a JSON string) becomes the JSON `data` attribute, so the first response already draws it. Every other attribute passes through as written (show-value, show-table, aria-label...). --}}
@props(['data' => null])
<void-line-chart {{ $attributes }}@if (! is_null($data)) data="{{ is_string($data) ? $data : json_encode($data) }}"@endif></void-line-chart>
