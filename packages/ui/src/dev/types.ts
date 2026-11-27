/**
 * How one attribute's value is validated: `0` any string, `1` boolean, `2`
 * number, a string array is the closed set of allowed values.
 */
export type AttrRule = 0 | 1 | 2 | readonly string[];

/** Validation data for one tag, generated from the Custom Elements Manifest. */
export interface DevTag {
  /** Module name under `components/` that registers the tag. */
  m: string;
  /** Declared attributes. */
  a: Readonly<Record<string, AttrRule>>;
  /** Host attributes the component sets on itself (not API, never reported). */
  h?: readonly string[];
  /** Events the element dispatches (including ones that bubble from children). */
  e: readonly string[];
  /** Tags the element must sit inside (anywhere above it). */
  p?: readonly string[];
  /** Tags the element cannot work without (somewhere below it). */
  r?: readonly string[];
  /** Advice for attributes people guess that do not exist. */
  x?: Readonly<Record<string, string>>;
  /** Its explicit parts (#52). */
  q?: DevParts;
  /** 1 for a CSS-only part: styled by the theme, never registered. */
  c?: 1;
  /** What gives the element its accessible name (it must have one). */
  n?: DevName;
  /** The native control the author writes inside it (`select` in `<void-select>`), with the correct markup. */
  v?: { tag: string; fix: string };
  /** What was renamed or removed in 0.8 (#23), with the form to write instead. */
  l?: DevRenamed;
  /** It can be one link or one button as a whole: the part that holds the control, and the correct markup. */
  k?: { p: string; c: readonly string[]; s: string };
}

/** One renamed or removed attribute (cem/supplement.js `renamed`). */
export interface DevRenamedAttribute {
  /** The new attribute, written with the same value. */
  to?: string;
  /** Replacement markup for one old value (`''`: written with no value). */
  values?: Readonly<Record<string, string>>;
  /** What to do when neither applies. */
  fix?: string;
}

/** What was renamed or removed on one tag in 0.8 (#23). */
export interface DevRenamed {
  /** Old attribute -> its replacement. */
  a?: Readonly<Record<string, DevRenamedAttribute>>;
  /** Attribute -> { old value -> new value }. */
  v?: Readonly<Record<string, Readonly<Record<string, string>>>>;
  /** Old event name -> what to listen for instead. */
  e?: Readonly<Record<string, string>>;
}

/** The explicit parts of a component (or of a part that has parts of its own). */
export interface DevParts {
  /** `parts`: every child element must be a part; `any`: parts mixed with other content. */
  k: 'parts' | 'any';
  /** The parts must appear in the listed order. */
  o?: 1;
  /** Non-part elements allowed between the owner and its parts (`form`). */
  t?: readonly string[];
  /** The correct markup in one line. */
  s: string;
  /** Advice for loose children: the implicit form the parts replaced. */
  l?: string;
  /** The parts, in canonical order. */
  n: ReadonlyArray<{ t: string; r?: 1; x?: number; c?: 1 }>;
}

/** The sources of an accessible name for one tag (cem/supplement.js `accessibleName`). */
export interface DevName {
  /** Attributes of the element that name it. */
  a: readonly string[];
  /** The element's own content names it. */
  c?: 1;
  /** Part elements (own descendants) that name it when they hold text. */
  t?: readonly string[];
  /** Ancestors that name it: `[tag, ...attributes]`; with no attributes the ancestor alone is enough. */
  p?: readonly (readonly string[])[];
  /** What to do about it. */
  h: string;
}

export type DevTable = Readonly<Record<string, DevTag>>;

export type WarningKind =
  | 'unknown-attribute'
  | 'invalid-value'
  | 'boolean-false'
  | 'wrong-parent'
  | 'missing-child'
  | 'undefined-element'
  | 'unknown-event'
  /** A required part (#52) is missing. */
  | 'missing-part'
  /** A child of a component that takes only parts is not one of them (the implicit form it replaced, usually). */
  | 'unknown-child'
  /** A part appears more often than allowed, or out of order. */
  | 'part-misuse'
  /** A tag that explicit parts replaced. */
  | 'legacy-markup'
  /** The element needs an accessible name and nothing gives it one. */
  | 'missing-name'
  /** A page script keeps removing an attribute a component manages on itself; the component stopped restoring it. */
  | 'attribute-fight'
  /** A chart's `data` or `zones` attribute is not valid JSON of the expected shape; the chart draws nothing. */
  | 'invalid-data'
  /** A `keys` attribute that is not a JSON object, or names an action the element does not have (#90). */
  | 'keys'
  /** An attribute is set that another attribute on the same element makes without effect (`resize` with `autosize`). */
  | 'attribute-conflict'
  /** An overlay opened away from its trigger because a page rule pins it (an inset on the content beats anchor positioning). */
  | 'misplaced-overlay'
  /** A card wrapped in a link or a button, or a linked card holding a second control. */
  | 'nested-control';

/** One reported problem. */
export interface DevWarning {
  kind: WarningKind;
  /** The tag the problem is about (the element type, or the listener's target). */
  tag: string;
  /** The attribute, child tag or event name involved. */
  subject: string;
  /** The text sent to `console.warn`. */
  message: string;
  /** The element, when there is one (events have none). */
  element?: Element;
}
