// SPDX-License-Identifier: MIT
//
// Every expected failure in the browser suite names one of these keys.
// "#n" keys are GitHub issues. "untracked:" keys are defects this suite found
// that have no issue yet: open one, then rename the key to its number.
// When a fix lands, its tests start passing, Playwright reports them as
// "expected to fail but passed", and the expectedFailure() calls (and the
// entry here, once nothing uses it) are deleted in the same change.
//
// The "untracked:voiceover-" and "untracked:nvda-" keys come from the first runs (macOS 15 VoiceOver,
// Windows 2025 NVDA, Guidepup). They mark a scenario's `readerIssues`: the
// accessibility tree is right (the tree replay passes), but VoiceOver does not
// say what a user needs. Those scenarios still run with that reader, as expected
// failures, so a fix turns them red and the entry goes.
export const KNOWN_ISSUES = {
  'untracked:voiceover-number-input-percent':
    'VoiceOver speaks a number input as a percentage of its range ("11.1% Seats stepper" for a value of 2) instead of its value; it should say "2". aria-valuenow with aria-valuemin/aria-valuemax and no aria-valuetext is read as a percentage.',
  'untracked:voiceover-dialog-description':
    'VoiceOver names the dialog ("Profile settings web dialog with 6 items") but never speaks its description, "Change how your name appears.", which is attached with ARIA element references across a shadow root.',
  'untracked:voiceover-toast-silent':
    'VoiceOver speaks nothing for a toast: the polite live region receives "Changes saved" and the only phrase logged is empty (""); it should say "Changes saved".',
  'untracked:nvda-toast-silent':
    'NVDA speaks nothing for a toast either: the only phrase logged after "Changes saved" was added to the polite live region is empty (""). With VoiceOver too, this is the strongest evidence of a component defect.',
  'untracked:voiceover-multiselect-selection':
    'After Enter chooses an option in a multiselect, VoiceOver says only "You are currently on a selectable (null), inside of a list box." and nothing about the selection; NVDA says "selected".',
  'untracked:voiceover-menu-silent':
    'A dropdown menu opens and focus moves to its first item (the page-side focus check passes), but VoiceOver says only "Actions menu pop up button", never the item ("Rename", 1 of 3).',
  'untracked:nvda-radio-not-checked':
    'NVDA says "Plan, grouping, Free, radio button, not checked" for the radio that is checked, and no position; VoiceOver says "Free selected radio button, 1 of 3".',
  'untracked:nvda-accordion-expanded':
    'NVDA says "clickable, How do refunds work?, button, expanded" for an accordion trigger whose aria-expanded is false; the dropdown menu trigger is spoken as "collapsed" by the same NVDA, and VoiceOver says collapsed for the accordion.',
} as const;

export type KnownIssue = keyof typeof KNOWN_ISSUES;
