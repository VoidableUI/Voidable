<?php

namespace App\Livewire;

use Livewire\Component;

/**
 * The four charts drawn from server data with the package's Blade components (see
 * tests/browser/server/laravel/charts.spec.ts): the data is the JSON `data` attribute of each element, so
 * the first response already draws them. A Livewire update with unchanged data leaves the charts alone,
 * changed data redraws them.
 */
class ChartsLab extends Component
{
    public int $v = 1;

    public int $scale = 1;

    public function bump(): void
    {
        $this->v++;
    }

    public function grow(): void
    {
        $this->scale = 2;
    }

    public function render()
    {
        return view('livewire.charts-lab');
    }
}
