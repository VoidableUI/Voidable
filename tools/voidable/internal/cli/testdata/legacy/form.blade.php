<void-tooltip position="top"><void-tooltip-trigger><button type="button">?</button></void-tooltip-trigger><void-tooltip-content>{{ $hint }}</void-tooltip-content></void-tooltip>
<void-drawer closable="false" x-on:void-close="saved()"><void-drawer-title>{{ $title }}</void-drawer-title></void-drawer>
<void-toast-container placement="bottom-right" x-on:void-close="gone()"></void-toast-container>
<void-color-picker aria-label="Colour" show-input name="colour"></void-color-picker>
<void-nav-menu><void-nav-menu-item active><void-nav-menu-trigger><a href="{{ route('home') }}">Home</a></void-nav-menu-trigger></void-nav-menu-item></void-nav-menu>
