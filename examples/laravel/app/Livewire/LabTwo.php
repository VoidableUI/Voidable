<?php

namespace App\Livewire;

use Livewire\Component;

/**
 * The second page of the wire:navigate test (see Lab), with a classic form
 * that posts to a route outside Livewire so the server sees what the browser
 * builds from the Voidable controls.
 */
class LabTwo extends Component
{
    public string $note = '';

    public string $choice = '';

    public int $count = 0;

    public function increment(): void
    {
        $this->count++;
    }

    public function render()
    {
        return view('livewire.lab-two');
    }
}
