import type { ComplexAttributeConverter } from 'lit';

/**
 * Attribute converter for a boolean property that defaults to `true`.
 *
 * Lit's Boolean converter maps "attribute present" to true and "absent" to
 * false, so markup can never turn such a property off: `closable="false"` is
 * still present, hence true. This converter reads the string `"false"` as
 * false and everything else, including a removed attribute, as true (the
 * default), so server-rendered markup (`closable="false"`, or
 * `closable={to_string(@closable)}` in HEEx) can express both values. When
 * reflected, true is written as an empty attribute and false as `"false"`.
 */
export const defaultTrueBoolean: ComplexAttributeConverter<boolean> = {
  fromAttribute: (value: string | null): boolean => value !== 'false',
  toAttribute: (value: boolean): string => (value ? '' : 'false'),
};
