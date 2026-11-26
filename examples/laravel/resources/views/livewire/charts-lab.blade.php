<div style="display: grid; gap: 1.5rem; max-width: 900px">
    <h1>Charts lab</h1>

    <section style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap">
        <span id="version">Server version {{ $v }}</span>
        <button id="bump" type="button" wire:click="bump">Bump</button>
        <button id="grow" type="button" wire:click="grow">Grow</button>
    </section>

    <x-voidable::bar-chart id="bars" aria-label="Revenue by quarter"
        :data="['labels' => ['Q1', 'Q2', 'Q3'], 'series' => [['name' => 'Revenue', 'values' => [4 * $scale, 8 * $scale, 6 * $scale]]]]" />
    <x-voidable::line-chart id="line" aria-label="Visitors per day"
        :data="['labels' => ['Mon', 'Tue', 'Wed', 'Thu'], 'series' => [['name' => 'Visitors', 'values' => [3 * $scale, 5 * $scale, 4 * $scale, 7 * $scale]]]]" />
    <x-voidable::donut-chart id="donut" show-total aria-label="Traffic by source"
        :data="['segments' => [['name' => 'Search', 'value' => 40 * $scale], ['name' => 'Direct', 'value' => 25 * $scale], ['name' => 'Social', 'value' => 15 * $scale]]]" />
    <x-voidable::gauge id="gauge" :value="20 * $scale" unit="%" aria-label="Disk usage"
        :zones="[['from' => 0, 'to' => 100, 'color' => 'success']]" />
    <x-voidable::gauge id="gauge-segments" show-table aria-label="Memory"
        :data="['segments' => [['name' => 'Used', 'value' => 30 * $scale], ['name' => 'Cache', 'value' => 20 * $scale]]]" />
</div>
