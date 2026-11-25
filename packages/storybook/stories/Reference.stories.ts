import { html } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { styleMap } from 'lit/directives/style-map.js';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

import nav from './reference/nav.html?raw';
import overview from './reference/overview.html?raw';
import table from './reference/table.html?raw';
import form from './reference/form.html?raw';
import settings from './reference/settings.html?raw';
import live from './reference/live.html?raw';

// Reference screens: five realistic application screens built only from
// Voidable components, the patterns (`void-shell`, `void-page`,
// `void-page-head`, `void-section`, `void-figures`, `void-rows`,
// `void-toolbar`, `void-description-list`, `void-state`, `void-media`,
// `void-glass`) and type roles (`data-void-type`). No screen has any CSS
// of its own: everything, layout included, comes from @voidable/theme.
//
// They are the subject for design review. Change a theme knob (or pick a
// theme in the toolbar) and every screen follows; take screenshots of these
// at 1440x900 and 390x844, in dark and light, to compare a change.
//
// The markup lives in the reference directory as plain HTML files, so the
// same files render here and in a screenshot harness without Storybook.
//
// Line comments only in this file: lint:manifest strips block comments with
// a pattern that pairs across files.
const meta: Meta = {
  title: 'Reference/Screens',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Realistic application screens used as the proof for the theme and as the subject for screenshot review. They are built from components and the CSS-only patterns; no screen has any CSS of its own.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

// The frame of every screen is a void-shell: the bar, then the page. The
// live screen opens on a photograph, so its bar lies over the image
// (nav="overlay") and carries the on-media surface.
const screen = (page: string, body: string) => {
  let navHtml = nav.replace(`data-nav="${page}"`, `data-nav="${page}" aria-current="page"`);
  if (page === 'live') {
    navHtml = navHtml.replace('<void-nav-bar>', '<void-nav-bar data-void-surface="media">');
    return html`<void-shell nav="overlay">${unsafeHTML(navHtml)}${unsafeHTML(body)}</void-shell>`;
  }
  return html`<void-shell>${unsafeHTML(navHtml)}${unsafeHTML(body)}</void-shell>`;
};

// An overview: page head, alert, figures, a plain table with ghost row actions, and two lists.
export const ApplicationScreen: Story = {
  render: () => screen('overview', overview),
};

// A data table with a toolbar: search, filters, ghost icon buttons, selection, row actions and pagination.
export const DataTable: Story = {
  render: () => screen('table', table),
};

// A form in three groups, with a validation error and Cancel (ghost) beside Save.
export const Form: Story = {
  render: () => screen('form', form),
};

// A settings page: a side list and sections of rows with a control at the end of each.
export const Settings: Story = {
  render: () => screen('settings', settings),
};

// UI over a panoramic photograph: the bar over the image, a headline and
// actions on the scrim, a status panel in glass, then the page.
// Photograph: NASA, ISS040-E-080833 (public domain).
export const LiveOverImagery: Story = {
  render: () => screen('live', live),
};

// Every theme knob as a control. The knobs are set inline on a wrapper that
// carries data-void-theme, so everything under it is derived again: this is
// the same mechanism an application uses to retheme part of a page. Pick a
// screen, move a knob, and copy the values into a theme file. The theme
// builder on the site (voidable.dev/theme/) is the same idea for everyone
// else: these screens, every knob, and the theme to copy, download or link.
const screens: Record<string, [string, string]> = {
  'Application screen': ['overview', overview],
  'Data table': ['table', table],
  Form: ['form', form],
  Settings: ['settings', settings],
  'Live, over imagery': ['live', live],
};

const range = (min: number, max: number, step: number) => ({ control: { type: 'range' as const, min, max, step } });

// Kept by hand on purpose: these controls set theme knobs (--void-* custom properties) and a
// screen selector. None is a component attribute, so the manifest has nothing to generate.
export const ThemePlayground: Story = {
  argTypes: {
    screen: { control: 'select', options: Object.keys(screens) },
    accentHue: { name: '--void-accent-hue', ...range(0, 360, 1) },
    accentChroma: { name: '--void-accent-chroma', ...range(0, 0.25, 0.01) },
    neutralHue: { name: '--void-neutral-hue', ...range(0, 360, 1) },
    neutralChroma: { name: '--void-neutral-chroma', ...range(0, 0.04, 0.001) },
    pageTint: { name: '--void-page-tint', ...range(0, 1, 0.05) },
    contrast: { name: '--void-contrast', ...range(0, 1, 0.05) },
    chrome: { name: '--void-chrome', ...range(0, 1, 0.05) },
    radius: { name: '--void-radius (px)', ...range(0, 20, 1) },
    density: { name: '--void-density', ...range(0.75, 1.25, 0.01) },
    rhythm: { name: '--void-rhythm', ...range(0.6, 1.4, 0.05) },
    fontSize: { name: '--void-font-size (rem)', ...range(0.75, 1, 0.0625) },
    monospace: { name: '--void-font-sans: monospace', control: 'boolean' },
  },
  args: {
    screen: 'Application screen',
    accentHue: 250,
    accentChroma: 0,
    neutralHue: 60,
    neutralChroma: 0.004,
    pageTint: 0,
    contrast: 0.2,
    chrome: 0.3,
    radius: 4,
    density: 1,
    rhythm: 1,
    fontSize: 0.875,
    monospace: false,
  },
  render: (args) => {
    const [page, body] = screens[args.screen as string] ?? screens['Application screen'];
    const knobs: Record<string, string> = {
      '--void-accent-hue': String(args.accentHue),
      '--void-accent-chroma': String(args.accentChroma),
      '--void-neutral-hue': String(args.neutralHue),
      '--void-neutral-chroma': String(args.neutralChroma),
      '--void-page-tint': String(args.pageTint),
      '--void-contrast': String(args.contrast),
      '--void-chrome': String(args.chrome),
      '--void-radius': `${args.radius}px`,
      '--void-density': String(args.density),
      '--void-rhythm': String(args.rhythm),
      '--void-font-size': `${args.fontSize}rem`,
      ...(args.monospace ? { '--void-font-sans': 'var(--void-font-mono)' } : {}),
      background: 'var(--void-color-bg)',
      'font-family': 'var(--void-font-sans)',
    };
    return html`<div data-void-theme style=${styleMap(knobs)}>${screen(page, body)}</div>`;
  },
};
