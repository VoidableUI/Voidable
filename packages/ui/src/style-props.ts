import { noChange } from 'lit';
import { Directive, directive, PartType, type PartInfo, type AttributePart } from 'lit/directive.js';

type Props = Record<string, string | number | null | undefined>;

/**
 * Sets CSS custom properties on an element through the CSSOM (`style.setProperty`), for `style=${styleProps({...})}`.
 *
 * Lit's `styleMap` writes its first render as a `style="…"` attribute, which a Content Security Policy without
 * `'unsafe-inline'` blocks; this never writes the attribute. A property that leaves the object (or is
 * `null`/`undefined`) is removed.
 */
class StylePropsDirective extends Directive {
  private _previous = new Set<string>();

  constructor(part: PartInfo) {
    super(part);
    if (part.type !== PartType.ATTRIBUTE || part.name !== 'style') throw new Error('styleProps must be used as the style attribute');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  render(_props: Props) {
    return noChange;
  }

  override update(part: AttributePart, [props]: [Props]) {
    const style = (part.element as HTMLElement | SVGElement).style;
    const next = new Set<string>();
    for (const [name, value] of Object.entries(props)) {
      if (value == null) continue;
      next.add(name);
      const text = String(value);
      if (style.getPropertyValue(name) !== text) style.setProperty(name, text);
    }
    for (const name of this._previous) if (!next.has(name)) style.removeProperty(name);
    this._previous = next;
    return noChange;
  }
}

export const styleProps = directive(StylePropsDirective);
