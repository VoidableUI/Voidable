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
  'untracked:liveview-typing-focus-lost': 'LiveView: typing quickly (30 ms between keys) into an input, email or textarea whose form echoes phx-change back replaces the control mid-typing, so focus goes to the body and the remaining keystrokes are lost. A second patch arrives while void-field is still parked from the first; its voidBeforeMorph returns false and morphdom removes the field chrome that holds the focused input',
  'untracked:liveview-phx-click-on-button': 'LiveView: phx-click on a void-button never fires; the always-attached VoidEvent hook pushes void-click first and LiveView ignores the click on the locked element',
} as const;

export type KnownIssue = keyof typeof KNOWN_ISSUES;
