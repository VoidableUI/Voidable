/**
 * How one attribute's value is validated: `0` any string, `1` boolean, `2`
 * boolean that also reads the string "false", `3` number, a string array is the
 * closed set of allowed values.
 */
export type AttrRule = 0 | 1 | 2 | 3 | readonly string[];

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
  /** What gives the element its accessible name (it must have one). */
  n?: DevName;
}

/** The sources of an accessible name for one tag (cem/supplement.js `accessibleName`). */
export interface DevName {
  /** Attributes of the element that name it. */
  a: readonly string[];
  /** The element's own content names it. */
  c?: 1;
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
  /** The element needs an accessible name and nothing gives it one. */
  | 'missing-name'
  /** A page script keeps removing an attribute a component manages on itself; the component stopped restoring it. */
  | 'attribute-fight';

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
