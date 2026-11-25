// SPDX-License-Identifier: MIT
//
// Every expected failure in the browser suite names one of these keys.
// "#n" keys are GitHub issues. "untracked:" keys are defects this suite found
// that have no issue yet: open one, then rename the key to its number.
// When a fix lands, its tests start passing, Playwright reports them as
// "expected to fail but passed", and the expectedFailure() calls (and the
// entry here, once nothing uses it) are deleted in the same change.
export const KNOWN_ISSUES = {
  'untracked:date-picker-boundary': 'the date-picker input border is about 1.2 to 1.3:1 against the page, below the 3:1 every other control meets',
} as const;

export type KnownIssue = keyof typeof KNOWN_ISSUES;
