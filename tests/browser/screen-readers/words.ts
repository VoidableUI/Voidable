// SPDX-License-Identifier: MIT
//
// Turns a Fact into what a screen reader is expected to say, loosely.
//
// Phrases differ between VoiceOver and NVDA, between versions and between
// languages ("Email address, edit, required" against "Email address, text field,
// required"), so nothing here compares a whole phrase. A phrase is normalised
// (lower case, punctuation and accents removed, one space between words) and then
// must CONTAIN the name, one word from a list of acceptable role words, and one
// word from a list for each state. The tables below are the only place that
// vocabulary lives; when a screen-reader version words something differently,
// widen the table, not the scenario.
//
// The tests run with the screen reader and the system in English (the setup step
// of the workflow does that); other languages are out of scope.
import type { Fact } from './facts';

/** Lower case, accents and punctuation removed, single spaces. "%" is kept: "50%" is how a slider is spoken. */
export function normalise(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}%]+/gu, ' ')
    .trim();
}

const contains = (phrase: string, needle: string) => ` ${phrase} `.includes(` ${normalise(needle)} `);

/** Role words: any one of them in the phrase counts. Roles missing here need no word. */
export const ROLE_WORDS: Record<string, RegExp> = {
  button: /\bbutton\b/,
  link: /\blink\b/,
  checkbox: /\bcheck ?box\b/,
  radio: /\bradio\b/,
  switch: /\b(switch|toggle|check ?box)\b/,
  textbox: /\b(edit|text field|text|input|entry)\b/,
  spinbutton: /\b(spin ?button|stepper|edit|text field|text|number)\b/,
  slider: /\bslider\b/,
  tab: /\btab\b/,
  tablist: /\b(tab list|tab group|tab bar|tablist|group)\b/,
  dialog: /\bdialog\b/,
  menu: /\bmenu\b/,
  menuitem: /\b(menu item|menuitem|item)\b/,
  heading: /\bheading\b/,
  navigation: /\b(navigation|nav)\b/,
  table: /\btable\b/,
  columnheader: /\b(column header|header|column)\b/,
  combobox: /\b(combo ?box|pop up|popup|menu|text field|edit|select|pop up button)\b/,
  option: /\b(option|menu item|item|selected)\b/,
  radiogroup: /\b(radio group|group)\b/,
  group: /\bgroup\b/,
  tooltip: /\btooltip\b/,
  alert: /\balert\b/,
  region: /\bregion\b/,
};

/** The word for a role that is only announced when entering it are marked `container` on the Fact. */
export function roleWords(fact: Fact): RegExp | null {
  if (fact.container) return null;
  return ROLE_WORDS[fact.role] ?? null;
}

interface Detail {
  /** For messages: what was expected. */
  label: string;
  test: (phrase: string) => boolean;
}

/** Words to check beyond the identity (name and role), from the states a Fact lists. */
export function detailsOf(fact: Fact): Detail[] {
  if (fact.spoken) {
    return fact.spoken.map((w) => ({
      label: String(w),
      test: (p) => (typeof w === 'string' ? contains(p, w) : w.test(p)),
    }));
  }
  const out: Detail[] = [];
  const re = (label: string, r: RegExp) => out.push({ label, test: (p) => r.test(p) });
  if (fact.level !== undefined) re(`level ${fact.level}`, new RegExp(`\\blevel ${fact.level}\\b`));
  if (fact.expanded === true) re('expanded', /\bexpanded\b/);
  if (fact.expanded === false) re('collapsed', /\b(collapsed|not expanded|closed)\b/);
  if (fact.checked === true) re('checked / on', /(?<!\bnot )(?<!\bun)\b(checked|ticked|selected|on|pressed)\b/);
  if (fact.checked === false) re('unchecked / off', /\b(unchecked|not checked|unticked|off|not selected|not pressed)\b/);
  if (fact.selected === true) re('selected', /(?<!\bnot )\bselected\b/);
  if (fact.disabled === true) re('dimmed / unavailable', /\b(dimmed|unavailable|disabled|not available)\b/);
  if (fact.current) re('current', /\bcurrent\b/);
  if (fact.required) re('required', /\brequired\b/);
  if (fact.invalid) re('invalid', /\binvalid\b/);
  if (fact.value !== undefined) re(`value ${fact.value}`, new RegExp(`(^| )${normalise(fact.value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( |$)`));
  if (fact.position) re(`${fact.position.n} of ${fact.position.of}`, new RegExp(`\\b${fact.position.n} of ${fact.position.of}\\b`));
  if (fact.group) {
    const g = fact.group.name;
    out.push({ label: `group "${g}"`, test: (p) => contains(p, g) });
  }
  if (fact.description) {
    const d = fact.description;
    out.push({ label: `description "${d}"`, test: (p) => contains(p, d) });
  }
  if (fact.header) {
    const h = fact.header;
    out.push({ label: `column header "${h}"`, test: (p) => contains(p, h) });
  }
  return out;
}

/** The identity of a Fact in speech: its text or name, and a role word. Null parts are not required. */
export function identityOf(fact: Fact): { label: string; test: (phrase: string) => boolean } {
  const key = fact.text ?? fact.name;
  const role = roleWords(fact);
  const label = [key ? `"${key}"` : '', role ? `role ${fact.role}` : ''].filter(Boolean).join(' + ') || fact.role;
  return {
    label,
    test: (p) => (key === undefined || contains(p, key)) && (!role || role.test(p)),
  };
}

export interface Verdict {
  /** The phrase is the element: name (or text) and role word present. */
  isElement: boolean;
  /** Details expected but not heard, for the failure message. */
  missing: string[];
}

/** Compares one spoken phrase with a Fact. `identity` false skips the name and role (see Fact.spoken). */
export function matchFact(spoken: string, fact: Fact, opts: { identity?: boolean } = {}): Verdict {
  const phrase = normalise(spoken);
  const id = identityOf(fact);
  const skipIdentity = opts.identity === false;
  const isElement = skipIdentity ? true : id.test(phrase);
  const missing = detailsOf(fact)
    .filter((d) => !d.test(phrase))
    .map((d) => d.label);
  return { isElement, missing };
}

/**
 * Whether anything spoken since an action satisfies a Fact. After an action a screen
 * reader often says only what changed ("checked", "60%", "expanded") without repeating
 * the name, so a Fact that lists details (states, a value, a description) is satisfied
 * by one phrase containing all of them; a Fact with none must be heard as the element:
 * its name (or text) and role word.
 */
export function heard(phrases: string[], fact: Fact): boolean {
  const details = detailsOf(fact);
  return phrases.some((p) => {
    const phrase = normalise(p);
    if (details.length) return details.every((d) => d.test(phrase));
    return identityOf(fact).test(phrase);
  });
}

/** A readable description of a Fact for logs and errors. */
export function describeFact(fact: Fact): string {
  const bits = [fact.role, fact.name ? `"${fact.name}"` : '', fact.text ? `text "${fact.text}"` : ''].filter(Boolean);
  const states = (['expanded', 'checked', 'selected', 'disabled', 'current', 'required', 'invalid'] as const)
    .filter((k) => fact[k] !== undefined)
    .map((k) => `${k}=${fact[k]}`);
  if (fact.value !== undefined) states.push(`value=${fact.value}`);
  if (fact.level !== undefined) states.push(`level=${fact.level}`);
  if (fact.position) states.push(`${fact.position.n} of ${fact.position.of}`);
  return states.length ? `${bits.join(' ')} [${states.join(', ')}]` : bits.join(' ');
}
