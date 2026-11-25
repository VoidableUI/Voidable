<div style="display: grid; gap: var(--void-space-4); padding: var(--void-space-4); grid-template-columns: minmax(0, 1fr);">
    <div style="display: flex; flex-wrap: wrap; gap: var(--void-space-3); align-items: end;">
        <void-field label="Search">
            <void-input type="search" name="search" value="{{ $search }}" wire:model.live="search"></void-input>
        </void-field>
        <void-field label="Status">
            <void-select name="status" value="{{ $status }}" wire:model.live="status">
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="invited">Invited</option>
                <option value="suspended">Suspended</option>
            </void-select>
        </void-field>
    </div>

    <void-scroll-area direction="horizontal">
        <void-table hoverable>
            <table>
                <thead>
                    <tr><th>Name</th><th>Email</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                    @foreach ($users as $user)
                        <tr wire:key="user-{{ $user->id }}">
                            <td>{{ $user->name }}</td>
                            <td>{{ $user->email }}</td>
                            <td>
                                <void-badge color="{{ ['active' => 'success', 'invited' => 'info', 'suspended' => 'error'][$user->status] }}">{{ ucfirst($user->status) }}</void-badge>
                            </td>
                            <td>
                                <void-dropdown-menu position="bottom" align="end">
                                  <void-dropdown-menu-trigger><void-button size="sm" aria-label="Actions for {{ $user->name }}">⋯</void-button></void-dropdown-menu-trigger>
                                  <void-dropdown-menu-content>
                                    <void-dropdown-menu-item wire:click="edit({{ $user->id }})">Edit</void-dropdown-menu-item>
                                    <void-dropdown-menu-item destructive wire:click="deactivate({{ $user->id }})">Deactivate</void-dropdown-menu-item>
                                  </void-dropdown-menu-content>
                                </void-dropdown-menu>
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </void-table>
    </void-scroll-area>

    <void-pagination total="{{ $lastPage }}" value="{{ $page }}" href-template="?page={page}"></void-pagination>
</div>
