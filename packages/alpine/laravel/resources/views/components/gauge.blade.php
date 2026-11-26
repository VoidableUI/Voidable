{{-- A <void-gauge> drawn from server data: `data` (segments) and `zones` (colour bands), each an array or a JSON string, become the JSON `data` and `zones` attributes, so the first response already draws them. A single reading is the plain value, min, max and unit attributes. Every other attribute passes through as written. --}}
@props(['data' => null, 'zones' => null])
<void-gauge {{ $attributes }}@if (! is_null($data)) data="{{ is_string($data) ? $data : json_encode($data) }}"@endif @if (! is_null($zones)) zones="{{ is_string($zones) ? $zones : json_encode($zones) }}"@endif></void-gauge>
