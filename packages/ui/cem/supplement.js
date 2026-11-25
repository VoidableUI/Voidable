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
