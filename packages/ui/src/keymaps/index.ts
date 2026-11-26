/**
 * Every element that has key actions, and its default bindings. Components read their own map from here; the
 * build (`cem/keys.js`) reads this module through `dist/keymaps.js` to write the manifest, the docs tables and
 * `voidable ref`, so the maps are written once. Not part of the public API.
 */
import type { KeyMap } from '../keys.js';
import { activateKeys, pressKeys } from './activation.js';
import { carouselKeys } from './carousel.js';
import { choiceKeys, radioKeys, toggleGroupKeys } from './choice.js';
import { composeInputKeys, editableKeys, numberInputKeys, pinInputKeys, tagsInputKeys } from './fields.js';
import { dropdownMenuKeys, menuKeys } from './menu.js';
import { navMenuKeys } from './nav-menu.js';
import { overlayKeys } from './overlay.js';
import { calendarKeys, comboboxKeys, datePickerKeys, multiselectKeys } from './pickers.js';
import { tabsKeys } from './tabs.js';

export const keyMaps: Record<string, KeyMap> = {
  'void-accordion-item': activateKeys,
  'void-button': activateKeys,
  'void-calendar': calendarKeys,
  'void-carousel': carouselKeys,
  'void-carousel-next': activateKeys,
  'void-carousel-previous': activateKeys,
  'void-checkbox': pressKeys,
  'void-collapsible': activateKeys,
  'void-combobox': comboboxKeys,
  'void-compose-input': composeInputKeys,
  'void-date-picker': datePickerKeys,
  'void-dialog': overlayKeys,
  'void-drawer': overlayKeys,
  'void-dropdown-menu': dropdownMenuKeys,
  'void-dropdown-menu-item': activateKeys,
  'void-editable': editableKeys,
  'void-file-upload': activateKeys,
  'void-hamburger': activateKeys,
  'void-hover-card': overlayKeys,
  'void-menu': menuKeys,
  'void-menu-item': activateKeys,
  'void-multiselect': multiselectKeys,
  'void-nav-menu': navMenuKeys,
  'void-number-input': numberInputKeys,
  'void-pin-input': pinInputKeys,
  'void-popover': overlayKeys,
  'void-radio': radioKeys,
  'void-segmented-control': choiceKeys,
  'void-segmented-control-item': pressKeys,
  'void-switch': activateKeys,
  'void-tabs': tabsKeys,
  'void-tags-input': tagsInputKeys,
  'void-toggle': activateKeys,
  'void-toggle-group': toggleGroupKeys,
  'void-tooltip': overlayKeys,
};
