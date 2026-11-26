import type { ComplexAttributeConverter } from 'lit';

/**
 * The `value` attribute of a control whose value is a list of tags (strings or `{ text, color }`): a JSON
 * array. Unlike Lit's built-in array converter, an absent, empty or invalid attribute is the empty list,
 * never `null`: a morph that removes the reflected attribute must not leave the property null for the
 * moment before it is reset.
 */
export const valueJsonList: ComplexAttributeConverter<unknown[]> = {
  fromAttribute(attribute: string | null): unknown[] {
    if (attribute === null || attribute.trim() === '') return [];
    try {
      const parsed: unknown = JSON.parse(attribute);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Not JSON: no tags.
    }
    return [];
  },
  toAttribute(values: unknown[] | null | undefined): string {
    return JSON.stringify(values ?? []);
  },
};

/**
 * The `value` attribute of a control whose value is a list of strings (a multiselect, a checkbox group):
 * a JSON array, `value='["a","b"]'`. An attribute that is not JSON, or JSON that is not an array, is one
 * value, so `value="a"` chooses `a`. Empty or absent is the empty list.
 */
export const valueList: ComplexAttributeConverter<string[]> = {
  fromAttribute(attribute: string | null): string[] {
    if (attribute === null || attribute.trim() === '') return [];
    try {
      const parsed: unknown = JSON.parse(attribute);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      // Not JSON: a bare value.
    }
    return [attribute];
  },
  toAttribute(values: string[] | null | undefined): string {
    return JSON.stringify(values ?? []);
  },
};
