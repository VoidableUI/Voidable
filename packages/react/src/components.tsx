'use client';

import React, { forwardRef, useCallback, useEffect, useLayoutEffect, useRef } from 'react';

// Registers every `<void-*>` custom element (idempotent `customElements.define`
// guards live in the core package). See README "Element registration".
import '@voidable/ui';

import type {
  VoidBadge,
  VoidButton,
  VoidDivider,
  VoidSpinner,
  VoidSkeleton,
  VoidStatusDot,
  VoidSwitch,
  VoidAvatar,
  VoidAlert,
  VoidTag,
  VoidProgress,
  VoidPanel,
  VoidInput,
  VoidTextarea,
  VoidSelect,
  VoidCheckbox,
  VoidRadio,
  VoidRadioGroup,
  VoidField,
  VoidMultiselect,
  VoidOption,
  VoidDialog,
  VoidTabs,
  VoidAccordion,
  VoidAccordionItem,
  VoidBreadcrumbs,
  VoidList,
  VoidListItem,
  VoidToast,
  VoidToastContainer,
  VoidStepper,
  VoidDrawer,
  VoidCard,
  VoidPopover,
  VoidTooltip,
  VoidBanner,
  VoidScrollArea,
  VoidTable,
  VoidPagination,
  VoidErrorFallback,
  VoidCheckboxGroup,
  VoidCombobox,
  VoidSlider,
  VoidFileUpload,
  VoidNavBar,
  VoidHamburger,
  VoidComposeInput,
  VoidSidebar,
  VoidDropdownMenu,
  VoidDropdownMenuItem,
  VoidToggle,
  VoidSegmentedControl,
  VoidSegmentedControlItem,
  VoidStat,
  VoidIndicator,
  VoidMenu,
  VoidMenuItem,
  VoidMenuGroup,
  VoidCarousel,
  VoidCarouselPrevious,
  VoidCarouselNext,
  VoidCalendar,
  VoidDatePicker,
  VoidNumberInput,
  VoidToggleGroup,
  VoidCollapsible,
  VoidEditable,
  VoidHoverCard,
  VoidPinInput,
  VoidTagsInput,
  VoidNavMenu,
  VoidNavMenuItem,
  VoidColorPicker,
  VoidActionInput,
  VoidBarChart,
  VoidLineChart,
  VoidDonutChart,
  VoidGauge,
  BarChartData,
  LineChartData,
  DonutChartData,
  GaugeData,
  GaugeZone,
} from '@voidable/ui';

export type { BarChartData, LineChartData, DonutChartData, GaugeData, GaugeZone };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TagValue = string | { text: string; color?: string };

/** Why an overlay opened (`void-open` detail). */
export type OverlayOpenReason = 'trigger' | 'keyboard' | 'hover' | 'focus' | 'api';
/**
 * Why an overlay closed (`void-close` detail). A close the user caused (`escape`, `outside`, `blur`,
 * `trigger`, `close-button`, `select`, `hover`) can be cancelled with `event.preventDefault()`.
 */
export type OverlayCloseReason =
  | 'escape' | 'outside' | 'blur' | 'trigger' | 'close-button' | 'select' | 'hover' | 'form' | 'parent' | 'api';
/** The `void-open` / `void-close` pair every overlay fires (on the element itself; they do not bubble). */
type OverlayEvents = { Open: { reason: OverlayOpenReason }; Close: { reason: OverlayCloseReason } };

/**
 * Typed `onVoid*` props. Keys are the PascalCase custom-event suffix
 * (`Change` -> `onVoidChange` -> `void-change`), values are the `detail`
 * payload the core component dispatches (`null` when it dispatches no detail).
 */
export type VoidEvents<M> = {
  [K in keyof M & string as `onVoid${K}`]?: (event: CustomEvent<M[K]>) => void;
};

type VoidProps<P = object> = P &
  Omit<React.HTMLAttributes<HTMLElement>, keyof P> & {
    children?: React.ReactNode;
  };

// ---------------------------------------------------------------------------
// Prop routing
//
// React 18 writes every prop on a custom element as an attribute; React 19
// writes it as a property when the element has one. To behave identically on
// both we decide ourselves:
//   - `onVoid*`            -> addEventListener
//   - booleans, objects,
//     arrays, functions,
//     null, camelCase keys -> element properties, set in a layout effect.
//                             Lit's Boolean converter reads any present
//                             attribute (even "false") as true, arrays and
//                             objects would stringify, and camelCase keys
//                             like `firstDay` would become `firstday`
//                             instead of the `first-day` attribute.
//   - lowercase strings
//     and numbers          -> normal attributes (SSR friendly, selectors like
//                             void-button[variant] match before hydration)
//   - className            -> `class`
//   - ARIA/data/global
//     attributes, DOM
//     handlers (onClick)   -> passed to React untouched.
// ---------------------------------------------------------------------------

const PASSTHROUGH = new Set([
  'children', 'style', 'id', 'slot', 'title', 'role', 'hidden', 'tabIndex',
  'lang', 'dir', 'draggable', 'part', 'class', 'className',
  'suppressHydrationWarning', 'suppressContentEditableWarning',
]);

function isEventProp(key: string): boolean {
  return /^onVoid[A-Z]/.test(key);
}

function isPassthrough(key: string): boolean {
  return (
    PASSTHROUGH.has(key) ||
    key.startsWith('data-') ||
    key.startsWith('aria-') ||
    (/^on[A-Z]/.test(key) && !isEventProp(key))
  );
}

/** "onVoidChange" -> "void-change", "onVoidTabClick" -> "void-tab-click" */
function toEventName(prop: string): string {
  return prop
    .slice(2)
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '');
}

function toKebab(key: string): string {
  return key.replace(/([A-Z])/g, '-$1').toLowerCase();
}

function isPrimitiveAttr(value: unknown): value is string | number {
  return typeof value === 'string' || typeof value === 'number';
}

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface SplitProps {
  /** Props handed to React.createElement. */
  react: Record<string, unknown>;
  /** Props set on the element instance. */
  elementProps: Record<string, unknown>;
  /** `void-*` listeners keyed by event name. */
  events: Record<string, EventListener>;
}

function splitProps(props: Record<string, unknown>): SplitProps {
  const react: Record<string, unknown> = {};
  const elementProps: Record<string, unknown> = {};
  const events: Record<string, EventListener> = {};

  for (const key of Object.keys(props)) {
    const value = props[key];
    if (isEventProp(key)) {
      if (typeof value === 'function') events[toEventName(key)] = value as EventListener;
    } else if (key === 'className') {
      if (value != null) react['class'] = value;
    } else if (isPassthrough(key)) {
      react[key] = value;
    } else if (value === undefined) {
      continue;
    } else if (isPrimitiveAttr(value) && key === key.toLowerCase()) {
      react[key] = value;
    } else {
      elementProps[key] = value;
    }
  }
  return { react, elementProps, events };
}

function applyProp(el: HTMLElement, key: string, value: unknown): void {
  if (key in el) {
    (el as unknown as Record<string, unknown>)[key] = value;
    return;
  }
  // Element not upgraded (registration failed or not yet defined): fall back
  // to an attribute so the value is not lost.
  const attr = toKebab(key);
  if (value === false || value == null) el.removeAttribute(attr);
  else if (value === true) el.setAttribute(attr, '');
  else if (isPrimitiveAttr(value)) el.setAttribute(attr, String(value));
}

// ---------------------------------------------------------------------------
// useWcProps — set non-attribute props and bind `void-*` listeners
// ---------------------------------------------------------------------------

function useWcProps<E extends HTMLElement>(
  ref: React.RefObject<E | null>,
  elementProps: Record<string, unknown>,
  events: Record<string, EventListener>,
): void {
  const appliedProps = useRef<Record<string, unknown>>({});
  const appliedEvents = useRef<Record<string, EventListener>>({});

  // No deps array: compare against the last applied value each commit, so a
  // user-edited property (e.g. an input's value) is only overwritten when the
  // React prop itself changed.
  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prev = appliedProps.current;
    for (const key of Object.keys(elementProps)) {
      if (!(key in prev) || !Object.is(prev[key], elementProps[key])) {
        applyProp(el, key, elementProps[key]);
      }
    }
    appliedProps.current = elementProps;

    const prevEvents = appliedEvents.current;
    for (const name of Object.keys(prevEvents)) {
      if (prevEvents[name] !== events[name]) el.removeEventListener(name, prevEvents[name]);
    }
    for (const name of Object.keys(events)) {
      if (prevEvents[name] !== events[name]) el.addEventListener(name, events[name]);
    }
    appliedEvents.current = events;
  });

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    return () => {
      if (!el) return;
      for (const name of Object.keys(appliedEvents.current)) {
        el.removeEventListener(name, appliedEvents.current[name]);
      }
      appliedEvents.current = {};
      appliedProps.current = {};
    };
  }, [ref]);
}

// ---------------------------------------------------------------------------
// wrapWc — factory creating forwardRef React components
// ---------------------------------------------------------------------------

function wrapWc<E extends HTMLElement, P = object>(
  tag: string,
  displayName: string,
) {
  const Wrapped = forwardRef<E, VoidProps<P>>((props, externalRef) => {
    const innerRef = useRef<E | null>(null);

    const { react, elementProps, events } = splitProps(props as Record<string, unknown>);
    useWcProps(innerRef, elementProps, events);

    const setRef = useCallback(
      (el: E | null) => {
        innerRef.current = el;
        if (typeof externalRef === 'function') {
          externalRef(el);
        } else if (externalRef) {
          (externalRef as React.MutableRefObject<E | null>).current = el;
        }
      },
      [externalRef],
    );

    return React.createElement(tag, { ...react, ref: setRef });
  });

  Wrapped.displayName = displayName;
  return Wrapped;
}

// ---------------------------------------------------------------------------
// Component exports
// ---------------------------------------------------------------------------

export const Badge = wrapWc<VoidBadge, {
  color?: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight';
  size?: 'sm' | 'md' | 'lg';
}>('void-badge', 'Badge');

export const Button = wrapWc<VoidButton, {
  variant?: 'outline' | 'filled' | 'ghost';
  color?: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  size?: 'sm' | 'md' | 'lg';
} & VoidEvents<{ Click: null }>>('void-button', 'Button');

export const Divider = wrapWc<VoidDivider, {
  label?: string;
  orientation?: 'horizontal' | 'vertical';
}>('void-divider', 'Divider');

export const Spinner = wrapWc<VoidSpinner, {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}>('void-spinner', 'Spinner');

export const Skeleton = wrapWc<VoidSkeleton, {
  variant?: 'text' | 'circular' | 'rectangular';
}>('void-skeleton', 'Skeleton');

export const StatusDot = wrapWc<VoidStatusDot, {
  status?: 'online' | 'away' | 'offline';
}>('void-status-dot', 'StatusDot');

export const Switch = wrapWc<VoidSwitch, {
  checked?: boolean;
  disabled?: boolean;
  color?: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight';
  size?: 'sm' | 'md' | 'lg';
  /** Form field name; the value is submitted under it. */
  name?: string;
  /** Form validation: the control must have a value. */
  required?: boolean;
  /** Submitted value when checked (default "on"). */
  value?: string;
} & VoidEvents<{ Change: { checked: boolean } }>>('void-switch', 'Switch');

export const Avatar = wrapWc<VoidAvatar, {
  src?: string;
  alt?: string;
  initials?: string;
  size?: 'sm' | 'md' | 'lg';
}>('void-avatar', 'Avatar');

export const Alert = wrapWc<VoidAlert, {
  color?: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight';
  variant?: 'subtle' | 'filled';
} & VoidEvents<{ Close: null }>>('void-alert', 'Alert');

export const Tag = wrapWc<VoidTag, {
  color?: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight';
  removable?: boolean;
  size?: 'sm' | 'md' | 'lg';
} & VoidEvents<{ Remove: null }>>('void-tag', 'Tag');

export const Progress = wrapWc<VoidProgress, {
  value?: number;
  max?: number;
  color?: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight';
  size?: 'sm' | 'md' | 'lg';
  indeterminate?: boolean;
}>('void-progress', 'Progress');

export const Panel = wrapWc<VoidPanel, {
  variant?: 'default' | 'bordered' | 'elevated';
}>('void-panel', 'Panel');

export const Input = wrapWc<VoidInput, {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'date' | 'datetime-local' | 'month' | 'time' | 'week';
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  error?: string;
  /** Autofill hint for the native control, e.g. `current-password`. */
  autocomplete?: string;
  minlength?: number;
  maxlength?: number;
  pattern?: string;
  inputMode?: '' | 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url';
  enterKeyHint?: '' | 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send';
  autocapitalize?: '' | 'off' | 'none' | 'on' | 'sentences' | 'words' | 'characters';
  /** Defaults to true; pass `false` to turn spell checking off. */
  spellcheck?: boolean;
} & VoidEvents<{ Input: { value: string }; Change: { value: string } }>>('void-input', 'Input');

export const Textarea = wrapWc<VoidTextarea, {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
  name?: string;
  rows?: number;
  resize?: 'none' | 'vertical' | 'both';
  size?: 'sm' | 'md' | 'lg';
  error?: string;
  /** Autofill hint for the native control, e.g. `current-password`. */
  autocomplete?: string;
  minlength?: number;
  maxlength?: number;
  inputMode?: '' | 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url';
  enterKeyHint?: '' | 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send';
  autocapitalize?: '' | 'off' | 'none' | 'on' | 'sentences' | 'words' | 'characters';
  /** Defaults to true; pass `false` to turn spell checking off. */
  spellcheck?: boolean;
} & VoidEvents<{ Input: { value: string }; Change: { value: string } }>>('void-textarea', 'Textarea');

/**
 * Wraps a native `<select>` the author writes inside it, with the form attributes (`name`, `required`,
 * `disabled`) on that select: `<Select><select name="plan">...</select></Select>`.
 */
export const Select = wrapWc<VoidSelect, {
  value?: string;
  size?: 'sm' | 'md' | 'lg';
  error?: string;
} & VoidEvents<{ Change: { value: string } }>>('void-select', 'Select');

export const Checkbox = wrapWc<VoidCheckbox, {
  checked?: boolean;
  disabled?: boolean;
  indeterminate?: boolean;
  name?: string;
  value?: string;
  color?: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight';
  size?: 'sm' | 'md' | 'lg';
  /** Form validation: the control must have a value. */
  required?: boolean;
} & VoidEvents<{ Change: { checked: boolean } }>>('void-checkbox', 'Checkbox');

export const Radio = wrapWc<VoidRadio, {
  checked?: boolean;
  disabled?: boolean;
  name?: string;
  value?: string;
  color?: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight';
  size?: 'sm' | 'md' | 'lg';
  /** Form validation: the control must have a value. */
  required?: boolean;
} & VoidEvents<{ Change: { value: string; checked: boolean } }>>('void-radio', 'Radio');

export const RadioGroup = wrapWc<VoidRadioGroup, {
  label?: string;
  value?: string;
  name?: string;
  orientation?: 'vertical' | 'horizontal';
  /** One of the radios must be checked. */
  required?: boolean;
  /** Disables every radio in the group. */
  disabled?: boolean;
} & VoidEvents<{ Change: { value: string } }>>('void-radio-group', 'RadioGroup');

export const Field = wrapWc<VoidField, {
  label?: string;
  error?: string;
  helper?: string;
  required?: boolean;
}>('void-field', 'Field');

export const Multiselect = wrapWc<VoidMultiselect, {
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  error?: string;
  name?: string;
  /** Form validation: the control must have a value. */
  required?: boolean;
  /** The selected option values. */
  value?: string[];
  /** Whether the option list is showing. */
  open?: boolean;
} & VoidEvents<{ Change: { values: string[] } } & OverlayEvents>>('void-multiselect', 'Multiselect');

/** One option of a `<Combobox>` or `<Multiselect>`, inside its `<ComboboxContent>` / `<MultiselectContent>`. */
export const Option = wrapWc<VoidOption, {
  value?: string;
  selected?: boolean;
  /** Listed but cannot be highlighted or chosen. */
  disabled?: boolean;
  /** Text shown once chosen, when the content is more than plain text. */
  label?: string;
}>('void-option', 'Option');

/**
 * A modal dialog (native `<dialog>` opened with `showModal()`). For a controlled dialog, keep `open` in
 * state and set it to false in `onVoidClose`; call `event.preventDefault()` there to keep it open.
 * Its regions are parts:
 *
 * ```tsx
 * <Dialog open={open} onVoidClose={() => setOpen(false)}>
 *   <DialogTitle>Delete file?</DialogTitle>
 *   <DialogBody>This cannot be undone.</DialogBody>
 *   <DialogActions><Button>Cancel</Button><Button color="error">Delete</Button></DialogActions>
 * </Dialog>
 * ```
 */
export const Dialog = wrapWc<VoidDialog, {
  open?: boolean;
  size?: 'sm' | 'md' | 'lg';
  closable?: boolean;
} & VoidEvents<OverlayEvents>>('void-dialog', 'Dialog');

export const Tabs = wrapWc<VoidTabs, {
  value?: string;
  size?: 'sm' | 'md' | 'lg';
  /** `manual` (default): Enter or Space select the focused tab; `auto`: arrow keys select it. */
  activation?: 'manual' | 'auto';
} & VoidEvents<{ Change: { value: string } }>>('void-tabs', 'Tabs');

export const Accordion = wrapWc<VoidAccordion, {
  multiple?: boolean;
}>('void-accordion', 'Accordion');

/** One item: an `<AccordionTrigger>` (the heading text) followed by an `<AccordionContent>`. */
export const AccordionItem = wrapWc<VoidAccordionItem, {
  open?: boolean;
} & VoidEvents<{ Toggle: { open: boolean } }>>('void-accordion-item', 'AccordionItem');

export const Breadcrumbs = wrapWc<VoidBreadcrumbs, {
  separator?: string;
}>('void-breadcrumbs', 'Breadcrumbs');

export const List = wrapWc<VoidList, {
  dividers?: boolean;
}>('void-list', 'List');

export const ListItem = wrapWc<VoidListItem, {
  selected?: boolean;
  disabled?: boolean;
  interactive?: boolean;
} & VoidEvents<{ Click: Record<string, never> }>>('void-list-item', 'ListItem');

export const Toast = wrapWc<VoidToast, {
  color?: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight';
  duration?: number;
} & VoidEvents<{ Close: null }>>('void-toast', 'Toast');

export const ToastContainer = wrapWc<VoidToastContainer, {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center' | 'inline';
}>('void-toast-container', 'ToastContainer');

export const Stepper = wrapWc<VoidStepper, {
  value?: number;
  steps?: string;
}>('void-stepper', 'Stepper');

export const Drawer = wrapWc<VoidDrawer, {
  open?: boolean;
  side?: 'left' | 'right' | 'top' | 'bottom';
  size?: 'sm' | 'md' | 'lg';
  closable?: boolean;
} & VoidEvents<OverlayEvents>>('void-drawer', 'Drawer');

/** Regions are parts: `<CardHeader>` (with `<CardTitle>`, `<CardDescription>`), `<CardBody>`, `<CardFooter>`. */
export const Card = wrapWc<VoidCard, {
  variant?: 'default' | 'elevated' | 'bordered';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Let the card shrink and scroll its content inside a height-constrained flex or grid parent. */
  scrollable?: boolean;
}>('void-card', 'Card');

/**
 * Two parts: the trigger wraps the one element that toggles the popover; the content is the panel.
 *
 * ```tsx
 * <Popover>
 *   <PopoverTrigger><Button>Details</Button></PopoverTrigger>
 *   <PopoverContent><p>Popover content</p></PopoverContent>
 * </Popover>
 * ```
 */
export const Popover = wrapWc<VoidPopover, {
  open?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
  trigger?: 'click' | 'manual';
  /** Alignment along the trigger edge. */
  align?: 'start' | 'center' | 'end';
} & VoidEvents<OverlayEvents>>('void-popover', 'Popover');

/**
 * ```tsx
 * <Tooltip>
 *   <TooltipTrigger><Button>Copy</Button></TooltipTrigger>
 *   <TooltipContent>Copy to clipboard</TooltipContent>
 * </Tooltip>
 * ```
 */
export const Tooltip = wrapWc<VoidTooltip, {
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Alignment along the trigger edge. */
  align?: 'start' | 'center' | 'end';
  delay?: number;
  /** Whether the tooltip is shown. */
  open?: boolean;
} & VoidEvents<OverlayEvents>>('void-tooltip', 'Tooltip');

export const Banner = wrapWc<VoidBanner, {
  color?: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight';
  variant?: 'subtle' | 'filled';
} & VoidEvents<{ Close: null }>>('void-banner', 'Banner');

export const ScrollArea = wrapWc<VoidScrollArea, {
  maxHeight?: string;
  direction?: 'vertical' | 'horizontal' | 'both';
}>('void-scroll-area', 'ScrollArea');

export const Table = wrapWc<VoidTable, {
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
  bordered?: boolean;
  /** For a table in a card or panel: dividers run to the container's edge, text stays on its content edge. */
  inset?: boolean;
  /**
   * Stack each row into label and value pairs while the table's container is narrow: an empty
   * string for the theme's breakpoint, a CSS length (`"48rem"`) for this table's, `"always"` for
   * every width. Leave undefined for a table at every width. Column roles go on header cells
   * with `data-stack` (`title`, `select`, `actions`, `hide`).
   */
  stack?: string;
  /** Horizontal scroll region; focusable and labelled while it overflows, with faded edges. */
  scrollable?: boolean;
  /** Keep the header row in view (against the table's own scroll with `maxHeight`, else the page). */
  stickyHeader?: boolean;
  /** Keep the first column in view while scrolling sideways. */
  stickyColumn?: boolean;
  /** Height at which a scrollable table scrolls vertically (a CSS length). */
  maxHeight?: string;
  /** Accessible name of the scroll region (default: the caption). */
  label?: string;
}>('void-table', 'Table');

export const Pagination = wrapWc<VoidPagination, {
  total?: number;
  value?: number;
  siblings?: number;
  size?: 'sm' | 'md' | 'lg';
  /**
   * Link mode: render pages as links built from this template, with `{page}`
   * replaced by the page number (for example `/posts?page={page}`).
   */
  hrefTemplate?: string;
  /** Link mode: query parameter set on the current URL when there is no `hrefTemplate`. */
  param?: string;
} & VoidEvents<{ Change: { value: number } }>>('void-pagination', 'Pagination');

export const ErrorFallback = wrapWc<VoidErrorFallback, {
  heading?: string;
  message?: string;
  retryable?: boolean;
  retryLabel?: string;
  icon?: boolean;
} & VoidEvents<{ Retry: null }>>('void-error-fallback', 'ErrorFallback');

export const CheckboxGroup = wrapWc<VoidCheckboxGroup, {
  label?: string;
  orientation?: 'vertical' | 'horizontal';
  /** Form field name; the value is submitted under it. */
  name?: string;
  /** At least one checkbox must be checked. */
  required?: boolean;
  /** Disables every checkbox in the group. */
  disabled?: boolean;
  /** The values of the checked checkboxes. */
  value?: string[];
} & VoidEvents<{ Change: { values: string[] } }>>('void-checkbox-group', 'CheckboxGroup');

export const Combobox = wrapWc<VoidCombobox, {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  error?: string;
  name?: string;
  /** Form validation: the control must have a value. */
  required?: boolean;
  /** Whether the option list is showing. */
  open?: boolean;
} & VoidEvents<{ Change: { value: string } } & OverlayEvents>>('void-combobox', 'Combobox');

export const Slider = wrapWc<VoidSlider, {
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  name?: string;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
} & VoidEvents<{ Input: { value: number }; Change: { value: number } }>>('void-slider', 'Slider');

export const FileUpload = wrapWc<VoidFileUpload, {
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  maxSize?: number;
  error?: string;
  /** Form field name; the value is submitted under it. */
  name?: string;
  /** Form validation: the control must have a value. */
  required?: boolean;
} & VoidEvents<{ Change: { files: File[] } }>>('void-file-upload', 'FileUpload');

export const NavBar = wrapWc<VoidNavBar, {
  sticky?: boolean;
  bordered?: boolean;
  variant?: 'default' | 'elevated';
}>('void-nav-bar', 'NavBar');

export const Hamburger = wrapWc<VoidHamburger, {
  active?: boolean;
  size?: 'sm' | 'md' | 'lg';
} & VoidEvents<{ Toggle: { active: boolean } }>>('void-hamburger', 'Hamburger');

export const ComposeInput = wrapWc<VoidComposeInput, {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  maxlength?: number;
} & VoidEvents<{ Input: { value: string }; Submit: { value: string } }>>('void-compose-input', 'ComposeInput');

export const Sidebar = wrapWc<VoidSidebar, {
  position?: 'left' | 'right';
  collapsed?: boolean;
  width?: string;
  collapsedWidth?: string;
} & VoidEvents<{ Toggle: { collapsed: boolean } }>>('void-sidebar', 'Sidebar');

/**
 * ```tsx
 * <DropdownMenu>
 *   <DropdownMenuTrigger><Button>Actions</Button></DropdownMenuTrigger>
 *   <DropdownMenuContent>
 *     <DropdownMenuItem value="edit">Edit</DropdownMenuItem>
 *   </DropdownMenuContent>
 * </DropdownMenu>
 * ```
 */
export const DropdownMenu = wrapWc<VoidDropdownMenu, {
  open?: boolean;
  /** Side of the trigger the menu opens on (flips when there is no room). */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Alignment along the trigger edge. */
  align?: 'start' | 'center' | 'end';
} & VoidEvents<OverlayEvents>>('void-dropdown-menu', 'DropdownMenu');

export const DropdownMenuItem = wrapWc<VoidDropdownMenuItem, {
  /** Passed as `detail.value` of `void-select`. */
  value?: string;
  disabled?: boolean;
  destructive?: boolean;
  /** Keep the menu open when this item is chosen (checkbox-style items). */
  keepOpen?: boolean;
} & VoidEvents<{ Select: { item: VoidDropdownMenuItem; value: string } }>>('void-dropdown-menu-item', 'DropdownMenuItem');

export const Toggle = wrapWc<VoidToggle, {
  pressed?: boolean;
  disabled?: boolean;
  color?: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'outline' | 'filled' | 'ghost' | 'solid';
  /** Value this toggle contributes to a parent ToggleGroup. */
  value?: string;
} & VoidEvents<{ Change: { pressed: boolean } }>>('void-toggle', 'Toggle');

export const SegmentedControl = wrapWc<VoidSegmentedControl, {
  value?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Form field name; the value is submitted under it. */
  name?: string;
  /** Form validation: the control must have a value. */
  required?: boolean;
  disabled?: boolean;
} & VoidEvents<{ Change: { value: string } }>>('void-segmented-control', 'SegmentedControl');

export const SegmentedControlItem = wrapWc<VoidSegmentedControlItem, {
  value?: string;
  disabled?: boolean;
}>('void-segmented-control-item', 'SegmentedControlItem');

export const Stat = wrapWc<VoidStat, {
  label?: string;
  value?: string;
  delta?: string;
  /** Secondary line of text under the value. */
  description?: string;
  trend?: 'up' | 'down' | 'flat' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight' | null;
  color?: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight';
  size?: 'sm' | 'md' | 'lg';
}>('void-stat', 'Stat');

export const Indicator = wrapWc<VoidIndicator, {
  color?: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight';
  size?: 'sm' | 'md' | 'lg';
  count?: number;
  ping?: boolean;
  overlay?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}>('void-indicator', 'Indicator');

/**
 * ```tsx
 * <Menu open>
 *   <MenuSearch><input type="search" aria-label="Search" /></MenuSearch>
 *   <MenuContent>
 *     <MenuItem value="new"><MenuItemIcon aria-hidden>+</MenuItemIcon>New<MenuItemShortcut>Ctrl+N</MenuItemShortcut></MenuItem>
 *     <MenuGroup><MenuGroupLabel>Recent</MenuGroupLabel><MenuItem value="a">A</MenuItem></MenuGroup>
 *   </MenuContent>
 *   <MenuEmpty>Nothing found</MenuEmpty>
 * </Menu>
 * ```
 */
export const Menu = wrapWc<VoidMenu, {
  open?: boolean;
  size?: 'sm' | 'md' | 'lg';
}>('void-menu', 'Menu');

export const MenuItem = wrapWc<VoidMenuItem, {
  /** Passed as `detail.value` of `void-select`. */
  value?: string;
  disabled?: boolean;
} & VoidEvents<{ Select: { item: VoidMenuItem; value: string } }>>('void-menu-item', 'MenuItem');

export const MenuGroup = wrapWc<VoidMenuGroup, {}>('void-menu-group', 'MenuGroup');

export const Carousel = wrapWc<VoidCarousel, {
  active?: number;
  loop?: boolean;
  autoplay?: boolean;
  interval?: number;
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
} & VoidEvents<{ Change: { index: number; previous: number } }>>('void-carousel', 'Carousel');

export const CarouselPrevious = wrapWc<VoidCarouselPrevious, {}>('void-carousel-previous', 'CarouselPrevious');

export const CarouselNext = wrapWc<VoidCarouselNext, {}>('void-carousel-next', 'CarouselNext');

export const Calendar = wrapWc<VoidCalendar, {
  value?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  locale?: string;
  firstDay?: number;
  /** Form field name; the value is submitted under it. */
  name?: string;
  /** Form validation: the control must have a value. */
  required?: boolean;
} & VoidEvents<{ Change: { value: string; date: Date } }>>('void-calendar', 'Calendar');

export const DatePicker = wrapWc<VoidDatePicker, {
  value?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  locale?: string;
  firstDay?: number;
  open?: boolean;
  placeholder?: string;
  format?: string;
  color?: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight';
  /** Form field name; the value is submitted under it. */
  name?: string;
  /** Form validation: the control must have a value. */
  required?: boolean;
} & VoidEvents<{ Change: { value: string; date: Date } } & OverlayEvents>>('void-date-picker', 'DatePicker');

export const NumberInput = wrapWc<VoidNumberInput, {
  value?: number;
  min?: number;
  max?: number;
  /** A number, or `'any'` for no step constraint (the buttons then step by 1). */
  step?: number | 'any';
  precision?: number;
  disabled?: boolean;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight';
  placeholder?: string;
  controls?: 'sides' | 'right' | 'none';
  label?: string;
  prefix?: string;
  unit?: string;
  /** Form field name; the value is submitted under it. */
  name?: string;
  /** Form validation: the control must have a value. */
  required?: boolean;
} & VoidEvents<{ Change: { value: number; previous: number } }>>('void-number-input', 'NumberInput');

export const ToggleGroup = wrapWc<VoidToggleGroup, {
  value?: string;
  multiple?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight';
  orientation?: 'horizontal' | 'vertical';
  /** Form field name; the value is submitted under it. */
  name?: string;
  /** Form validation: the control must have a value. */
  required?: boolean;
} & VoidEvents<{ Change: { value: string | string[] } }>>('void-toggle-group', 'ToggleGroup');

export const Collapsible = wrapWc<VoidCollapsible, {
  open?: boolean;
  disabled?: boolean;
} & VoidEvents<{ Toggle: { open: boolean } }>>('void-collapsible', 'Collapsible');

export const Editable = wrapWc<VoidEditable, {
  value?: string;
  editing?: boolean;
  disabled?: boolean;
  placeholder?: string;
  submitMode?: 'blur' | 'enter' | 'both';
  size?: 'sm' | 'md' | 'lg';
  /** Form field name; the value is submitted under it. */
  name?: string;
  /** Form validation: the control must have a value. */
  required?: boolean;
} & VoidEvents<{ Change: { value: string }; Cancel: null }>>('void-editable', 'Editable');

/**
 * ```tsx
 * <HoverCard>
 *   <HoverCardTrigger><a href="/u/ada">Ada</a></HoverCardTrigger>
 *   <HoverCardContent><p>Profile preview</p></HoverCardContent>
 * </HoverCard>
 * ```
 */
export const HoverCard = wrapWc<VoidHoverCard, {
  open?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Alignment along the trigger edge. */
  align?: 'start' | 'center' | 'end';
  openDelay?: number;
  closeDelay?: number;
} & VoidEvents<OverlayEvents>>('void-hover-card', 'HoverCard');

export const PinInput = wrapWc<VoidPinInput, {
  length?: number;
  groups?: string;
  value?: string;
  disabled?: boolean;
  mask?: boolean;
  type?: 'numeric' | 'alphanumeric';
  size?: 'sm' | 'md' | 'lg';
  color?: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight';
  placeholder?: string;
  /** Form field name; the value is submitted under it. */
  name?: string;
  /** Form validation: the control must have a value. */
  required?: boolean;
} & VoidEvents<{ Change: { value: string }; Complete: { value: string } }>>('void-pin-input', 'PinInput');

export const TagsInput = wrapWc<VoidTagsInput, {
  value?: (string | { text: string; color?: string })[];
  disabled?: boolean;
  readonly?: boolean;
  max?: number;
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight';
  variant?: 'filled' | 'outline';
  allowDuplicates?: boolean;
  /** Form field name; the value is submitted under it. */
  name?: string;
  /** Form validation: the control must have a value. */
  required?: boolean;
} & VoidEvents<{ Change: { value: TagValue[] } }>>('void-tags-input', 'TagsInput');

export const NavMenu = wrapWc<VoidNavMenu, {
  orientation?: 'horizontal' | 'vertical';
  width?: string;
}>('void-nav-menu', 'NavMenu');

export const NavMenuItem = wrapWc<VoidNavMenuItem, {
  open?: boolean;
  disabled?: boolean;
  active?: boolean;
} & VoidEvents<{ Open: null; Close: null }>>('void-nav-menu-item', 'NavMenuItem');

export const ColorPicker = wrapWc<VoidColorPicker, {
  value?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  swatches?: string[];
  showInput?: boolean;
  variant?: 'default' | 'compact';
  open?: boolean;
  /** Form field name; the value is submitted under it. */
  name?: string;
  /** Form validation: the control must have a value. */
  required?: boolean;
} & VoidEvents<{ Change: { value: string } }>>('void-color-picker', 'ColorPicker');

export const ActionInput = wrapWc<VoidActionInput, {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  type?: 'text' | 'password' | 'search' | 'email' | 'tel' | 'url';
  size?: 'sm' | 'md' | 'lg';
  color?: 'default' | 'error' | 'warning' | 'caution' | 'success' | 'info' | 'notice' | 'highlight';
  /** Autofill hint for the native control, e.g. `current-password`. */
  autocomplete?: string;
  minlength?: number;
  maxlength?: number;
  pattern?: string;
  inputMode?: '' | 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url';
  enterKeyHint?: '' | 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send';
  autocapitalize?: '' | 'off' | 'none' | 'on' | 'sentences' | 'words' | 'characters';
  /** Defaults to true; pass `false` to turn spell checking off. */
  spellcheck?: boolean;
  icon?: string;
  actionLabel?: string;
  position?: 'left' | 'right';
  /** Form field name; the value is submitted under it. */
  name?: string;
  /** Form validation: the control must have a value. */
  required?: boolean;
} & VoidEvents<{ Input: { value: string }; Change: { value: string }; Action: { value: string } }>>('void-action-input', 'ActionInput');

export const BarChart = wrapWc<VoidBarChart, {
  data?: BarChartData;
  height?: number;
  showValues?: boolean;
  variant?: 'filled' | 'outline' | 'wireframe';
  /** `true` staggers bars, `false` disables, a number sets the stagger amount. */
  stagger?: boolean | number;
}>('void-bar-chart', 'BarChart');

export const LineChart = wrapWc<VoidLineChart, {
  data?: LineChartData;
  height?: number;
  showValues?: boolean;
  variant?: 'filled' | 'outline' | 'wireframe';
  interpolation?: 'linear' | 'step';
}>('void-line-chart', 'LineChart');

export const DonutChart = wrapWc<VoidDonutChart, {
  data?: DonutChartData;
  size?: number;
  /** Inner radius as a fraction of the outer radius. */
  inner?: number;
  /** `false`/`0` seamless, `true` 1% gaps, a number is the percent of the arc used by gaps. */
  gaps?: boolean | number;
  variant?: 'filled' | 'outline' | 'wireframe';
  showValues?: boolean;
  showTotal?: boolean;
}>('void-donut-chart', 'DonutChart');

export const Gauge = wrapWc<VoidGauge, {
  data?: GaugeData;
  zones?: GaugeZone[];
  value?: number;
  min?: number;
  max?: number;
  unit?: string;
  size?: number;
  thickness?: number;
  circular?: 'full' | 'semi' | 'triple';
  variant?: 'filled' | 'outline' | 'wireframe';
  showValue?: boolean;
  unitInline?: boolean;
  tickMajor?: number;
  tickMinor?: number;
  tickMin?: boolean;
  tickMax?: boolean;
  segmentsSort?: 'value' | 'manual';
  gaps?: boolean | number;
}>('void-gauge', 'Gauge');
