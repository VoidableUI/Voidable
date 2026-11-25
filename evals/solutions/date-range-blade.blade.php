<div>
    <form method="GET" action="/reports" style="display: flex; flex-wrap: wrap; gap: var(--void-space-4); align-items: end; padding: var(--void-space-4);">
        <void-field label="Start date">
            <void-date-picker name="start_date" value="{{ $start_date }}" max="{{ $end_date }}" wire:model="start_date"></void-date-picker>
        </void-field>
        <void-field label="End date">
            <void-date-picker name="end_date" value="{{ $end_date }}" min="{{ $start_date }}" wire:model="end_date"></void-date-picker>
        </void-field>
        <void-button type="submit" variant="filled">Apply</void-button>
    </form>
</div>
