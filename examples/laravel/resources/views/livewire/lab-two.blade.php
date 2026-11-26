<div style="display: grid; gap: 1.5rem; max-width: 900px">
    <h1>Livewire lab, page two</h1>
    <nav style="display: flex; gap: 1rem">
        <a href="/lab" wire:navigate id="to-one">Page one</a>
    </nav>

    <void-field label="Note">
        <void-input id="two-note" name="note" x-void-on:void-input="$wire.set('note', $event.detail.value)" value="{{ $note }}"></void-input>
    </void-field>
    <void-field label="Choice">
        <void-select id="two-choice" x-void-on:void-change="$wire.set('choice', $event.detail.value)" value="{{ $choice }}">
            <select name="choice">
                <option value="" disabled selected hidden>Choose…</option>
                <option value="x">Ex</option>
                <option value="y">Why</option>
            </select>
        </void-select>
    </void-field>
    <void-button id="two-count" variant="filled" wire:click="increment">Count {{ $count }}</void-button>
    <p id="two-note-echo">Server has note "{{ $note }}" and choice "{{ $choice }}"</p>

    {{-- A classic POST: no Livewire involved, the server sees what the browser builds. --}}
    <form id="post-form" method="post" action="/lab/echo" style="display: grid; gap: 1rem">
        @csrf
        <void-field label="Full name">
            <void-input id="p-name" name="user[name]"></void-input>
        </void-field>
        <void-field label="Bio">
            <void-textarea id="p-bio" name="user[bio]"></void-textarea>
        </void-field>
        <void-field label="Country">
            <void-select id="p-country">
                <select name="user[country]">
                    <option value="" disabled selected hidden>Choose…</option>
                    <option value="nz">New Zealand</option>
                    <option value="au">Australia</option>
                    <option value="fj">Fiji</option>
                </select>
            </void-select>
        </void-field>
        <void-checkbox id="p-remember" name="user[remember_me]" value="1">Remember me</void-checkbox>
        <void-radio-group id="p-plan" name="user[plan]" label="Plan">
            <void-radio value="free">Free</void-radio>
            <void-radio value="pro">Pro</void-radio>
        </void-radio-group>
        <void-switch id="p-news" name="newsletter" value="yes">Newsletter</void-switch>
        <void-field label="Seats">
            <void-number-input id="p-seats" name="seats" min="1" max="10" value="2"></void-number-input>
        </void-field>
        <void-field label="Skills">
            <void-multiselect id="p-skills" name="skills[]" placeholder="Pick many">
                <void-multiselect-content>
                    <void-option value="css">CSS</void-option>
                    <void-option value="js">JS</void-option>
                </void-multiselect-content>
            </void-multiselect>
        </void-field>
        <button id="post-save" type="submit">Post</button>
    </form>
</div>
