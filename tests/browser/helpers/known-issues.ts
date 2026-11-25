// SPDX-License-Identifier: MIT
//
// Every expected failure in the browser suite names one of these keys.
// "#n" keys are GitHub issues. "untracked:" keys are defects this suite found
// that have no issue yet: open one, then rename the key to its number.
// When a fix lands, its tests start passing, Playwright reports them as
// "expected to fail but passed", and the expectedFailure() calls (and the
// entry here, once nothing uses it) are deleted in the same change.
export const KNOWN_ISSUES = {
  '#6': 'overlay model (feat/overlay-model): focus trap and return, Escape on stacked overlays, dropdown-menu close on select, a closed hover-card still exposed to assistive technology, popover collision',
  'untracked:dialog-escape-double-close': 'Firefox: Escape inside a dialog fires void-close twice',
  'untracked:number-input-required': 'an empty required number-input reports valid and its form does not submit',
  'untracked:required-not-focusable': 'some invalid required controls cannot take focus, so the browser shows no message',
  'untracked:fieldset-disabled-focusable': 'several controls stay in the tab order inside a disabled fieldset',
  'untracked:date-picker-boundary': 'the date-picker input border is about 1.2 to 1.3:1 against the page, below the 3:1 every other control meets',
  'untracked:livewire-open-state': 'Livewire hooks do not preserve open (or other client attributes), so a repeat morph closes a user-opened dialog',
  'untracked:livewire-first-change-lost': 'Livewire hooks have no baseline from the initial render, so the first server change after load is ignored',
  'untracked:liveview-typing-focus-lost': 'LiveView: typing quickly (30 ms between keys) into an input, email or textarea whose form echoes phx-change back replaces the control mid-typing, so focus goes to the body and the remaining keystrokes are lost',
  'untracked:liveview-slider-reverts': 'LiveView: after a server patch the slider re-creates its range input at the initial value (50) while the host keeps the user value (55), so the handle jumps back and the form submits the old value',
  'untracked:liveview-tabs-wiped': 'LiveView: any patch that changes void-tabs or one of its panels blanks the other void-tab-panels (they arrive as empty data-phx-skip elements) and the tab buttons lose their labels and selection',
  'untracked:liveview-phx-click-on-button': 'LiveView: phx-click on a void-button never fires; the always-attached VoidEvent hook pushes void-click first and LiveView ignores the click on the locked element',
  'untracked:livewire-dropdown-closes': 'Livewire: the first update closes a dropdown menu the user opened',
  'untracked:livewire-tabs-childpart': 'Livewire: after a tab is selected, every update throws "ChildPart has no parentNode" in Lit',
  'untracked:livewire-tabs-server-value': 'Livewire: a value the server renders on void-tabs after load selects nothing',
  'untracked:livewire-multiselect-childpart': 'Livewire: choosing a second multiselect option throws "ChildPart has no parentNode" in Lit once the update for the first has arrived',
} as const;

export type KnownIssue = keyof typeof KNOWN_ISSUES;
