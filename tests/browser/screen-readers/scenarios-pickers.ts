// SPDX-License-Identifier: MIT
//
// Select, combobox and multiselect, in their explicit-parts markup (#52): a native
// <select> inside void-select, and the options in the content part of the other two
// (tests/browser/pages/sr-pickers.html). The highlighted option of a combobox is its
// aria-activedescendant and is not selected; aria-selected marks the chosen one.
import type { Scenario } from './facts';

export const pickerScenarios: Scenario[] = [
  {
    id: 'select',
    title: 'A select announces its label, and the option chosen by typing',
    page: '/sr-pickers',
    steps: [
      { reach: { role: 'combobox', name: 'Country' }, by: 'control' },
      { act: true },
      { type: 'Aus' },
      { hear: { role: 'combobox', name: 'Country', value: 'Australia', spoken: [/australia/] } },
    ],
  },
  {
    id: 'combobox',
    title: 'A combobox announces expanded, the highlighted option as you arrow, and the chosen value',
    page: '/sr-pickers',
    steps: [
      { reach: { role: 'combobox', name: 'Framework', expanded: false }, by: 'control' },
      { act: true },
      { hear: { role: 'combobox', name: 'Framework', expanded: true } },
      { press: 'ArrowDown' },
      { hear: { role: 'option', name: 'React', selected: false, position: { n: 1, of: 3, within: '#framework' } } },
      { press: 'ArrowDown' },
      { hear: { role: 'option', name: 'Vue', selected: false, position: { n: 2, of: 3, within: '#framework' } } },
      { press: 'Enter' },
      { hear: { role: 'combobox', name: 'Framework', expanded: false, value: 'Vue', spoken: [/vue/] } },
    ],
  },
  {
    id: 'multiselect',
    title: 'A multiselect announces expanded and each option as it is chosen',
    page: '/sr-pickers',
    steps: [
      { reach: { role: 'combobox', name: 'Skills', expanded: false }, by: 'control' },
      { act: true },
      { press: 'ArrowDown' },
      { hear: { role: 'combobox', name: 'Skills', expanded: true } },
      { press: 'Enter' },
      { hear: { role: 'option', name: 'CSS', selected: true, position: { n: 1, of: 3, within: '#skills' } } },
    ],
  },
];
