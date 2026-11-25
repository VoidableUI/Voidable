// SPDX-License-Identifier: MIT
//
// Every expected failure in the browser suite names one of these keys.
// "#n" keys are GitHub issues. "untracked:" keys are defects this suite found
// that have no issue yet: open one, then rename the key to its number.
// When a fix lands, its tests start passing, Playwright reports them as
// "expected to fail but passed", and the expectedFailure() calls (and the
// entry here, once nothing uses it) are deleted in the same change.
export const KNOWN_ISSUES = {
  'untracked:link-button-nested-interactive': 'void-button around a link is a button containing a link',
  'untracked:breadcrumbs-no-list-semantics': 'void-breadcrumbs exposes links in a navigation with no list or list items',
} as const;

export type KnownIssue = keyof typeof KNOWN_ISSUES;
