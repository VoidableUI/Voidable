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
  'untracked:voiceover-dialog-description':
    'Reader behaviour, not a component defect: VoiceOver says "Profile settings web dialog with 6 items" on entry and does not speak the dialog description ("Change how your name appears."), which it exposes as help text rather than reading it. The dialog is correct in the accessibility tree and NVDA speaks name and description once ("Profile settings, dialog, Change how your name appears."). An aria-description mirror was tried and made no difference, so it was removed. The scenario stays an expected failure as a record of the difference.',
  'untracked:voiceover-multiselect-selection':
    'After Enter chooses an option in a multiselect, VoiceOver says only "You are currently on a selectable (null), inside of a list box." and nothing about the selection; NVDA says "selected".',
  'untracked:nvda-radio-not-checked':
    'NVDA says "Plan, grouping, Free, radio button, not checked" for the radio that is checked, and no position; VoiceOver says "Free selected radio button, 1 of 3".',
  'untracked:nvda-accordion-expanded':
    'NVDA says "clickable, How do refunds work?, button, expanded" for an accordion trigger whose aria-expanded is false; the dropdown menu trigger is spoken as "collapsed" by the same NVDA, and VoiceOver says collapsed for the accordion.',
} as const;

export type KnownIssue = keyof typeof KNOWN_ISSUES;
