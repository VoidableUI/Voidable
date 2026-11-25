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
  'void-carousel-slide': ['void-carousel'],
  'void-segmented-control-item': ['void-segmented-control'],
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
 * Explicit parts (#52): the regions of a component, written by the author as
 * elements and never moved by the component. The manifest plugin writes each
 * entry to the parent's declaration as `voidParts`, and from it derives
 * `voidParents` / `voidRequires` for the parts that are registered elements;
 * the typings, the React wrappers, `@voidable/ui/dev`, the `voidable` tool and
 * the docs read `voidParts`. A part with no registered class is CSS-only (the
 * plugin marks it `cssOnly`): styled by @voidable/theme, no JavaScript, and its
 * attributes are declared here.
 *
 * Per component (and per part that has parts of its own):
 *   children     'parts': every child element must be one of its parts (or an
 *                element named in `transparent`, whose children are checked
 *                the same way), and loose text is not allowed; 'any': parts
 *                mixed with other content.
 *   ordered      the parts must appear in the order they are listed.
 *   transparent  non-part elements allowed between the component and its parts.
 *   skeleton     the correct markup in one line, quoted in every warning.
 *   legacy       the implicit forms this component replaced: removed
 *                attributes (`attributes`, also written as `voidHints`),
 *                removed tags (`tags`) and loose children (`children`), each
 *                with the fix.
 *   parts        { tag, description, required, max, attributes, control,
 *                  children, ordered, legacy, parts } in canonical order.
 *                `control`: the part wraps exactly one element (the focusable
 *                control that gets the ARIA). `parts`: the part's own parts (a
 *                second level; there is never a third).
 * @type {Record<string, object>}
 */
const modalParts = (tag, noun) => ({
  children: 'parts',
  ordered: true,
  transparent: ['form'],
  skeleton: `<${tag} open><${tag}-title>Title</${tag}-title><${tag}-description>One line.</${tag}-description><${tag}-body>...</${tag}-body><${tag}-actions><void-button>Cancel</void-button><void-button variant="filled">OK</void-button></${tag}-actions></${tag}>`,
  legacy: {
    attributes: {
      heading: `write the title as the first child: <${tag}-title>...</${tag}-title>`,
    },
    children: `put the content in <${tag}-body> and the buttons in <${tag}-actions>`,
  },
  parts: [
    { tag: `${tag}-title`, required: true, max: 1, description: `Title of the ${noun}; names it and is its heading.` },
    { tag: `${tag}-description`, max: 1, description: `One or two sentences under the title; describes the ${noun} to assistive technology.` },
    { tag: `${tag}-body`, max: 1, description: `Main content of the ${noun}.` },
    { tag: `${tag}-actions`, max: 1, description: 'Row of buttons at the end, at the trailing edge.' },
  ],
});

const anchoredParts = (tag, verb, control, content, legacy) => ({
  children: 'parts',
  ordered: true,
  skeleton: `<${tag}><${tag}-trigger>${control}</${tag}-trigger><${tag}-content>${content}</${tag}-content></${tag}>`,
  legacy,
  parts: [
    {
      tag: `${tag}-trigger`,
      required: true,
      max: 1,
      control: true,
      description: `Wraps the one element that ${verb} (a <void-button>, a <button>, a link); that element gets the ARIA.`,
    },
    { tag: `${tag}-content`, required: true, max: 1, description: 'Shown in the top layer next to the trigger.' },
  ],
});

export const parts = {
  'void-dialog': modalParts('void-dialog', 'dialog'),
  'void-drawer': modalParts('void-drawer', 'drawer'),
  'void-popover': anchoredParts('void-popover', 'toggles the popover', '<void-button>Details</void-button>', '...', {
    children: 'wrap the button in <void-popover-trigger> and the panel content in <void-popover-content>',
  }),
  'void-hover-card': anchoredParts('void-hover-card', 'shows the card on hover and focus', '<a href="/users/ada">@ada</a>', '...', {
    children: 'wrap the link in <void-hover-card-trigger> and the card content in <void-hover-card-content>',
  }),
  'void-tooltip': anchoredParts('void-tooltip', 'the tooltip describes', '<void-button>Copy</void-button>', 'Copy to clipboard', {
    attributes: { text: 'write the hint as <void-tooltip-content>...</void-tooltip-content> after the <void-tooltip-trigger>' },
    children: 'wrap the described element in <void-tooltip-trigger> and the hint text in <void-tooltip-content>',
  }),
  'void-dropdown-menu': {
    children: 'parts',
    ordered: true,
    skeleton:
      '<void-dropdown-menu><void-dropdown-menu-trigger><void-button>Actions</void-button></void-dropdown-menu-trigger><void-dropdown-menu-content><void-dropdown-menu-item value="edit">Edit</void-dropdown-menu-item></void-dropdown-menu-content></void-dropdown-menu>',
    legacy: { children: 'wrap the button in <void-dropdown-menu-trigger> and the items in <void-dropdown-menu-content>' },
    parts: [
      {
        tag: 'void-dropdown-menu-trigger',
        required: true,
        max: 1,
        control: true,
        description: 'Wraps the one element that opens the menu (a <void-button>, a <button>); that element gets the menu-button ARIA.',
      },
      {
        tag: 'void-dropdown-menu-content',
        required: true,
        max: 1,
        children: 'parts',
        description: 'The menu (role="menu") shown in the top layer next to the trigger.',
        legacy: { children: 'separate groups of items with <void-dropdown-menu-separator></void-dropdown-menu-separator>' },
        parts: [
          { tag: 'void-dropdown-menu-item', required: true, description: 'One action of the menu.' },
          { tag: 'void-dropdown-menu-separator', description: 'Hairline between groups of items.' },
        ],
      },
    ],
  },
  'void-tabs': {
    children: 'parts',
    ordered: true,
    skeleton:
      '<void-tabs value="a"><void-tabs-list><void-tabs-trigger value="a">A</void-tabs-trigger><void-tabs-trigger value="b">B</void-tabs-trigger></void-tabs-list><void-tabs-content value="a">...</void-tabs-content><void-tabs-content value="b">...</void-tabs-content></void-tabs>',
    legacy: {
      tags: {
        'void-tab-panel':
          'write the tabs as <void-tabs-list><void-tabs-trigger value="a">Label</void-tabs-trigger></void-tabs-list> and each panel as <void-tabs-content value="a">...</void-tabs-content> (tab="a" becomes value="a"; label="..." becomes the trigger text)',
      },
      children: 'write the tabs in <void-tabs-list> and each panel as <void-tabs-content value="...">',
    },
    parts: [
      {
        tag: 'void-tabs-list',
        required: true,
        max: 1,
        children: 'parts',
        description: 'The row of tabs (role="tablist").',
        parts: [
          {
            tag: 'void-tabs-trigger',
            required: true,
            description: 'One tab; its text is the label. Selects the content with the same value.',
            attributes: [
              { name: 'value', type: 'string', description: 'Key of the tab: the `value` of the <void-tabs-content> it shows, and of <void-tabs> while it is selected.' },
              { name: 'disabled', type: 'boolean', description: 'Shown, but cannot be selected and is skipped by the arrow keys.' },
              {
                name: 'active',
                type: 'boolean',
                description: 'Set by <void-tabs> on the selected tab. Render it on the selected tab in server markup so the page looks right before the script loads.',
              },
            ],
          },
        ],
      },
      {
        tag: 'void-tabs-content',
        required: true,
        description: 'One panel (role="tabpanel"), shown while the tab with the same value is selected.',
        attributes: [
          { name: 'value', type: 'string', description: 'Key of the panel: the `value` of its <void-tabs-trigger>.' },
          {
            name: 'active',
            type: 'boolean',
            description: 'Set by <void-tabs> on the visible panel. Render it on the selected panel in server markup so the page looks right before the script loads.',
          },
        ],
      },
    ],
  },
  'void-card': {
    children: 'parts',
    ordered: true,
    skeleton:
      '<void-card><void-card-header><void-card-title>Title</void-card-title><void-card-description>One line.</void-card-description></void-card-header><void-card-body>...</void-card-body><void-card-footer>...</void-card-footer></void-card>',
    legacy: {
      attributes: { heading: 'write <void-card-header><void-card-title>...</void-card-title></void-card-header> as the first child' },
      children: 'put the content in <void-card-body>',
    },
    parts: [
      {
        tag: 'void-card-header',
        max: 1,
        children: 'any',
        description:
          'Top row of the card, divided from the body by a hairline: the title, an optional description, and anything that sits at the far end (a badge, void-actions).',
        parts: [
          { tag: 'void-card-title', max: 1, description: 'Title of the card.' },
          { tag: 'void-card-description', max: 1, description: 'One line under the title.' },
        ],
      },
      { tag: 'void-card-body', required: true, max: 1, description: "Content of the card, padded by the card's `padding`." },
      { tag: 'void-card-footer', max: 1, description: 'Bottom row of the card: actions or a summary line.' },
    ],
  },
  'void-alert': {
    children: 'parts',
    ordered: true,
    skeleton:
      '<void-alert color="warning"><void-alert-title>Title</void-alert-title><void-alert-description>What happened and what to do.</void-alert-description></void-alert>',
    legacy: { children: 'put the message in <void-alert-description> (and a short title in <void-alert-title> before it)' },
    parts: [
      { tag: 'void-alert-title', max: 1, description: 'Short title of the message.' },
      { tag: 'void-alert-description', required: true, max: 1, description: 'The message.' },
    ],
  },
  'void-accordion': {
    children: 'parts',
    skeleton:
      '<void-accordion><void-accordion-item open><void-accordion-trigger>Question</void-accordion-trigger><void-accordion-content>Answer</void-accordion-content></void-accordion-item></void-accordion>',
    parts: [
      {
        tag: 'void-accordion-item',
        required: true,
        children: 'parts',
        ordered: true,
        description: 'One collapsible item.',
        legacy: {
          attributes: {
            heading: 'write the heading as <void-accordion-trigger>...</void-accordion-trigger> and the content in <void-accordion-content> after it',
          },
          children: 'put the heading text in <void-accordion-trigger> and the content in <void-accordion-content>',
        },
        parts: [
          { tag: 'void-accordion-trigger', required: true, max: 1, description: 'Heading text of the item; becomes the button that opens and closes it.' },
          { tag: 'void-accordion-content', required: true, max: 1, description: 'Content shown while the item is open.' },
        ],
      },
    ],
  },
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
