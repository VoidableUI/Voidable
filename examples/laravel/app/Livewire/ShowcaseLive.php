<?php

namespace App\Livewire;

use Livewire\Component;

class ShowcaseLive extends Component
{
    public string $name = '';

    public string $selectedOption = '';

    public function render()
    {
        return view('livewire.showcase-live');
    }
}
