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
  spoken?: Spoken | Partial<Record<ReaderName, Spoken>>;
}

/** How the screen reader moves. `next` is the plain "next item" command; the others are quick navigation. */
export type Nav = 'next' | 'control' | 'focusable' | 'heading' | 'landmark' | 'link' | 'table';

export type ReaderName = 'VoiceOver' | 'NVDA';
export type Spoken = (string | RegExp)[];

/** A value for every reader, or one for each that needs its own: `{ VoiceOver: [...], NVDA: [...] }`. */
export type PerReader<T> = T | Partial<Record<ReaderName, T>>;

const isPerReader = <T>(v: PerReader<T>): v is Partial<Record<ReaderName, T>> => typeof v === 'object' && v !== null && !Array.isArray(v) && !(v instanceof RegExp);

/** The value `v` has for `reader` (undefined when `v` names other readers only). */
export function pick<T>(v: PerReader<T> | undefined, reader: ReaderName): T | undefined {
  return v !== undefined && isPerReader(v) ? v[reader] : (v as T | undefined);
}

/** The Fact as `reader` is checked against it: its `spoken` words resolved for that reader. */
export function forReader(fact: Fact, reader: ReaderName): Fact {
  return fact.spoken === undefined ? fact : { ...fact, spoken: pick(fact.spoken, reader) };
}

export type Step =
  /** Move until the element is reached, then check the facts the screen reader says about it. */
  | { reach: Fact; by?: PerReader<Nav> }
  /** Activate the element reached (VoiceOver: VO+Space, NVDA: Enter). Focus-only roles (slider, spinbutton, textbox) just take focus. */
  | { act: true }
  /** Press a key on the focused element. */
  | { press: string; /** Press it this many times (default 1), per reader: NVDA may spend the first Escape leaving focus mode. */ times?: PerReader<number> }
  /** Type text into the focused element. */
  | { type: string }
  /** Within the speech since the last action: this must have been announced (and, in the tree, be true now). */
  | { hear: Fact }
  /** Within the speech since the last action, exactly one phrase matches (the same words must not be spoken twice). Screen readers only; the tree has no speech. */
  | { once: RegExp }
  /** Move on `walk` items; the element must not be reachable (tree: it cannot take focus). */
  | { walk: number; unreachable: Fact }
  /** Table cell navigation from the table reached: one cell right or down. */
  | { cell: 'right' | 'down' }
  /** The page's own focus is on the element matching this selector (or inside it). */
  | { focus: string }
  /** A check on the page itself, in both runs. */
  | { check: (page: Page) => Promise<void>; note: string }
  /** Screen readers only, for diagnosis: move `sweep` times (default by "next") and record what each move said, whether or not anything matches. */
  | { sweep: number; by?: PerReader<Nav> }
  /** Wait this many milliseconds (an animation, a late announcement), then carry on. */
  | { pause: number };

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
  /**
   * The page is right (the tree replay passes) but this screen reader does not say what a user
   * needs. The scenario still runs with that reader, as an expected failure, so the job reports
   * it as known and a fix turns it red. Not used by the tree replay or by the other reader.
   */
  readerIssues?: Partial<Record<ReaderName, { key: KnownIssue; detail: string }>>;
  /**
   * A diagnostic run, not a test: the steps run with the screen reader, every failing step is logged
   * (`[probe <reader> <id>] ...`) and the scenario passes regardless. Used for reference controls built
   * with plain HTML or the ARIA Authoring Practices pattern beside a Voidable one, so a run shows what
   * the reader says about the pattern itself. Never run by the tree replay.
   */
  probe?: boolean;
  /** Run with these readers only (default: both). A probe about one reader's behaviour need not cost the other's job minutes. */
  readers?: ReaderName[];
  /**
   * Print the page's event trace (focus changes and `aria-*`, `role`, `tabindex` mutations in the order they
   * happened, see trace.ts) and the browser's accessibility tree after the scenario ran. Always printed
   * for a probe, a known issue and a failure.
   */
  trace?: boolean;
}
