{{-- The <void-table-select-all> part of an <x-voidable::table>: its button selects every row across the server's pages (set total-rows on the table). Write it with `hidden`. Attributes pass through as written. --}}
<void-table-select-all {{ $attributes }}>{{ $slot }}</void-table-select-all>
