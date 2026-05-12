import React, { forwardRef, useRef, useEffect } from 'react';

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
  VoidTabPanel,
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
  VoidCarouselSlide,
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
} from '@voidable/ui';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type VoidProps<P = object> = P &
  Omit<React.HTMLAttributes<HTMLElement>, keyof P> & {
    children?: React.ReactNode;
  };

// ---------------------------------------------------------------------------
// useWcEvents — separate onVoidX event props, attach via addEventListener
// ---------------------------------------------------------------------------

/** Convert camelCase event name to kebab-case custom-event name.
 *  e.g. "onVoidChange" -> "void-change", "onVoidTabClick" -> "void-tab-click"
 */
function toEventName(prop: string): string {
  // Strip leading "on" and lowercase the first char
  const stripped = prop.slice(2);
  // Insert hyphens before uppercase chars then lowercase everything
  return stripped.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
}

function isEventProp(key: string): boolean {
  return /^onVoid[A-Z]/.test(key);
}

function useWcEvents<E extends HTMLElement>(
  ref: React.RefObject<E | null>,
  props: Record<string, unknown>,
): Record<string, unknown> {
  const eventProps = useRef<Record<string, EventListener>>({});
  const attribProps: Record<string, unknown> = {};

  const nextEvents: Record<string, EventListener> = {};

  for (const key of Object.keys(props)) {
    if (isEventProp(key)) {
      nextEvents[toEventName(key)] = props[key] as EventListener;
    } else {
      attribProps[key] = props[key];
    }
  }

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prev = eventProps.current;

    // Remove stale listeners
    for (const eventName of Object.keys(prev)) {
      if (!nextEvents[eventName] || prev[eventName] !== nextEvents[eventName]) {
        el.removeEventListener(eventName, prev[eventName]);
      }
    }

    // Add new / changed listeners
    for (const eventName of Object.keys(nextEvents)) {
      if (!prev[eventName] || prev[eventName] !== nextEvents[eventName]) {
        el.addEventListener(eventName, nextEvents[eventName]);
      }
    }

    eventProps.current = nextEvents;
  });

  return attribProps;
}

// ---------------------------------------------------------------------------
// wrapWc — factory creating forwardRef React components
// ---------------------------------------------------------------------------

function wrapWc<E extends HTMLElement, P = object>(
  tag: string,
  displayName: string,
) {
  const Wrapped = forwardRef<E, VoidProps<P>>((props, externalRef) => {
    const innerRef = useRef<E>(null);

    const attribProps = useWcEvents(innerRef, props as Record<string, unknown>);

    // Merge refs
    const setRef = (el: E | null) => {
      (innerRef as React.MutableRefObject<E | null>).current = el;
      if (typeof externalRef === 'function') {
        externalRef(el);
      } else if (externalRef) {
        (externalRef as React.MutableRefObject<E | null>).current = el;
      }
    };

    return React.createElement(tag, { ...attribProps, ref: setRef });
  });

  Wrapped.displayName = displayName;
  return Wrapped;
}

// ---------------------------------------------------------------------------
// Component exports
// ---------------------------------------------------------------------------

export const Badge = wrapWc<VoidBadge, {
  color?: 'default' | 'error' | 'warning' | 'success' | 'info' | 'notice' | 'highlight';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
}>('void-badge', 'Badge');

export const Button = wrapWc<VoidButton, {
  variant?: 'outline' | 'filled';
  color?: 'default' | 'error' | 'warning' | 'success' | 'info' | 'notice';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
}>('void-button', 'Button');

export const Divider = wrapWc<VoidDivider, {
  label?: string;
  orientation?: 'horizontal' | 'vertical';
}>('void-divider', 'Divider');

export const Spinner = wrapWc<VoidSpinner, {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
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
  color?: 'default' | 'error' | 'warning' | 'success' | 'info' | 'notice';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
}>('void-switch', 'Switch');

export const Avatar = wrapWc<VoidAvatar, {
  src?: string;
  alt?: string;
  initials?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
}>('void-avatar', 'Avatar');

export const Alert = wrapWc<VoidAlert, {
  color?: 'default' | 'error' | 'warning' | 'success' | 'info' | 'notice';
  dismissible?: boolean;
  variant?: 'subtle' | 'filled';
}>('void-alert', 'Alert');

export const Tag = wrapWc<VoidTag, {
  color?: 'default' | 'error' | 'warning' | 'success' | 'info' | 'notice';
  removable?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
}>('void-tag', 'Tag');

export const Progress = wrapWc<VoidProgress, {
  value?: number;
  max?: number;
  color?: 'default' | 'error' | 'warning' | 'success' | 'info' | 'notice';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  indeterminate?: boolean;
}>('void-progress', 'Progress');

export const Panel = wrapWc<VoidPanel, {
  label?: string;
  variant?: 'default' | 'bordered' | 'elevated';
}>('void-panel', 'Panel');

export const Input = wrapWc<VoidInput, {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  error?: string;
}>('void-input', 'Input');

export const Textarea = wrapWc<VoidTextarea, {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
  name?: string;
  rows?: number;
  resize?: 'none' | 'vertical' | 'both';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  error?: string;
}>('void-textarea', 'Textarea');

export const Select = wrapWc<VoidSelect, {
  value?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  error?: string;
  placeholder?: string;
}>('void-select', 'Select');

export const Checkbox = wrapWc<VoidCheckbox, {
  checked?: boolean;
  disabled?: boolean;
  indeterminate?: boolean;
  name?: string;
  value?: string;
  color?: 'default' | 'error' | 'warning' | 'success' | 'info' | 'notice';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
}>('void-checkbox', 'Checkbox');

export const Radio = wrapWc<VoidRadio, {
  checked?: boolean;
  disabled?: boolean;
  name?: string;
  value?: string;
  color?: 'default' | 'error' | 'warning' | 'success' | 'info' | 'notice';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
}>('void-radio', 'Radio');

export const RadioGroup = wrapWc<VoidRadioGroup, {
  label?: string;
  value?: string;
  name?: string;
  orientation?: 'vertical' | 'horizontal';
}>('void-radio-group', 'RadioGroup');

export const Field = wrapWc<VoidField, {
  label?: string;
  error?: string;
  helper?: string;
  required?: boolean;
}>('void-field', 'Field');

export const Multiselect = wrapWc<VoidMultiselect, {
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  error?: string;
  name?: string;
}>('void-multiselect', 'Multiselect');

export const Option = wrapWc<VoidOption, {
  value?: string;
  selected?: boolean;
}>('void-option', 'Option');

export const Dialog = wrapWc<VoidDialog, {
  open?: boolean;
  heading?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closable?: boolean;
}>('void-dialog', 'Dialog');

export const Tabs = wrapWc<VoidTabs, {
  value?: string;
  size?: 'sm' | 'md' | 'lg';
}>('void-tabs', 'Tabs');

export const TabPanel = wrapWc<VoidTabPanel, {
  tab?: string;
  label?: string;
  active?: boolean;
}>('void-tab-panel', 'TabPanel');

export const Accordion = wrapWc<VoidAccordion, {
  multiple?: boolean;
}>('void-accordion', 'Accordion');

export const AccordionItem = wrapWc<VoidAccordionItem, {
  heading?: string;
  open?: boolean;
}>('void-accordion-item', 'AccordionItem');

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
}>('void-list-item', 'ListItem');

export const Toast = wrapWc<VoidToast, {
  color?: 'default' | 'error' | 'warning' | 'success' | 'info';
  duration?: number;
  dismissable?: boolean;
  heading?: string;
}>('void-toast', 'Toast');

export const ToastContainer = wrapWc<VoidToastContainer, {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}>('void-toast-container', 'ToastContainer');

export const Stepper = wrapWc<VoidStepper, {
  value?: number;
  steps?: string;
}>('void-stepper', 'Stepper');

export const Drawer = wrapWc<VoidDrawer, {
  open?: boolean;
  side?: 'left' | 'right' | 'top' | 'bottom';
  size?: 'sm' | 'md' | 'lg';
  heading?: string;
  closable?: boolean;
}>('void-drawer', 'Drawer');

export const Card = wrapWc<VoidCard, {
  heading?: string;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}>('void-card', 'Card');

export const Popover = wrapWc<VoidPopover, {
  open?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
  trigger?: 'click' | 'manual';
}>('void-popover', 'Popover');

export const Tooltip = wrapWc<VoidTooltip, {
  text?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}>('void-tooltip', 'Tooltip');

export const Banner = wrapWc<VoidBanner, {
  color?: 'default' | 'error' | 'warning' | 'success' | 'info' | 'notice';
  dismissable?: boolean;
  variant?: 'subtle' | 'filled';
}>('void-banner', 'Banner');

export const ScrollArea = wrapWc<VoidScrollArea, {
  maxHeight?: string;
  direction?: 'vertical' | 'horizontal' | 'both';
}>('void-scroll-area', 'ScrollArea');

export const Table = wrapWc<VoidTable, {
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
  bordered?: boolean;
}>('void-table', 'Table');

export const Pagination = wrapWc<VoidPagination, {
  total?: number;
  value?: number;
  siblings?: number;
  size?: 'sm' | 'md' | 'lg';
}>('void-pagination', 'Pagination');

export const ErrorFallback = wrapWc<VoidErrorFallback, {
  heading?: string;
  message?: string;
  retryable?: boolean;
  retryLabel?: string;
  icon?: boolean;
}>('void-error-fallback', 'ErrorFallback');

export const CheckboxGroup = wrapWc<VoidCheckboxGroup, {
  label?: string;
  orientation?: 'vertical' | 'horizontal';
}>('void-checkbox-group', 'CheckboxGroup');

export const Combobox = wrapWc<VoidCombobox, {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  error?: string;
  name?: string;
}>('void-combobox', 'Combobox');

export const Slider = wrapWc<VoidSlider, {
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  name?: string;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
}>('void-slider', 'Slider');

export const FileUpload = wrapWc<VoidFileUpload, {
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  maxSize?: number;
  error?: string;
}>('void-file-upload', 'FileUpload');

export const NavBar = wrapWc<VoidNavBar, {
  sticky?: boolean;
  bordered?: boolean;
  variant?: 'default' | 'elevated';
}>('void-nav-bar', 'NavBar');

export const Hamburger = wrapWc<VoidHamburger, {
  active?: boolean;
  size?: 'sm' | 'md' | 'lg';
}>('void-hamburger', 'Hamburger');

export const ComposeInput = wrapWc<VoidComposeInput, {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  maxlength?: number;
}>('void-compose-input', 'ComposeInput');

export const Sidebar = wrapWc<VoidSidebar, {
  position?: 'left' | 'right';
  collapsed?: boolean;
  width?: string;
  collapsedWidth?: string;
}>('void-sidebar', 'Sidebar');

export const DropdownMenu = wrapWc<VoidDropdownMenu, {
  open?: boolean;
  position?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
}>('void-dropdown-menu', 'DropdownMenu');

export const DropdownMenuItem = wrapWc<VoidDropdownMenuItem, {
  disabled?: boolean;
  destructive?: boolean;
}>('void-dropdown-menu-item', 'DropdownMenuItem');

export const Toggle = wrapWc<VoidToggle, {
  pressed?: boolean;
  disabled?: boolean;
  color?: 'default' | 'error' | 'warning' | 'success' | 'info' | 'notice';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  variant?: 'outline' | 'filled' | 'ghost' | 'solid';
}>('void-toggle', 'Toggle');

export const SegmentedControl = wrapWc<VoidSegmentedControl, {
  value?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
}>('void-segmented-control', 'SegmentedControl');

export const SegmentedControlItem = wrapWc<VoidSegmentedControlItem, {
  value?: string;
  disabled?: boolean;
}>('void-segmented-control-item', 'SegmentedControlItem');

export const Stat = wrapWc<VoidStat, {
  label?: string;
  value?: string;
  delta?: string;
  trend?: 'up' | 'down' | 'flat' | 'error' | 'warning' | 'success' | 'info' | 'notice' | 'highlight' | null;
  color?: 'default' | 'error' | 'warning' | 'success' | 'info' | 'notice';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
}>('void-stat', 'Stat');

export const Indicator = wrapWc<VoidIndicator, {
  color?: 'default' | 'error' | 'warning' | 'success' | 'info' | 'notice';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  count?: number;
  ping?: boolean;
  overlay?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}>('void-indicator', 'Indicator');

export const Menu = wrapWc<VoidMenu, {
  open?: boolean;
  searchable?: boolean;
  size?: 'sm' | 'md' | 'lg';
  placeholder?: string;
}>('void-menu', 'Menu');

export const MenuItem = wrapWc<VoidMenuItem, {
  value?: string;
  disabled?: boolean;
  shortcut?: string;
  icon?: string;
}>('void-menu-item', 'MenuItem');

export const MenuGroup = wrapWc<VoidMenuGroup, {
  label?: string;
}>('void-menu-group', 'MenuGroup');

export const Carousel = wrapWc<VoidCarousel, {
  active?: number;
  loop?: boolean;
  autoplay?: boolean;
  interval?: number;
  size?: 'sm' | 'md' | 'lg';
  controls?: boolean;
  indicators?: boolean;
  orientation?: 'horizontal' | 'vertical';
}>('void-carousel', 'Carousel');

export const CarouselSlide = wrapWc<VoidCarouselSlide, {
}>('void-carousel-slide', 'CarouselSlide');

export const Calendar = wrapWc<VoidCalendar, {
  value?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  locale?: string;
  firstDay?: number;
}>('void-calendar', 'Calendar');

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
  color?: 'default' | 'error' | 'warning' | 'success' | 'info' | 'notice';
}>('void-date-picker', 'DatePicker');

export const NumberInput = wrapWc<VoidNumberInput, {
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  disabled?: boolean;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'default' | 'error' | 'warning' | 'success' | 'info' | 'notice';
  placeholder?: string;
  controls?: 'sides' | 'right' | 'none';
  label?: string;
}>('void-number-input', 'NumberInput');

export const ToggleGroup = wrapWc<VoidToggleGroup, {
  value?: string;
  multiple?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'default' | 'error' | 'warning' | 'success' | 'info' | 'notice';
  orientation?: 'horizontal' | 'vertical';
}>('void-toggle-group', 'ToggleGroup');

export const Collapsible = wrapWc<VoidCollapsible, {
  heading?: string;
  open?: boolean;
  disabled?: boolean;
}>('void-collapsible', 'Collapsible');

export const Editable = wrapWc<VoidEditable, {
  value?: string;
  editing?: boolean;
  disabled?: boolean;
  placeholder?: string;
  submitMode?: 'blur' | 'enter' | 'both';
  size?: 'sm' | 'md' | 'lg';
}>('void-editable', 'Editable');

export const HoverCard = wrapWc<VoidHoverCard, {
  open?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
  openDelay?: number;
  closeDelay?: number;
}>('void-hover-card', 'HoverCard');

export const PinInput = wrapWc<VoidPinInput, {
  length?: number;
  groups?: string;
  value?: string;
  disabled?: boolean;
  mask?: boolean;
  type?: 'numeric' | 'alphanumeric';
  size?: 'sm' | 'md' | 'lg';
  color?: 'default' | 'error' | 'warning' | 'success' | 'info' | 'notice';
  placeholder?: string;
}>('void-pin-input', 'PinInput');

export const TagsInput = wrapWc<VoidTagsInput, {
  value?: (string | { text: string; color?: string })[];
  disabled?: boolean;
  readonly?: boolean;
  max?: number;
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'default' | 'error' | 'warning' | 'success' | 'info' | 'notice';
  variant?: 'filled' | 'outline';
  allowDuplicates?: boolean;
}>('void-tags-input', 'TagsInput');

export const NavMenu = wrapWc<VoidNavMenu, {
  orientation?: 'horizontal' | 'vertical';
  width?: string;
}>('void-nav-menu', 'NavMenu');

export const NavMenuItem = wrapWc<VoidNavMenuItem, {
  open?: boolean;
  disabled?: boolean;
  href?: string;
  active?: boolean;
}>('void-nav-menu-item', 'NavMenuItem');

export const ColorPicker = wrapWc<VoidColorPicker, {
  value?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  swatches?: string[];
  showInput?: boolean;
  variant?: 'default' | 'compact';
  open?: boolean;
}>('void-color-picker', 'ColorPicker');
