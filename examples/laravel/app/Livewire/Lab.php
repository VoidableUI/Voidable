<?php

namespace App\Livewire;

use Livewire\Component;

/**
 * A page for the browser tests in tests/browser/server/laravel, and for trying
 * Livewire updates against Voidable components by hand: a form with every
 * common control, server updates that arrive while the user is using the page
 * (buttons, and a poll that changes text inside components), a dialog the
 * server opens and closes, overlays the client owns, an event log fed through
 * the Alpine adapter, and wire:navigate links to a second page.
 */
class Lab extends Component
{
    public array $user = [
        'name' => '',
        'email' => '',
        'bio' => '',
        'country' => '',
        'remember_me' => false,
        'plan' => 'free',
        'volume' => '50',
        'newsletter' => false,
        'seats' => '2',
        'start' => '',
        'tags' => [],
        'framework' => '',
        'skills' => [],
    ];

    public int $v = 1;

    public int $ticks = 0;

    public bool $polling = false;

    public ?array $saved = null;

    public bool $dialogOpen = false;

    public string $tab = '';

    /** @var array<int, array<string, mixed>> */
    public array $events = [];

    public function bump(): void
    {
        $this->v++;
    }

    public function tick(): void
    {
        $this->ticks++;
    }

    public function startPolling(): void
    {
        $this->polling = true;
    }

    public function stopPolling(): void
    {
        $this->polling = false;
    }

    /** The server changes what it rendered for these controls: it must win over what the user did. */
    public function serverSets(): void
    {
        $this->user['name'] = 'Set by the server';
        $this->user['country'] = 'fj';
        $this->user['plan'] = 'team';
        $this->user['remember_me'] = true;
        $this->user['newsletter'] = true;
        $this->user['volume'] = '80';
        $this->v++;
    }

    public function save(): void
    {
        $this->saved = $this->user;
    }

    public function openDialog(): void
    {
        $this->dialogOpen = true;
    }

    public function closeDialog(): void
    {
        $this->dialogOpen = false;
    }

    public function serverTab(string $tab): void
    {
        $this->tab = $tab;
    }

    /** Called by x-void-on handlers: the payload is what the page sent. */
    public function logEvent(string $event, array $payload): void
    {
        $this->events[] = ['event' => $event] + $payload;
        $this->events = array_slice($this->events, -20);
    }

    public function render()
    {
        return view('livewire.lab');
    }
}
