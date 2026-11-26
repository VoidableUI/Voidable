// SPDX-License-Identifier: MIT
//
// Every expected failure in the browser suite names one of these keys.
// "#n" keys are GitHub issues. "untracked:" keys are defects this suite found
// that have no issue yet: open one, then rename the key to its number.
// When a fix lands, its tests start passing, Playwright reports them as
// "expected to fail but passed", and the expectedFailure() calls (and the
// entry here, once nothing uses it) are deleted in the same change.
//
// The "untracked:voiceover-" keys come from the first VoiceOver run (macOS 15,
// Safari/WebKit, Guidepup). They mark a scenario's `voiceOverIssue`: the
// accessibility tree is right (the tree replay passes), but VoiceOver does not
// say what a user needs. Those scenarios still run with VoiceOver, as expected
// failures, so a fix turns them red and the entry goes.
export const KNOWN_ISSUES = {
  'untracked:voiceover-number-input-percent':
    'VoiceOver speaks a number input as a percentage of its range ("11.1% Seats stepper" for a value of 2) instead of its value; it should say "2". aria-valuenow with aria-valuemin/aria-valuemax and no aria-valuetext is read as a percentage.',
  'untracked:voiceover-dialog-description':
    'VoiceOver names the dialog ("Profile settings web dialog with 6 items") but never speaks its description, "Change how your name appears.", which is attached with ARIA element references across a shadow root.',
  'untracked:voiceover-toast-silent':
    'VoiceOver speaks nothing for a toast: the polite live region receives "Changes saved" and the only phrase logged is empty (""); it should say "Changes saved".',
} as const;

export type KnownIssue = keyof typeof KNOWN_ISSUES;
