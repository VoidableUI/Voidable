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
  { tag: 'void-list', from: 'void-list-item', events: ['void-click'] },
  { tag: 'void-menu', from: 'void-menu-item', events: ['void-select'] },
  { tag: 'void-menu-group', from: 'void-menu-item', events: ['void-select'] },
  { tag: 'void-dropdown-menu', from: 'void-dropdown-menu-item', events: ['void-select'] },
];

/**
 * Event detail types the plugin cannot infer statically, keyed by tag then
 * event. Used only where inference produced `unknown`.
 * @type {Record<string, Record<string, string>>}
 */
export const eventDetails = {
  // Re-dispatches the inner <void-calendar>'s `void-change` detail (`e.detail`).
  'void-date-picker': { 'void-change': '{ value: string; date: Date | null }' },
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
  // Inside the list part of either picker (#52): a void-option written straight into the picker is the old form.
  'void-option': ['void-combobox-content', 'void-multiselect-content'],
  'void-segmented-control-item': ['void-segmented-control'],
  // An item also sits inside a group (its parent part is the content, anywhere above it).
  'void-menu-item': ['void-menu-group'],
  'void-list-item': ['void-list'],
};

/**
 * Child tags a parent cannot work without. Checked once the page has settled
 * (children may render after the parent). Written to the declaration as
 * `voidRequires`.
 * @type {Record<string, string[]>}
 */
export const requiredChildren = {
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
  'void-select': {
    label: 'wrap the control in <void-field label="...">',
    name: 'put name on the native <select> inside: <void-select><select name="...">...</select></void-select>',
    required: 'put required on the native <select> inside: <void-select><select name="..." required>...</select></void-select>',
    disabled: 'put disabled on the native <select> inside: <void-select><select name="..." disabled>...</select></void-select>',
    multiple: 'put multiple on the native <select> inside, or use <void-multiselect>',
    autocomplete: 'put autocomplete on the native <select> inside',
    placeholder: 'write the prompt as the first option of the native <select>: <option value="" disabled selected hidden>Choose...</option>',
  },
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


const pickerParts = (tag, what, options) => ({
  children: 'parts',
  skeleton: `<${tag} name="${options.name}" placeholder="${options.placeholder}"><${tag}-content>${options.items}</${tag}-content></${tag}>`,
  legacy: { children: `put the <void-option>s in <${tag}-content>: <${tag}><${tag}-content><void-option value="a">A</void-option></${tag}-content></${tag}>` },
  parts: [
    {
      tag: `${tag}-content`,
      required: true,
      max: 1,
      children: 'any',
      description: `The option list (role="listbox"${what}) shown in the top layer under the ${tag === 'void-combobox' ? 'field' : 'trigger'}; holds the \`<void-option>\`s, which stay where they are.`,
      attributes: tag === 'void-combobox'
        ? [{ name: 'empty', type: 'boolean', description: 'Set by the combobox while no option matches the typed text; the theme then shows "No options found".' }]
        : [],
    },
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
                description: 'Set by the tabs on the selected tab. Render it on the selected tab in server markup so the page looks right before the script loads.',
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
      '<void-alert color="warning"><void-alert-title>Title</void-alert-title><void-alert-description>What happened and what to do.</void-alert-description><void-alert-close><button type="button" aria-label="Dismiss">&times;</button></void-alert-close></void-alert>',
    legacy: {
      attributes: { dismissible: 'add <void-alert-close><button type="button" aria-label="Dismiss">&times;</button></void-alert-close> as the last child; without it the alert is not dismissible' },
      children: 'put the message in <void-alert-description> (and a short title in <void-alert-title> before it)',
    },
    parts: [
      { tag: 'void-alert-title', max: 1, description: 'Short title of the message.' },
      { tag: 'void-alert-description', required: true, max: 1, description: 'The message.' },
      {
        tag: 'void-alert-close',
        max: 1,
        control: true,
        description: 'Wraps the one control that dismisses the alert (a <button aria-label="Dismiss">); pressing it fires void-close and removes the alert. Without it the alert cannot be dismissed.',
      },
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
  'void-collapsible': {
    children: 'parts',
    ordered: true,
    skeleton:
      '<void-collapsible open><void-collapsible-trigger>Advanced options</void-collapsible-trigger><void-collapsible-content>...</void-collapsible-content></void-collapsible>',
    legacy: {
      attributes: {
        heading: 'write the heading as <void-collapsible-trigger>...</void-collapsible-trigger> and the content in <void-collapsible-content> after it',
      },
      children: 'put the heading text in <void-collapsible-trigger> and the content in <void-collapsible-content>',
    },
    parts: [
      { tag: 'void-collapsible-trigger', required: true, max: 1, description: 'Heading text of the panel; becomes the button that opens and closes it.' },
      { tag: 'void-collapsible-content', required: true, max: 1, description: 'Content shown while the panel is open.' },
    ],
  },
  'void-panel': {
    children: 'parts',
    ordered: true,
    skeleton:
      '<void-panel variant="bordered"><void-panel-header><void-panel-title>Billing</void-panel-title><void-panel-description>One line.</void-panel-description></void-panel-header><void-panel-body>...</void-panel-body></void-panel>',
    legacy: {
      attributes: { label: 'write <void-panel-header><void-panel-title>...</void-panel-title></void-panel-header> as the first child; the title names the panel' },
      children: 'put the content in <void-panel-body>',
    },
    parts: [
      {
        tag: 'void-panel-header',
        max: 1,
        children: 'any',
        description: 'Top of the panel: the title, an optional description, and anything at the far end.',
        parts: [
          { tag: 'void-panel-title', max: 1, description: 'Title of the panel; it names the region.' },
          { tag: 'void-panel-description', max: 1, description: 'One line under the title.' },
        ],
      },
      { tag: 'void-panel-body', required: true, max: 1, description: 'Content of the panel.' },
    ],
  },
  'void-banner': {
    children: 'parts',
    ordered: true,
    skeleton:
      '<void-banner color="info"><void-banner-title>Maintenance</void-banner-title><void-banner-description>Saturday 02:00 to 04:00 UTC.</void-banner-description><void-banner-actions><void-button size="sm">Details</void-button></void-banner-actions><void-banner-close><button type="button" aria-label="Dismiss">&times;</button></void-banner-close></void-banner>',
    legacy: {
      attributes: { dismissable: 'add <void-banner-close><button type="button" aria-label="Dismiss">&times;</button></void-banner-close> as the last child; without it the banner is not dismissible' },
      children: 'put the message in <void-banner-description> (and a short title in <void-banner-title> before it)',
    },
    parts: [
      { tag: 'void-banner-title', max: 1, description: 'Short title of the announcement.' },
      { tag: 'void-banner-description', required: true, max: 1, description: 'The announcement.' },
      { tag: 'void-banner-actions', max: 1, description: 'Buttons or links for the announcement, at the trailing edge.' },
      {
        tag: 'void-banner-close',
        max: 1,
        control: true,
        description: 'Wraps the one control that dismisses the banner (a <button aria-label="Dismiss">); pressing it fires void-close and removes the banner. Without it the banner cannot be dismissed.',
      },
    ],
  },
  'void-toast': {
    children: 'parts',
    ordered: true,
    skeleton:
      '<void-toast color="success"><void-toast-title>Saved</void-toast-title><void-toast-description>Your changes were saved.</void-toast-description><void-toast-actions><void-button size="sm">Undo</void-button></void-toast-actions><void-toast-close><button type="button" aria-label="Dismiss">&times;</button></void-toast-close></void-toast>',
    legacy: {
      attributes: {
        heading: 'write the title as <void-toast-title>...</void-toast-title> before the description',
        dismissable: 'add <void-toast-close><button type="button" aria-label="Dismiss">&times;</button></void-toast-close> as the last child; without it the toast has no close button',
      },
      children: 'put the message in <void-toast-description> (and a short title in <void-toast-title> before it)',
    },
    parts: [
      { tag: 'void-toast-title', max: 1, description: 'Short title of the notification.' },
      { tag: 'void-toast-description', required: true, max: 1, description: 'The message.' },
      { tag: 'void-toast-actions', max: 1, description: 'Buttons for the notification, such as Undo.' },
      {
        tag: 'void-toast-close',
        max: 1,
        control: true,
        description: 'Wraps the one control that dismisses the toast (a <button aria-label="Dismiss">); pressing it fires void-close and removes the toast. Without it only the timer closes the toast.',
      },
    ],
  },
  'void-error-fallback': {
    children: 'parts',
    ordered: true,
    skeleton:
      '<void-error-fallback><void-error-fallback-title>Could not load invoices</void-error-fallback-title><void-error-fallback-description>The server did not respond.</void-error-fallback-description><void-error-fallback-actions><button type="button">Try again</button></void-error-fallback-actions></void-error-fallback>',
    legacy: {
      children: 'write the headline as <void-error-fallback-title>, the detail as <void-error-fallback-description> and buttons in <void-error-fallback-actions>',
    },
    parts: [
      { tag: 'void-error-fallback-title', max: 1, description: 'Headline. Without any part the component writes its own default headline (the heading attribute).' },
      { tag: 'void-error-fallback-description', max: 1, description: 'What failed or what to try.' },
      { tag: 'void-error-fallback-actions', max: 1, description: 'Buttons, such as a retry. Wire your own listener: void-retry comes only from the built-in default.' },
    ],
  },
  'void-nav-menu': {
    children: 'parts',
    skeleton:
      '<void-nav-menu><void-nav-menu-item><void-nav-menu-trigger><button type="button">Products</button></void-nav-menu-trigger><void-nav-menu-content><a href="/products/a">Product A</a></void-nav-menu-content></void-nav-menu-item><void-nav-menu-item current><void-nav-menu-trigger><a href="/docs">Docs</a></void-nav-menu-trigger></void-nav-menu-item></void-nav-menu>',
    legacy: { children: 'write each entry as <void-nav-menu-item> with a <void-nav-menu-trigger> around one <button> or <a href>' },
    parts: [
      {
        tag: 'void-nav-menu-item',
        required: true,
        children: 'parts',
        ordered: true,
        description: 'One entry of the menu bar: a trigger, and for a dropdown a content panel after it.',
        legacy: {
          attributes: { href: 'write the link as <void-nav-menu-trigger><a href="...">Label</a></void-nav-menu-trigger>' },
          children: 'put the label in <void-nav-menu-trigger> around a <button> (or an <a href>), and the dropdown in <void-nav-menu-content>',
        },
        parts: [
          {
            tag: 'void-nav-menu-trigger',
            required: true,
            max: 1,
            control: true,
            description:
              'Wraps the one element that is the entry: a <button> that opens a dropdown, or an <a href> that navigates; that element gets the menubar ARIA.',
          },
          { tag: 'void-nav-menu-content', max: 1, description: 'The dropdown panel (role="menu"), shown on hover, click or Enter on the trigger.' },
        ],
      },
    ],
  },
  'void-breadcrumbs': {
    children: 'parts',
    skeleton:
      '<void-breadcrumbs><void-breadcrumbs-list><void-breadcrumbs-item><a href="/">Home</a></void-breadcrumbs-item><void-breadcrumbs-item><a href="/docs">Docs</a></void-breadcrumbs-item><void-breadcrumbs-item aria-current="page">Page</void-breadcrumbs-item></void-breadcrumbs-list></void-breadcrumbs>',
    legacy: {
      children:
        'write one <void-breadcrumbs-list> and, in it, one <void-breadcrumbs-item> per crumb (a link, or text for the current page), with aria-current="page" on the current one',
    },
    parts: [
      {
        tag: 'void-breadcrumbs-list',
        required: true,
        max: 1,
        children: 'parts',
        description: 'The list of crumbs (role="list"): the navigation landmark holds a list, as the ARIA breadcrumb pattern has it.',
        legacy: { children: 'put each crumb in a <void-breadcrumbs-item>' },
        parts: [
          {
            tag: 'void-breadcrumbs-item',
            required: true,
            description:
              'One crumb (role="listitem"): a link, or the current page as text. Mark the current page with aria-current="page"; the theme draws the separators between items.',
          },
        ],
      },
    ],
  },
  'void-menu': {
    children: 'parts',
    ordered: true,
    skeleton:
      '<void-menu open><void-menu-search><input type="search" placeholder="Search..." aria-label="Search"></void-menu-search><void-menu-content><void-menu-item value="new">New</void-menu-item></void-menu-content></void-menu>',
    legacy: {
      attributes: {
        searchable: 'write a <void-menu-search> around an <input type="search"> before the content',
        placeholder: 'write placeholder and aria-label on the input inside <void-menu-search>',
      },
      children: 'put the items and groups in <void-menu-content>',
    },
    parts: [
      {
        tag: 'void-menu-search',
        max: 1,
        control: true,
        description: 'Wraps the one text field (an <input type="search">) that filters the items as the user types; present means the menu is searchable.',
      },
      {
        tag: 'void-menu-content',
        required: true,
        max: 1,
        children: 'parts',
        description: 'The list (role="menu"): the items, and groups of items.',
        parts: [
          { tag: 'void-menu-item', description: 'One action of the menu.' },
          { tag: 'void-menu-group', description: 'A labelled group of items.' },
        ],
      },
      {
        tag: 'void-menu-empty',
        max: 1,
        description: 'Shown instead of the default "No results found" while a search matches no item.',
      },
    ],
  },
  'void-menu-item': {
    children: 'any',
    ordered: true,
    skeleton:
      '<void-menu-item value="save"><void-menu-item-icon>+</void-menu-item-icon>Save<void-menu-item-shortcut>Ctrl+S</void-menu-item-shortcut></void-menu-item>',
    legacy: {
      attributes: {
        icon: 'write <void-menu-item-icon>...</void-menu-item-icon> first in the item',
        shortcut: 'write <void-menu-item-shortcut>Ctrl+S</void-menu-item-shortcut> last in the item',
      },
    },
    parts: [
      { tag: 'void-menu-item-icon', max: 1, description: 'A glyph or icon before the label; decorative (add aria-hidden="true").' },
      { tag: 'void-menu-item-shortcut', max: 1, description: 'Text at the end of the row that advertises a keyboard shortcut. Display only: it does not bind the key.' },
    ],
  },
  'void-menu-group': {
    children: 'any',
    skeleton:
      '<void-menu-group><void-menu-group-label>File</void-menu-group-label><void-menu-item value="new">New</void-menu-item></void-menu-group>',
    legacy: { attributes: { label: 'write the heading as <void-menu-group-label>...</void-menu-group-label> first in the group' } },
    parts: [{ tag: 'void-menu-group-label', max: 1, description: 'Heading of the group; names it for assistive technology.' }],
  },
  'void-table': {
    children: 'any',
    skeleton:
      '<void-table selectable filter-columns="name" aria-label="Team"><void-table-filter><input type="search" aria-label="Filter team"></void-table-filter><table><thead><tr><th data-stack="select"><void-checkbox></void-checkbox></th><th data-key="name" data-sort>Name</th><th data-key="seats" data-sort="number" data-align="end">Seats</th></tr></thead><tbody><tr data-value="ada"><td><void-checkbox aria-label="Select Ada"></void-checkbox></td><td>Ada</td><td>4</td></tr></tbody></table><void-table-empty hidden>No one matches.</void-table-empty><void-table-selection hidden><span data-count></span> selected<void-button size="sm">Remove</void-button></void-table-selection></void-table>',
    parts: [
      { tag: 'void-table-filter', max: 1, children: 'any', description: 'Holds the native search input (or a void-input) that filters the rows; typing is debounced. Place it anywhere inside the void-table.' },
      { tag: 'void-table-empty', max: 1, children: 'any', description: 'Shown (the component removes `hidden`) while the filter matches no row. Write it with `hidden`.' },
      {
        tag: 'void-table-selection',
        max: 1,
        children: 'any',
        description:
          'Shown while any row is selected; holds the bulk actions. An element with `data-count` inside it receives the number of selected rows. Write it with `hidden`.',
      },
      {
        tag: 'void-table-select-all',
        max: 1,
        children: 'any',
        description:
          'With `total-rows` greater than the rows present, shown when select-all is checked; a button inside it ("Select all 1,250 rows") sets `all-selected` and fires void-change with `all: true`. Write it with `hidden`.',
      },
    ],
  },
  'void-carousel': {
    children: 'parts',
    ordered: true,
    skeleton:
      '<void-carousel aria-label="Slides"><void-carousel-content><void-carousel-item>One</void-carousel-item><void-carousel-item>Two</void-carousel-item></void-carousel-content><void-carousel-previous aria-label="Previous slide"></void-carousel-previous><void-carousel-next aria-label="Next slide"></void-carousel-next><void-carousel-indicators></void-carousel-indicators></void-carousel>',
    legacy: {
      attributes: {
        controls: 'write <void-carousel-previous aria-label="Previous slide"></void-carousel-previous> and <void-carousel-next aria-label="Next slide"></void-carousel-next> after the content; leave them out for no arrows',
        indicators: 'write an empty <void-carousel-indicators></void-carousel-indicators> after the content; leave it out for no dots',
      },
      tags: {
        'void-carousel-slide': 'write each slide as <void-carousel-item> inside <void-carousel-content>',
      },
      children: 'put the slides in <void-carousel-content> as <void-carousel-item>',
    },
    parts: [
      {
        tag: 'void-carousel-content',
        required: true,
        max: 1,
        children: 'parts',
        description: 'The window the slides move in.',
        parts: [
          {
            tag: 'void-carousel-item',
            required: true,
            description: 'One slide (role="group"); the carousel marks the slide being shown with active.',
            attributes: [
              { name: 'active', type: 'boolean', description: 'Set by the carousel on the slide being shown.' },
            ],
          },
        ],
      },
      { tag: 'void-carousel-previous', max: 1, description: 'Arrow button to the previous slide. Empty, it shows the theme arrow; give it an aria-label.' },
      { tag: 'void-carousel-next', max: 1, description: 'Arrow button to the next slide. Empty, it shows the theme arrow; give it an aria-label.' },
      {
        tag: 'void-carousel-indicators',
        max: 1,
        children: 'any',
        description: 'Leave it empty: the carousel fills it with one dot button per slide.',
      },
    ],
  },
  'void-combobox': pickerParts('void-combobox', '', {
    name: 'country',
    placeholder: 'Search countries',
    items: '<void-option value="de">Germany</void-option><void-option value="fr">France</void-option>',
  }),
  'void-multiselect': pickerParts('void-multiselect', ', aria-multiselectable', {
    name: 'skills',
    placeholder: 'Choose skills',
    items: '<void-option value="js" selected>JavaScript</void-option><void-option value="go">Go</void-option>',
  }),
};

/**
 * Components that enhance a native control the author writes inside them
 * (#52): the control is the final DOM and carries the form attributes.
 * Written to the declaration as `voidNative`: `tag` is the native element that
 * must be inside, `fix` the correct markup, quoted by `voidable check` and the
 * development warnings when it is missing (the old form, options written
 * straight into the component).
 * @type {Record<string, { tag: string, fix: string }>}
 */
export const nativeControls = {
  'void-select': {
    tag: 'select',
    fix: 'write a native <select> (with the name and the options) inside: <void-select><select name="plan"><option value="free">Free</option><option value="pro">Pro</option></select></void-select>',
  },
};

/**
 * Attributes a parent writes onto its children. They are state, not API, so they
 * are not declared attributes, but a validator must not report them. Merged into
 * the declaration's `voidHostAttributes` with the ones components set on
 * themselves. (A parent writing onto a CSS-only part declares the attribute on
 * the part instead, as `active` on a tabs trigger.)
 * @type {Record<string, string[]>}
 */
export const parentSetAttributes = {
  // combobox.ts and multiselect.ts mark the highlighted option (aria-activedescendant).
  'void-option': ['active'],
};

// Shorthands for the entries below.
const ARIA = ['aria-label', 'aria-labelledby', 'title'];
const FIELD = [{ tag: 'void-field', attributes: ['label'] }, { tag: 'label' }];
const control = (extra = []) => ({
  attributes: [...ARIA, ...extra],
  ancestors: FIELD,
  hint: 'wrap it in <void-field label="..."> or give it aria-label',
});
const choice = () => ({
  attributes: ARIA,
  content: true,
  ancestors: FIELD,
  hint: 'put its label text inside it, or give it aria-label',
});
const group = (extra = []) => ({
  attributes: [...ARIA, ...extra],
  ancestors: FIELD,
  hint: 'give the group a label or aria-label',
});
/**
 * Components that must have an accessible name, and what supplies one. Read by
 * the `voidable check` tool (rule `missing-name`) and by the `@voidable/ui/dev`
 * runtime warnings, which both report an element none of these gives a name.
 * Written to the declaration as `voidName`.
 *
 * Per tag:
 *   attributes  attributes of the element itself that name it (a non-empty
 *               value, or a dynamic one, counts). `aria-label`,
 *               `aria-labelledby` and `title` are always welcome; list the
 *               component's own (`label`, `heading`, `alt`) too.
 *   content     true when the element's own text (or an icon with a name)
 *               names it, as a button's label does.
 *   parts       descendant part elements whose presence names it (a dialog's
 *               title); the live-DOM dev warning also wants the part to hold text.
 *   ancestors   enclosing elements that name it: `{ tag, attributes }` is
 *               satisfied by an ancestor with that tag carrying one of the
 *               attributes (none listed: the ancestor alone is enough). `label`
 *               is the native element.
 *   hint        what to do, in one sentence, appended to the message.
 * @type {Record<string, { attributes: string[], content?: boolean, parts?: string[], ancestors?: { tag: string, attributes?: string[] }[], hint: string }>}
 */
export const accessibleName = {
  'void-button': { attributes: ARIA, content: true, hint: 'an icon-only button needs an aria-label' },
  'void-toggle': { attributes: ARIA, content: true, hint: 'an icon-only toggle needs an aria-label' },
  'void-switch': choice(),
  'void-checkbox': choice(),
  'void-radio': choice(),
  'void-input': control(),
  'void-textarea': control(),
  'void-select': control(),
  'void-slider': control(),
  'void-number-input': control(['label']),
  'void-combobox': control(),
  // Its placeholder is the name of the control it renders (multiselect.ts).
  'void-multiselect': control(['placeholder']),
  'void-pin-input': control(),
  'void-tags-input': control(),
  'void-date-picker': control(),
  'void-color-picker': control(),
  'void-file-upload': control(),
  // Its placeholder is the name of the input it renders (action-input.ts).
  'void-action-input': control(['placeholder']),
  'void-compose-input': control(),
  // A progress bar says how far, not of what: it is named by aria-label (or a void-field label around it).
  'void-progress': { ...control(), hint: 'say what is progressing: aria-label="Uploading photo"' },
  // The name of a region and of a table says what it holds; a carousel and a hamburger have no text of their own.
  'void-carousel': { attributes: ARIA, hint: 'say what it shows: aria-label="Product photos"' },
  'void-panel': { attributes: ARIA, parts: ['void-panel-title'], hint: 'write its title as <void-panel-header><void-panel-title>, or give it an aria-label' },
  'void-table': { attributes: [...ARIA, 'label'], parts: ['caption'], hint: 'write a <caption> in the table, or give the void-table an aria-label' },
  'void-hamburger': { attributes: ARIA, hint: 'say what it opens: aria-label="Main navigation"' },
  'void-radio-group': group(['label']),
  'void-checkbox-group': group(['label']),
  // Named by its title part (#52), which is its own child; the native <dialog> in its shadow root is labelled by it.
  'void-dialog': { attributes: ARIA, parts: ['void-dialog-title'], hint: 'write its title as <void-dialog-title>' },
  'void-drawer': { attributes: ARIA, parts: ['void-drawer-title'], hint: 'write its title as <void-drawer-title>' },
  'void-carousel-previous': { attributes: ARIA, content: true, hint: 'give it aria-label="Previous slide"' },
  'void-carousel-next': { attributes: ARIA, content: true, hint: 'give it aria-label="Next slide"' },
  'void-avatar': { attributes: [...ARIA, 'alt', 'initials'], hint: 'set alt to the person\'s name (or initials)' },
};

/**
 * API normalisation (#23): attributes, attribute values and events that were
 * renamed or removed in 0.8, with the form to write instead. The rules they
 * follow are "API conventions" in AGENTS.md and the API conventions guide. The
 * manifest plugin writes each entry to the declaration as `voidRenamed` (and
 * fails when an old attribute or event still exists, or a renamed value is
 * still allowed); `@voidable/ui/dev` and `voidable check` report every old form
 * with its replacement (rule `legacy-markup`). Never remove an entry: an
 * application that upgrades later still gets told what to write.
 *
 *   attributes  old attribute -> { to, values, fix }. `to`: the new attribute,
 *               written with the same value; `values`: the replacement markup
 *               for one old value (key `''` is the attribute written with no
 *               value); `fix`: what to do when neither applies.
 *   values      attribute -> { old value -> new value }.
 *   events      old event name -> what to listen for instead.
 *   since       the release a rename was made in, for what `voidable check` prints ("was renamed in 0.10"):
 *               { attributes?, values?, events? }, each mapping a name (attribute, attribute with renamed
 *               values, event) to a release such as '0.10'. Anything not listed is '0.8', where this table began.
 * @type {Record<string, { attributes?: Record<string, { to?: string, values?: Record<string, string>, fix?: string }>, values?: Record<string, Record<string, string>>, events?: Record<string, string>, since?: { attributes?: Record<string, string>, values?: Record<string, string>, events?: Record<string, string> } }>}
 */
const OPEN_CLOSE = 'listen for void-open and void-close on the element itself (they do not bubble; detail.reason says why)';
const SIDES = ['top', 'right', 'bottom', 'left'];
/** position -> side, and the combined values (`bottom-end`) -> side plus align. */
const SIDE_OF = () => ({
  to: 'side',
  values: Object.fromEntries(
    SIDES.flatMap((side) => ['start', 'center', 'end'].map((align) => [`${side}-${align}`, `side="${side}" align="${align}"`])),
  ),
});
const START_END = { left: 'side="start"', right: 'side="end"' };
const START_END_ICON = { left: 'icon-side="start"', right: 'icon-side="end"' };
/** A default-true boolean replaced by its hide-* inverse. */
const INVERTED = (to) => ({
  values: { false: to, true: 'nothing (remove the attribute: it is the default)' },
  fix: `remove it (it is the default); write ${to} to turn it off`,
});
export const renamed = {
  // Events (#23): void-toggle is gone wherever the state is `open`; every dismissal is a non-bubbling void-close.
  'void-hamburger': {
    attributes: { active: { to: 'open' } },
    events: { 'void-toggle': OPEN_CLOSE },
  },
  'void-collapsible': { events: { 'void-toggle': OPEN_CLOSE } },
  'void-accordion-item': { events: { 'void-toggle': OPEN_CLOSE } },
  'void-accordion': { events: { 'void-toggle': 'listen for void-open and void-close on each <void-accordion-item> (they do not bubble; or listen on the accordion in the capture phase)' } },
  'void-alert': { events: { 'void-dismiss': 'listen for void-close on the alert itself (it does not bubble; detail.reason is close-button)' } },
  'void-sidebar': {
    attributes: { position: { to: 'side', values: START_END } },
    values: { side: { left: 'start', right: 'end' } },
    since: { values: { side: '0.10' } },
    events: { 'void-toggle': 'listen for void-collapse and void-expand on the sidebar (they do not bubble)' },
  },
  'void-toast-container': {
    attributes: { position: { to: 'placement' } },
    events: { 'void-close': 'listen for void-close on the <void-toast> itself (it does not bubble; detail.reason is close-button, timeout or api)' },
  },
  // Placement: `side` is the side of the anchor or the edge of the page, `align` the alignment along it,
  // `placement` a corner or region of the viewport; no attribute is called `position`.
  'void-popover': { attributes: { position: SIDE_OF() } },
  'void-tooltip': { attributes: { position: SIDE_OF() } },
  'void-hover-card': { attributes: { position: SIDE_OF() } },
  'void-dropdown-menu': { attributes: { position: SIDE_OF() } },
  'void-indicator': { attributes: { position: { to: 'placement' } } },
  'void-action-input': {
    attributes: { position: { to: 'icon-side', values: START_END_ICON }, 'tooltip-position': { to: 'tooltip-side' } },
    values: { 'icon-side': { left: 'start', right: 'end' } },
    since: { values: { 'icon-side': '0.10' } },
  },
  'void-scroll-area': { attributes: { direction: { to: 'orientation' } } },
  // State: an index into a sequence without keys; the current item of a navigation.
  'void-carousel': { attributes: { active: { to: 'index' } } },
  'void-nav-menu-item': { attributes: { active: { to: 'current' } } },
  // show-value, singular, everywhere; a number setting is a number.
  'void-bar-chart': { attributes: { 'show-values': { to: 'show-value' } }, values: { stagger: { false: '0' } } },
  'void-donut-chart': { attributes: { 'show-values': { to: 'show-value' } } },
  'void-line-chart': { attributes: { 'show-values': { to: 'show-value' } } },
  // No attribute defaults to true: what is shown by default is turned off with hide-*.
  'void-gauge': {
    attributes: { 'show-value': INVERTED('hide-value'), 'tick-min': INVERTED('hide-tick-min'), 'tick-max': INVERTED('hide-tick-max') },
  },
  'void-color-picker': {
    attributes: {
      'show-input': INVERTED('hide-input'),
      variant: { values: { compact: 'compact', default: 'nothing (remove the attribute: the full picker is the default)' }, fix: 'write compact for the swatch button, nothing for the full picker' },
    },
  },
  'void-error-fallback': { attributes: { icon: INVERTED('hide-icon') } },
  'void-nav-bar': { attributes: { bordered: INVERTED('hide-border') } },
  'void-dialog': { attributes: { closable: INVERTED('hide-close') } },
  'void-drawer': { attributes: { closable: INVERTED('hide-close') } },
  // One meaning per word: variant is a drawing treatment; a skeleton's form is its shape.
  'void-skeleton': { attributes: { variant: { to: 'shape' } } },
};
