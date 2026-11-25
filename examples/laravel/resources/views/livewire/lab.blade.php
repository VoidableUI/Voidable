<div @if ($polling) wire:poll.100ms="tick" @endif style="display: grid; gap: 1.5rem; max-width: 900px">
    <h1>Livewire lab</h1>
    <nav style="display: flex; gap: 1rem">
        <a href="/lab/two" wire:navigate id="to-two">Page two</a>
    </nav>

    <section style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap">
        <span id="version">Server version {{ $v }}</span>
        <span id="ticks">Ticks {{ $ticks }}</span>
        <button id="bump" type="button" wire:click="bump">Bump</button>
        <button id="server-sets" type="button" wire:click="serverSets">Server sets values</button>
        <button id="poll-on" type="button" wire:click="startPolling">Start polling</button>
        <button id="poll-off" type="button" wire:click="stopPolling">Stop polling</button>
    </section>

    <form id="f" wire:submit="save" style="display: grid; gap: 1rem">
        <void-field label="Full name">
            <void-input id="i-name" name="user[name]" x-void-on:void-input="$wire.set('user.name', $event.detail.value)" value="{{ $user['name'] }}"></void-input>
        </void-field>
        <void-field label="Email">
            <void-input id="i-email" type="email" name="user[email]" x-void-on:void-input="$wire.set('user.email', $event.detail.value)" value="{{ $user['email'] }}"></void-input>
        </void-field>
        <void-field label="Bio">
            <void-textarea id="i-bio" name="user[bio]" x-void-on:void-input="$wire.set('user.bio', $event.detail.value)" value="{{ $user['bio'] }}"></void-textarea>
        </void-field>
        <void-field label="Country">
            <void-select id="i-country" name="user[country]" placeholder="Choose…" x-void-on:void-change="$wire.set('user.country', $event.detail.value)" value="{{ $user['country'] }}">
                <option value="nz">New Zealand ({{ $ticks }})</option>
                <option value="au">Australia</option>
                <option value="fj">Fiji</option>
            </void-select>
        </void-field>
        <void-checkbox id="i-remember" name="user[remember_me]" value="1" x-void-on:void-change="$wire.set('user.remember_me', $event.detail.checked)" @checked($user['remember_me'])>Remember me</void-checkbox>
        <void-radio-group id="i-plan" name="user[plan]" label="Plan" x-void-on:void-change="$wire.set('user.plan', $event.detail.value)" value="{{ $user['plan'] }}">
            <void-radio value="free">Free</void-radio>
            <void-radio value="pro">Pro</void-radio>
            <void-radio value="team">Team</void-radio>
        </void-radio-group>
        <void-field label="Volume">
            <void-slider id="i-vol" name="user[volume]" min="0" max="100" step="5" x-void-on:void-change="$wire.set('user.volume', $event.detail.value)" value="{{ $user['volume'] }}"></void-slider>
        </void-field>
        <void-switch id="i-news" name="user[newsletter]" value="yes" x-void-on:void-change="$wire.set('user.newsletter', $event.detail.checked)" @checked($user['newsletter'])>Newsletter</void-switch>
        <void-field label="Seats">
            <void-number-input id="i-seats" name="user[seats]" min="1" max="10" x-void-on:void-change="$wire.set('user.seats', $event.detail.value)" value="{{ $user['seats'] }}"></void-number-input>
        </void-field>
        <void-field label="Start date">
            <void-date-picker id="i-date" name="user[start]" x-void-on:void-change="$wire.set('user.start', $event.detail.value)" value="{{ $user['start'] }}"></void-date-picker>
        </void-field>
        <void-field label="Tags">
            <void-tags-input id="i-tags" name="user[tags]" x-void-on:void-change="$wire.set('user.tags', $event.detail.value)"></void-tags-input>
        </void-field>
        <void-field label="Framework">
            <void-combobox id="i-fw" name="user[framework]" placeholder="Pick" x-void-on:void-change="$wire.set('user.framework', $event.detail.value)" value="{{ $user['framework'] }}">
                <void-option value="react">React</void-option>
                <void-option value="vue">Vue</void-option>
                <void-option value="lit">Lit</void-option>
            </void-combobox>
        </void-field>
        <void-field label="Skills">
            <void-multiselect id="i-skills" name="user[skills][]" placeholder="Pick many" x-void-on:void-change="$wire.set('user.skills', $event.detail.values)">
                <void-option value="css" @selected(in_array('css', $user['skills']))>CSS</void-option>
                <void-option value="js" @selected(in_array('js', $user['skills']))>JS</void-option>
                <void-option value="html" @selected(in_array('html', $user['skills']))>HTML</void-option>
            </void-multiselect>
        </void-field>
        <div style="display: flex; gap: 1rem">
            <button id="save" type="submit">Save</button>
        </div>
    </form>
    <pre id="saved">{{ json_encode($saved) }}</pre>
    <pre id="current">{{ json_encode($user) }}</pre>

    <section style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap">
        <button id="open-dlg" type="button" wire:click="openDialog">Open dialog</button>
        <span id="dialog-state">Server thinks the dialog is {{ $dialogOpen ? 'open' : 'closed' }}</span>
    </section>
    <void-dialog id="dlg" heading="Server dialog" @if ($dialogOpen) open @endif x-void-on:void-close="$wire.closeDialog()">
        <p id="dlg-body">Dialog body, ticks {{ $ticks }}</p>
        <button id="dlg-bump" type="button" wire:click="bump">Bump from inside</button>
    </void-dialog>

    <section style="display: flex; gap: 2rem; align-items: flex-start; flex-wrap: wrap">
        <void-dropdown-menu id="dd">
            <button slot="trigger" id="dd-trigger" type="button">Actions {{ $ticks }}</button>
            <void-dropdown-menu-item>Rename</void-dropdown-menu-item>
            <void-dropdown-menu-item>Archive</void-dropdown-menu-item>
        </void-dropdown-menu>
        <void-tabs id="tabs" @if ($tab !== '') value="{{ $tab }}" @endif>
            <void-tab-panel tab="one" label="One">Panel one, version {{ $v }}</void-tab-panel>
            <void-tab-panel tab="two" label="Two">Panel two, ticks {{ $ticks }}</void-tab-panel>
        </void-tabs>
        <button id="server-tab" type="button" wire:click="serverTab('two')">Server selects tab two</button>
    </section>

    <section style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap">
        <void-button id="bridge-btn" variant="filled" name="bridge"
            x-void-on:void-click="$wire.logEvent('void-click', {id: $el.id, name: $el.getAttribute('name'), detail: $event.detail ?? {}})">Bridge button</void-button>
        <void-select id="bridge-select" name="bridge_select" placeholder="Bridge select"
            x-void-on:void-change="$wire.logEvent('void-change', {id: $el.id, name: $el.getAttribute('name'), detail: $event.detail})">
            <option value="a">A</option>
            <option value="b">B</option>
        </void-select>
        <void-checkbox id="bridge-check" name="bridge_check" value="1"
            x-void-on:void-change="$wire.logEvent('void-change', {id: $el.id, name: $el.getAttribute('name'), detail: $event.detail})">Bridge check</void-checkbox>
        <void-switch id="bridge-switch" name="bridge_switch"
            x-void-on:void-change="$wire.logEvent('void-change', {id: $el.id, name: $el.getAttribute('name'), detail: $event.detail})">Bridge switch</void-switch>
        <void-input id="bridge-input" name="bridge_input" placeholder="Bridge input"
            x-void-on:void-change="$wire.logEvent('void-change', {id: $el.id, name: $el.getAttribute('name'), detail: $event.detail})"></void-input>
    </section>
    <pre id="events">{{ json_encode($events) }}</pre>
</div>
