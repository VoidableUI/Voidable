import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

// The patterns: the recurring pieces of an application screen. Every void-*
// tag in this file that is not a component is CSS only: the theme styles it
// and nothing registers it. No story here has any CSS of its own.
//
// Line comments only in this file: lint:manifest strips block comments with
// a pattern that pairs across files.
const meta: Meta = {
  title: 'Patterns/Application',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'CSS-only elements for the frame and the parts of a page: void-shell, void-page, void-page-head, void-section, void-figures, void-description-list, void-rows, void-state, void-toolbar and void-empty. Compose them; write no layout CSS.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

const inPage = (content: unknown) => html`<void-page>${content}</void-page>`;

// The frame: a bar, then one centred column. At 390px the links move to a
// row of their own that scrolls sideways.
export const AppShell: Story = {
  render: () => html`
    <void-shell>
      <void-nav-bar>
        <void-brand><a href="#">Meridian</a></void-brand>
        <void-nav-links>
          <a href="#" aria-current="page">Overview</a>
          <a href="#">Stations</a>
          <a href="#">Passes</a>
          <a href="#">Live</a>
          <a href="#">Settings</a>
        </void-nav-links>
        <void-spacer></void-spacer>
        <void-state color="success" data-void-hide="narrow"><span data-void-type="code">eu-north-2</span></void-state>
      </void-nav-bar>
      <main>
        <void-page>
          <void-page-head>
            <span data-void-type="label">Network</span>
            <h1>Ground network</h1>
            <p>Forty-four stations on six continents.</p>
            <void-actions>
              <void-button>Schedule</void-button>
              <void-button variant="filled">Add station</void-button>
            </void-actions>
          </void-page-head>
          <void-figures>
            <void-figure>
              <span data-void-type="label">Stations online</span>
              <span data-void-type="value">41 <span data-void-type="unit">of 44</span></span>
              <span data-void-type="caption">2 in maintenance, 1 degraded</span>
            </void-figure>
            <void-figure>
              <span data-void-type="label">Passes today</span>
              <span data-void-type="value">1,284</span>
              <span data-void-type="caption"><void-delta trend="up">4.2%</void-delta> on last week</span>
            </void-figure>
            <void-figure>
              <span data-void-type="label">Downlink</span>
              <span data-void-type="value">79.6 <span data-void-type="unit">TB</span></span>
              <span data-void-type="caption">64% of the daily plan</span>
            </void-figure>
            <void-figure>
              <span data-void-type="label">Median latency</span>
              <span data-void-type="value">38 <span data-void-type="unit">ms</span></span>
              <span data-void-type="caption"><void-delta trend="down" invert>4 ms</void-delta> on last week</span>
            </void-figure>
          </void-figures>
        </void-page>
      </main>
    </void-shell>
  `,
};

// nav="side": a sidebar beside the page; a bar across the top below 48rem.
export const AppShellWithSidebar: Story = {
  render: () => html`
    <void-shell nav="side">
      <void-sidebar width="15rem">
        <void-brand><a href="#">Meridian</a></void-brand>
        <void-nav-links>
          <span data-void-type="label">Network</span>
          <a href="#" aria-current="page">Overview</a>
          <a href="#">Stations</a>
          <a href="#">Passes</a>
          <span data-void-type="label">Account</span>
          <a href="#">Settings</a>
          <a href="#">API tokens</a>
        </void-nav-links>
        <void-spacer></void-spacer>
        <void-state color="success" data-void-hide="narrow"><span data-void-type="code">eu-north-2</span></void-state>
      </void-sidebar>
      <main>
        <void-page>
          <void-page-head>
            <span data-void-type="label">Network / Stations</span>
            <h1>Svalbard 1</h1>
            <p>A 7.3 m antenna on Platåberget, in service since 2019.</p>
            <void-actions>
              <void-button>Pause</void-button>
              <void-button variant="filled">Schedule pass</void-button>
            </void-actions>
          </void-page-head>
          <void-section>
            <void-section-head>
              <h2>Details</h2>
              <void-state color="success" pulse>Tracking</void-state>
            </void-section-head>
            <void-description-list layout="grid" columns="4">
              <dl>
                <div><dt>Region</dt><dd>Arctic</dd></div>
                <div><dt>Position</dt><dd>78.23° N, 15.39° E</dd></div>
                <div><dt>Antenna</dt><dd>7.3 m</dd></div>
                <div><dt>Bands</dt><dd>S, X, Ka</dd></div>
              </dl>
            </void-description-list>
          </void-section>
        </void-page>
      </main>
    </void-shell>
  `,
};

// A label or breadcrumbs, the h1, one sentence, and the actions.
export const PageHead: Story = {
  render: () =>
    inPage(html`
      <void-page-head>
        <span data-void-type="label">Network / Stations</span>
        <h1>Svalbard 1</h1>
        <p>A 7.3 m antenna on Platåberget, in service since 2019.</p>
        <void-actions>
          <void-button variant="ghost">Export</void-button>
          <void-button>Pause</void-button>
          <void-button variant="filled">Schedule pass</void-button>
        </void-actions>
      </void-page-head>
      <void-page-head flush>
        <h1>API tokens</h1>
        <void-actions><void-button variant="filled">New token</void-button></void-actions>
      </void-page-head>
    `),
};

// A titled part of a page: no box. divided draws a hairline under the head
// for content with no line of its own.
export const Section: Story = {
  render: () =>
    inPage(html`
      <void-section>
        <void-section-head>
          <h2>Upcoming passes</h2>
          <p>Passes assigned to this station in the next 24 hours.</p>
          <void-actions><void-button size="sm">Assign</void-button></void-actions>
        </void-section-head>
        <void-rows>
          <void-row>
            <void-row-text><span>MRD-0412</span><span data-void-type="caption">X band, 9 min 40 s</span></void-row-text>
            <span data-void-type="code">14:02 UTC</span>
          </void-row>
          <void-row>
            <void-row-text><span>MRD-0388</span><span data-void-type="caption">S band, 6 min 12 s</span></void-row-text>
            <span data-void-type="code">14:31 UTC</span>
          </void-row>
        </void-rows>
      </void-section>
      <void-section divided gap="stack">
        <void-section-head>
          <h2>Identity</h2>
          <span data-void-type="label">Required</span>
        </void-section-head>
        <void-field label="Station name" helper="Shown in schedules and alerts."><void-input value="Kiruna 3"></void-input></void-field>
        <void-field label="Site code"><void-input value="KRN-3"></void-input></void-field>
        <void-actions justify="end">
          <void-button variant="ghost">Cancel</void-button>
          <void-button variant="filled">Save</void-button>
        </void-actions>
      </void-section>
      <!-- A ghost button that ends a line has its label on the column's edge,
           and a head is as tall with an action as without. -->
      <void-section>
        <void-section-head>
          <h2>Recent contacts</h2>
          <void-actions><void-button variant="ghost">View all</void-button></void-actions>
        </void-section-head>
        <void-rows>
          <void-row>
            <void-row-text><span>Svalbard 1</span><span data-void-type="caption">X band</span></void-row-text>
            <void-actions><void-state color="success">Tracking</void-state><void-button variant="ghost" size="sm">Pause</void-button></void-actions>
          </void-row>
          <void-row>
            <void-row-text><span>Troll</span><span data-void-type="caption">S band</span></void-row-text>
            <void-actions><void-state>Idle</void-state><void-button variant="ghost" size="sm">Resume</void-button></void-actions>
          </void-row>
        </void-rows>
        <void-actions justify="end">
          <void-button variant="ghost">Newer</void-button>
          <void-button variant="ghost">Older</void-button>
        </void-actions>
      </void-section>
      <void-split ratio="2:1">
        <void-section><h2>Activity</h2><p>The wider column of a split.</p></void-section>
        <void-section><h2>Notes</h2><p>The narrower one. Below 48rem they stack.</p></void-section>
      </void-split>
    `),
};

// Cards in as many columns as fit, each at least 16rem; the cards of a row
// are equally tall. One card is a link, one a button, one static.
export const CardGrid: Story = {
  render: () =>
    inPage(html`
      <void-card-grid>
        <void-card>
          <void-card-header>
            <void-card-title><a href="#ground-network">Ground network</a></void-card-title>
            <void-card-description>41 stations, 2 in maintenance.</void-card-description>
          </void-card-header>
          <void-card-body>Downlink at 79.6 TB today.</void-card-body>
        </void-card>
        <void-card>
          <void-card-header>
            <void-card-title><button type="button">Add a station</button></void-card-title>
            <void-card-description>Register a new antenna.</void-card-description>
          </void-card-header>
          <void-card-body>Opens the registration form.</void-card-body>
        </void-card>
        <void-card>
          <void-card-header><void-card-title>Static card</void-card-title></void-card-header>
          <void-card-body>No control: nothing to click.</void-card-body>
        </void-card>
      </void-card-grid>
    `),
};

// Rows that are one link or one button: the control sits in the row text and
// is stretched over the whole row. The badge is decoration.
export const LinkRows: Story = {
  render: () =>
    inPage(html`
      <void-rows>
        <void-row>
          <void-row-text>
            <a href="#kiruna">Kiruna 3</a>
            <span data-void-type="caption">Online since March</span>
          </void-row-text>
          <void-badge color="success" variant="outline">Online</void-badge>
        </void-row>
        <void-row>
          <void-row-text><button type="button">Add a station</button></void-row-text>
        </void-row>
        <void-row>
          <void-row-text>Static row</void-row-text>
        </void-row>
      </void-rows>
    `),
};

// A column that stays stuck: beside the list on a wide screen, above it
// below 48rem. Narrow the viewport and scroll to see it.
export const StickySplit: Story = {
  render: () =>
    inPage(html`
      <void-split ratio="1:2">
        <void-stack sticky="always">
          <span data-void-type="label">Pass geometry</span>
          <void-skeleton style="height: 8rem"></void-skeleton>
        </void-stack>
        <void-rows>
          ${[1041, 1042, 1043, 1044, 1045, 1046, 1047, 1048, 1049, 1050].map(
            (n) => html`<void-row><void-row-text><p>Pass ${n}</p></void-row-text></void-row>`,
          )}
        </void-rows>
      </void-split>
    `),
};

// The label recipe: one attribute, the small quiet name of a thing.
export const Labels: Story = {
  render: () =>
    inPage(html`
      <void-stack gap="group">
        <void-stack gap="tight">
          <span data-void-type="label">Stations online</span>
          <span data-void-type="value">41 <span data-void-type="unit">of 44</span></span>
          <span data-void-type="caption">2 in maintenance, 1 degraded</span>
        </void-stack>
        <void-section>
          <void-section-head>
            <h2>Hardware</h2>
            <span data-void-type="label">Last checked 4 min ago</span>
          </void-section-head>
          <void-description-list>
            <dl>
              <div><dt>Receiver</dt><dd>Nominal</dd></div>
              <div><dt>Feed temperature</dt><dd>−41.2 °C</dd></div>
            </dl>
          </void-description-list>
        </void-section>
      </void-stack>
    `),
};

// One number that matters: label, value with its unit, optional progress,
// caption with an optional change.
export const Figures: Story = {
  render: () =>
    inPage(html`
      <void-figures>
        <void-figure>
          <span data-void-type="label">Stations online</span>
          <span data-void-type="value">41 <span data-void-type="unit">of 44</span></span>
          <span data-void-type="caption">2 in maintenance, 1 degraded</span>
        </void-figure>
        <void-figure>
          <span data-void-type="label">Passes today</span>
          <span data-void-type="value">1,284</span>
          <span data-void-type="caption"><void-delta trend="up">4.2%</void-delta> on last week</span>
        </void-figure>
        <void-figure>
          <span data-void-type="label">Downlink</span>
          <span data-void-type="value">79.6 <span data-void-type="unit">TB</span></span>
          <void-progress value="64" size="sm" aria-label="Downlink, 64% of the daily plan"></void-progress>
          <span data-void-type="caption">64% of the daily plan</span>
        </void-figure>
        <void-figure>
          <span data-void-type="label">Median latency</span>
          <span data-void-type="value">38 <span data-void-type="unit">ms</span></span>
          <span data-void-type="caption"><void-delta trend="down" invert>4 ms</void-delta> on last week</span>
        </void-figure>
      </void-figures>
      <void-figures columns="3">
        <void-figure>
          <span data-void-type="label">Uptime</span>
          <span data-void-type="value" data-size="sm">99.98 <span data-void-type="unit">%</span></span>
          <span data-void-type="caption">last 30 days</span>
        </void-figure>
        <void-figure>
          <span data-void-type="label">Antenna</span>
          <span data-void-type="value" data-size="sm">7.3 <span data-void-type="unit">m</span></span>
          <span data-void-type="caption">S, X and Ka band</span>
        </void-figure>
        <void-figure>
          <span data-void-type="label">Wind</span>
          <span data-void-type="value" data-size="sm">9 <span data-void-type="unit">m/s</span></span>
          <span data-void-type="caption">limit 25 m/s</span>
        </void-figure>
      </void-figures>
    `),
};

// Labels and values around a native dl: rows, two columns of rows, a grid.
export const DescriptionList: Story = {
  render: () =>
    inPage(html`
      <void-description-list layout="grid" columns="4">
        <dl>
          <div><dt>Region</dt><dd>Arctic</dd></div>
          <div><dt>Antenna</dt><dd>7.3 m</dd></div>
          <div><dt>Bands</dt><dd>S, X, Ka</dd></div>
          <div><dt>Uptime</dt><dd>99.98%</dd></div>
          <div><dt>Passes today</dt><dd>212</dd></div>
          <div><dt>Downlink today</dt><dd>14.2 TB</dd></div>
          <div><dt>State</dt><dd><void-state color="success">Online</void-state></dd></div>
          <div><dt>Site code</dt><dd data-void-type="code">SVB-1</dd></div>
        </dl>
      </void-description-list>
      <void-description-list>
        <dl>
          <div><dt>Region</dt><dd>Arctic</dd></div>
          <div><dt>Position</dt><dd>78.23° N, 15.39° E</dd></div>
          <div><dt>Antenna</dt><dd>7.3 m</dd></div>
          <div><dt>Site code</dt><dd data-void-type="code">SVB-1</dd></div>
        </dl>
      </void-description-list>
      <void-description-list columns="2">
        <dl>
          <div><dt>Receiver</dt><dd>Nominal</dd></div>
          <div><dt>Drive</dt><dd>Nominal</dd></div>
          <div><dt>Feed temperature</dt><dd>−41.2 °C</dd></div>
          <div><dt>Wind</dt><dd>9 m/s</dd></div>
        </dl>
      </void-description-list>
      <void-description-list justify="start">
        <dl>
          <div><dt>Operator</dt><dd>Kongsberg Satellite Services</dd></div>
          <div><dt>State</dt><dd><void-state color="success">Online</void-state></dd></div>
          <div><dt>Notes</dt><dd>Closed to visitors from November to February; deliveries by arrangement.</dd></div>
        </dl>
      </void-description-list>
    `),
};

// One thing per line with a control or a value at the end.
export const Rows: Story = {
  render: () =>
    inPage(html`
      <void-rows>
        <void-row>
          <void-row-text>
            <span>Accept passes automatically</span>
            <span data-void-type="caption">New passes are scheduled without review.</span>
          </void-row-text>
          <void-switch checked aria-label="Accept passes automatically"></void-switch>
        </void-row>
        <void-row>
          <void-row-text>
            <span>Weather hold</span>
            <span data-void-type="caption">Pause scheduling above 25 m/s wind.</span>
          </void-row-text>
          <void-switch aria-label="Weather hold"></void-switch>
        </void-row>
        <void-row>
          <void-row-text>
            <span>Region</span>
            <span data-void-type="caption">Where new stations are created.</span>
          </void-row-text>
          <span data-void-type="code">eu-north-2</span>
        </void-row>
      </void-rows>
    `),
};

// A tone on a row: its text and the code text in it are one status colour.
export const RowsWithTone: Story = {
  render: () =>
    inPage(html`
      <void-rows>
        <void-row>
          <span>Carrier lock on MRD-0412</span>
          <span data-void-type="code">14:02:11</span>
        </void-row>
        <void-row color="warning">
          <void-row-text>
            <span>Warning: signal to noise below 5 dB</span>
            <span data-void-type="caption">Tromsø 2, X band</span>
          </void-row-text>
          <span data-void-type="code">14:02:48</span>
        </void-row>
        <void-row color="error">
          <span>Error: carrier lost</span>
          <span data-void-type="code">14:03:05</span>
        </void-row>
        <void-row color="success">
          <span>Carrier lock restored</span>
          <span data-void-type="code">14:03:40</span>
        </void-row>
      </void-rows>
    `),
};

// A state as a dot and a word: colour is never the only signal.
export const State: Story = {
  render: () =>
    inPage(html`
      <void-stack gap="tight">
        <void-state color="success">Online</void-state>
        <void-state color="success" pulse>Tracking MRD-0412</void-state>
        <void-state color="info">Maintenance</void-state>
        <void-state color="warning">Degraded</void-state>
        <void-state color="caution">At risk</void-state>
        <void-state color="error">Offline</void-state>
        <void-state color="notice">Preview</void-state>
        <void-state>Idle</void-state>
        <void-state size="lg" color="success" pulse>Tracking MRD-0412</void-state>
      </void-stack>
    `),
};

// Nothing here, why, and what to do about it.
export const EmptyState: Story = {
  render: () =>
    inPage(html`
      <void-empty bordered>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"></circle><path d="m20 20-4.5-4.5"></path></svg>
        <h3>No passes match</h3>
        <p>Nothing is assigned to this station in the next 24 hours. Try another band, or assign a pass.</p>
        <void-actions>
          <void-button>Clear filters</void-button>
          <void-button variant="filled">Assign a pass</void-button>
        </void-actions>
      </void-empty>
      <void-empty size="sm">
        <h3>No notes</h3>
        <p>Notes are shown to the operator on call.</p>
        <void-actions><void-button size="sm">Add a note</void-button></void-actions>
      </void-empty>
    `),
};

// Search, filters, a count and list actions above a table.
export const Toolbar: Story = {
  render: () =>
    inPage(html`
      <void-section>
        <void-toolbar>
          <void-input type="search" placeholder="Search stations" aria-label="Search stations"></void-input>
          <void-select aria-label="Station region">
            <select>
              <option>All regions</option>
              <option>Arctic</option>
              <option>Southern</option>
            </select>
          </void-select>
          <void-select aria-label="Station state">
            <select>
              <option>Any state</option>
              <option>Online</option>
              <option>Degraded</option>
            </select>
          </void-select>
          <void-spacer></void-spacer>
          <span>3 of 44</span>
          <void-button variant="ghost">Export</void-button>
        </void-toolbar>
        <void-table aria-label="Stations">
          <table>
            <thead>
              <tr><th>Station</th><th>State</th><th data-numeric>Passes</th><th></th></tr>
            </thead>
            <tbody>
              <tr>
                <td><void-row-text><span>Svalbard 1</span><span data-void-type="caption">Arctic</span></void-row-text></td>
                <td><void-state color="success">Online</void-state></td>
                <td data-numeric>212</td>
                <td><void-actions justify="end"><void-button variant="ghost" size="sm">Open</void-button></void-actions></td>
              </tr>
              <tr>
                <td><void-row-text><span>Tromsø 2</span><span data-void-type="caption">Arctic</span></void-row-text></td>
                <td><void-state color="warning">Degraded</void-state></td>
                <td data-numeric>96</td>
                <td><void-actions justify="end"><void-button variant="ghost" size="sm">Open</void-button></void-actions></td>
              </tr>
              <tr>
                <td><void-row-text><span>Troll</span><span data-void-type="caption">Southern</span></void-row-text></td>
                <td><void-state color="error">Offline</void-state></td>
                <td data-numeric>0</td>
                <td><void-actions justify="end"><void-button variant="ghost" size="sm">Open</void-button></void-actions></td>
              </tr>
            </tbody>
          </table>
        </void-table>
      </void-section>
    `),
};
