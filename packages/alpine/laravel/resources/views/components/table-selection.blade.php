{{-- The <void-table-selection> part of an <x-voidable::table>: shown while anything is selected, it holds the bulk actions and a data-count element. Write it with `hidden`. Attributes pass through as written. --}}
<void-table-selection {{ $attributes }}>{{ $slot }}</void-table-selection>
