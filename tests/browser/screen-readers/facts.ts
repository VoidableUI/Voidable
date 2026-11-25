// SPDX-License-Identifier: MIT
//
// The vocabulary the screen-reader scenarios are written in. A scenario is data:
// the page, and a list of steps a user takes with a screen reader. The same
// steps are replayed two ways:
//
//   - tree.ts replays them in Chromium and Firefox against the browser's
//     accessibility tree (the normal browser suite, on Linux, in CI's `browser`
//     job). It proves the page exposes the role, name and state each step
//     expects, so the expectations are right before a screen reader is involved.
//   - runner.ts replays them with VoiceOver (macOS) or NVDA (Windows) driven by
//     Guidepup, and checks what was spoken against the same facts, loosely.
//
// Keep this file free of imports from Guidepup: the normal suite loads it.
import type { Page } from '@playwright/test';
import type { KnownIssue } from '../helpers/known-issues';

/** One thing a user can perceive: an element with a role, a name and some state. */
export interface Fact {
  /** ARIA role as the browser exposes it: button, link, textbox, checkbox, tab, dialog, menuitem... */
  role: string;
  /**
   * Locate the element by this CSS selector (and `text`) instead of by role: for an element with no
   * role of its own, such as an author-written part that only carries `aria-current`.
   */
  selector?: string;
  /** Accessible name, exact (case and surrounding whitespace aside). */
  name?: string;
  /** Text content, for elements whose name does not come from content (status, alert, tabpanel). Substring. */
  text?: string;
  /** Accessible description, substring. */
  description?: string;
  /**
   * The description is attached with ARIA element references (`ariaDescribedByElements`)
   * across a shadow root, which Playwright's accessible-description computation does
   * not follow (Chrome's own accessibility tree does). The tree replay then reads the
   * references instead.
   */
  describedByReference?: boolean;
  level?: number;
  expanded?: boolean;
  checked?: boolean;
  selected?: boolean;
  disabled?: boolean;
  /** aria-current (any value) is present. */
  current?: boolean;
  required?: boolean;
  invalid?: boolean;
  /** The current value as text: a slider's aria-valuenow, a spinbutton's number, a select's chosen option label. */
  value?: string;
  /** "n of m" among the elements of this role inside the `within` selector. */
  position?: { n: number; of: number; within: string };
  /** The element sits inside this named group (a radio group, a menu, a tablist). */
  group?: { role: string; name: string };
  /** The name of the column header of this cell. */
  header?: string;
  /**
   * The role is a container a screen reader announces when entering, not on every
   * item (tabpanel, region, alert text): the identity of the element in speech is
   * its text, and the role word is not required.
   */
  container?: boolean;
  /**
   * Words the speech must contain, instead of the ones derived from the states above
   * (use it when the screen reader says something shorter, such as only "60" for a slider).
   * Strings are matched as normalised substrings, regular expressions against the normalised phrase.
   */
  spoken?: (string | RegExp)[];
}

/** How the screen reader moves. `next` is the plain "next item" command; the others are quick navigation. */
export type Nav = 'next' | 'control' | 'heading' | 'landmark' | 'link' | 'table';

export type Step =
  /** Move until the element is reached, then check the facts the screen reader says about it. */
  | { reach: Fact; by?: Nav }
  /** Activate the element reached (VoiceOver: VO+Space, NVDA: Enter). Focus-only roles (slider, spinbutton, textbox) just take focus. */
  | { act: true }
  /** Press a key on the focused element. */
  | { press: string }
  /** Type text into the focused element. */
  | { type: string }
  /** Within the speech since the last action: this must have been announced (and, in the tree, be true now). */
  | { hear: Fact }
  /** Move on `walk` items; the element must not be reachable (tree: it cannot take focus). */
  | { walk: number; unreachable: Fact }
  /** Table cell navigation from the table reached: one cell right or down. */
  | { cell: 'right' | 'down' }
  /** The page's own focus is on the element matching this selector (or inside it). */
  | { focus: string }
  /** A check on the page itself, in both runs. */
  | { check: (page: Page) => Promise<void>; note: string };

export interface Scenario {
  /** Stable id: names the test and the row in the results file. */
  id: string;
  /** What the scenario is about, one line. */
  title: string;
  /** Page served by the browser suite's server (tests/browser/pages/<name>.html). */
  page: string;
  steps: Step[];
  /**
   * A real defect the tree replay found. The tree test is marked as an expected
   * failure with this key (see helpers/known-issues.ts) and the screen-reader run
   * skips the scenario, because the failure is already known and says nothing new.
   */
  knownIssue?: { key: KnownIssue; detail: string };
}
