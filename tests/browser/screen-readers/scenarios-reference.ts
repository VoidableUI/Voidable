// SPDX-License-Identifier: MIT
//
// Reference controls (#75). Each probe walks a page of plain HTML or ARIA Authoring Practices controls with the
// same semantics as a Voidable component that a reader says the wrong thing about (or nothing), and logs what the
// reader says: the Voidable control and the reference are in the same run, with the same reader, so the log
// settles whether the reader or the harness handles the pattern at all.
//
//   - Reference silent or wrong too: the reader or the harness, not the component.
//   - Reference right, Voidable wrong: the component. The accessibility tree dump and the event trace printed
//     after each probe (`[ax ...]`, `[trace ...]`) show how the two differ.
//
// A probe is not a test: it logs `[sr <reader> <id>] ...` lines for every key sent and every phrase heard, notes
// each step that did not match (`PROBE step n did not match`), and always passes. See Scenario.probe.
import type { Scenario } from './facts';

const probe = (s: Omit<Scenario, 'probe' | 'trace'>): Scenario => ({ ...s, probe: true, trace: true });

const pause = { pause: 900 } as const;

export const referenceScenarios: Scenario[] = [
  probe({
    id: 'ref-radio',
    readers: ['NVDA'],
    title: 'Reference: the same radio group as native radios, as an ARIA radio group, as one with a hidden native radio inside each radio, and as void-radio-group',
    page: '/sr-ref-radio',
    steps: [{ sweep: 22, by: 'next' }],
  }),
  probe({
    id: 'ref-disclosure',
    readers: ['NVDA'],
    title: 'Reference: a collapsed disclosure button as a native button (bare, with aria-controls, with an until-found panel), as a custom element, and as void-accordion',
    page: '/sr-ref-disclosure',
    steps: [
      { reach: { role: 'button', name: 'Native bare', expanded: false }, by: 'control' },
      { act: true },
      { hear: { role: 'button', name: 'Native bare', expanded: true } },
      { reach: { role: 'button', name: 'Native controls', expanded: false }, by: 'control' },
      { act: true },
      { hear: { role: 'button', name: 'Native controls', expanded: true } },
      { reach: { role: 'button', name: 'Native until-found', expanded: false }, by: 'control' },
      { act: true },
      { hear: { role: 'button', name: 'Native until-found', expanded: true } },
      { reach: { role: 'button', name: 'Custom button', expanded: false }, by: 'control' },
      { act: true },
      { hear: { role: 'button', name: 'Custom button', expanded: true } },
      { reach: { role: 'button', name: 'Void refunds', expanded: false }, by: 'control' },
      { act: true },
      { hear: { role: 'button', name: 'Void refunds', expanded: true } },
    ],
  }),
  probe({
    id: 'ref-multiselect',
    readers: ['VoiceOver'],
    title: 'Reference: a multiselect combobox with explicit aria-selected="false", with it absent (as void-multiselect had it), and with a status announcement',
    page: '/sr-ref-multiselect',
    steps: ['Absent skills', 'Children skills', 'Hidden skills'].flatMap((name): Scenario['steps'] => [
      { reach: { role: 'combobox', name, expanded: false }, by: 'control' },
      { act: true },
      pause,
      { press: 'ArrowDown' },
      pause,
      { press: 'Enter' },
      pause,
      { press: 'ArrowDown' },
      pause,
      { press: 'Enter' },
      pause,
      { press: 'Escape' },
    ]),
  }),
  probe({
    id: 'ref-tabs',
    readers: ['NVDA'],
    title: 'Reference: tabs from the ARIA Authoring Practices in plain HTML',
    page: '/sr-ref-tabs',
    steps: [
      { sweep: 12, by: 'next' },
      { reach: { role: 'tab', name: 'Billing', selected: false }, by: { VoiceOver: 'control', NVDA: 'focusable' } },
      { act: true },
      { hear: { role: 'tab', name: 'Billing', selected: true } },
    ],
  }),
  probe({
    id: 'ref-table',
    readers: ['NVDA'],
    title: 'Reference: a native table with a caption and column headers, no Voidable element around it',
    page: '/sr-ref-table',
    steps: [
      { reach: { role: 'table', name: 'Reference members' }, by: 'table' },
      { cell: 'down' },
      { cell: 'right' },
      { hear: { role: 'cell', name: 'Engineer', header: 'Role' } },
      { sweep: 6, by: 'next' },
    ],
  }),
];
