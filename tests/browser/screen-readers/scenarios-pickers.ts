// SPDX-License-Identifier: MIT
//
// Select, combobox and multiselect, kept apart from scenarios.ts on purpose: their
// markup is being redesigned (AGENTS.md, "Explicit parts (#52)", the "To convert"
// and "Open" rows of docs/src/content/docs/guides/composition.mdx). When it lands,
// update tests/browser/pages/sr-pickers.html and the facts here (and nothing
// else): the specs, the runner and the workflow take whatever is listed.
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
    title: 'A combobox announces expanded, the active option as you arrow, and the chosen value',
    page: '/sr-pickers',
    steps: [
      { reach: { role: 'combobox', name: 'Framework', expanded: false }, by: 'control' },
      { act: true },
      { hear: { role: 'combobox', name: 'Framework', expanded: true } },
      { press: 'ArrowDown' },
      { hear: { role: 'option', name: 'React', selected: true, position: { n: 1, of: 3, within: '#framework' } } },
      { press: 'ArrowDown' },
      { hear: { role: 'option', name: 'Vue', selected: true, position: { n: 2, of: 3, within: '#framework' } } },
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
