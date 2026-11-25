// Hand-written facts the analyzer cannot derive from component source.
// Merged into dist/custom-elements.json by `manifestSupplementPlugin` in
// ./plugins.js, so the editor data and framework typings generated from the
// manifest pick them up too. The plugin fails the build if an entry names an
// unknown tag, an event the child does not dispatch, or an event that does
// not bubble, so stale entries cannot linger silently.
//
// Prefer fixing the source (a real @property, a typed detail) over adding
// entries here; this file exists because component source is out of scope for
// the manifest tooling.

/**
 * Public attributes with no matching reactive property, so the analyzer cannot
 * see them: attributes a parent reads from a child, and host attributes that
 * only the theme CSS matches.
 * @type {Record<string, { name: string, type: string, description: string }[]>}
 */
export const extraAttributes = {
  // toggle-group.ts reads `toggle.getAttribute('value')` from each child.
  'void-toggle': [
    {
      name: 'value',
      type: 'string',
      description: 'Value this toggle contributes to a parent `<void-toggle-group>`.',
    },
  ],
  // card.css: `void-card[scrollable]` opts in to an internal scrollbar; no JS reads it.
  'void-card': [
    {
      name: 'scrollable',
      type: 'boolean',
      description:
        'Let the card shrink and scroll its content inside a height-constrained flex or grid parent. ' +
        'Without it the card keeps its content height and never scrolls.',
    },
  ],
};

/**
 * Bubbling events from a child element that users listen for on the parent
 * of the same family. The parent does not intercept or re-dispatch them.
 * @type {{ tag: string, from: string, events: string[] }[]}
 */
export const ancestorEvents = [
  { tag: 'void-accordion', from: 'void-accordion-item', events: ['void-toggle'] },
  { tag: 'void-list', from: 'void-list-item', events: ['void-click'] },
  { tag: 'void-menu', from: 'void-menu-item', events: ['void-select'] },
  { tag: 'void-menu-group', from: 'void-menu-item', events: ['void-select'] },
  { tag: 'void-dropdown-menu', from: 'void-dropdown-menu-item', events: ['void-select'] },
  { tag: 'void-toast-container', from: 'void-toast', events: ['void-close'] },
];

/**
 * Event detail types the plugin cannot infer statically, keyed by tag then
 * event. Used only where inference produced `unknown`.
 * @type {Record<string, Record<string, string>>}
 */
export const eventDetails = {
  // Re-dispatches the inner <void-calendar>'s `void-change` detail (`e.detail`).
  'void-date-picker': { 'void-change': '{ value: string; date: Date }' },
};

/**
 * Which `void-*` tags a child tag may sit inside (anywhere above it, not only
 * as a direct child: a wrapper `<div>` or `<void-card>` in between is fine).
 * The manifest plugin writes this to the declaration as `voidParents`; the
 * `voidable` tool (check, reference, skill) and the `@voidable/ui/dev` runtime
 * warnings read it from there, so it lives in one place.
 * @type {Record<string, string[]>}
 */
export const allowedParents = {
  'void-option': ['void-multiselect', 'void-combobox'],
  'void-dropdown-menu-item': ['void-dropdown-menu'],
  'void-tab-panel': ['void-tabs'],
  'void-carousel-slide': ['void-carousel'],
  'void-segmented-control-item': ['void-segmented-control'],
  'void-accordion-item': ['void-accordion'],
  'void-list-item': ['void-list'],
  'void-nav-menu-item': ['void-nav-menu'],
};

/**
 * Child tags a parent cannot work without. Checked once the page has settled
 * (children may render after the parent). Written to the declaration as
 * `voidRequires`.
 * @type {Record<string, string[]>}
 */
export const requiredChildren = {
  'void-tabs': ['void-tab-panel'],
  'void-accordion': ['void-accordion-item'],
  'void-carousel': ['void-carousel-slide'],
  'void-segmented-control': ['void-segmented-control-item'],
};

/**
 * Advice for attributes agents commonly guess that do not exist, keyed by tag
 * then attribute. Shown next to the "unknown attribute" message (runtime and
 * `voidable check`). Written to the declaration as `voidHints`.
 * @type {Record<string, Record<string, string>>}
 */
export const attributeHints = {
  'void-input': { label: 'wrap the control in <void-field label="...">' },
  'void-textarea': { label: 'wrap the control in <void-field label="...">' },
  'void-select': { label: 'wrap the control in <void-field label="...">; options are native <option> children' },
  'void-stat': {
    unit: 'use <void-figure> with data-void-type="value" and "unit" spans',
    caption: 'use <void-figure> with a data-void-type="caption" span',
  },
  'void-tooltip': { visible: 'the shown state is the open attribute' },
};

/**
 * Attributes a parent writes onto its children (carousel.ts marks the current
 * slide `active`; the theme reads it). They are state, not API, so they are not
 * declared attributes, but a validator must not report them. Merged into the
 * declaration's `voidHostAttributes` with the ones components set on themselves.
 * @type {Record<string, string[]>}
 */
export const parentSetAttributes = {
  'void-carousel-slide': ['active'],
};
