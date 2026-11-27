import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';
import { argTypesFor } from '../.storybook/manifest';

const meta: Meta = {
  title: 'Components/Card',
  component: 'void-card',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Content grouping containers for dashboard widgets, product listings, and media previews. Written with header, body and footer parts; supports variants and configurable padding.',
      },
    },
  },
  argTypes: argTypesFor('void-card', { heading: { control: { type: 'text' }, description: 'Story control: the text of the <void-card-title> part (empty for no header).' } }),
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {
    heading: 'Card title',
    variant: 'default',
    padding: 'md',
  },
  render: (args) => html`
    <void-card variant=${args.variant} padding=${args.padding}>
      ${args.heading ? html`<void-card-header><void-card-title>${args.heading}</void-card-title></void-card-header>` : ''}
      <void-card-body>
        <p>This is a default card. Use it to present self-contained pieces of content such as summaries, previews, or calls to action.</p>
      </void-card-body>
    </void-card>
  `,
};

export const WithHeading: Story = {
  render: () => html`
    <void-card>
      <void-card-header>
        <void-card-title>Project Overview</void-card-title>
      </void-card-header>
      <void-card-body>
        <p>Track milestones, manage contributors, and review progress across all active workstreams.</p>
      </void-card-body>
    </void-card>
  `,
};

export const Elevated: Story = {
  render: () => html`
    <void-card variant="elevated">
      <void-card-header>
        <void-card-title>Weekly Summary</void-card-title>
      </void-card-header>
      <void-card-body>
        <p>You completed 12 tasks this week, a 20% increase from last week. Keep up the momentum.</p>
      </void-card-body>
    </void-card>
  `,
};

export const Outlined: Story = {
  render: () => html`
    <void-card variant="bordered">
      <void-card-header>
        <void-card-title>Integration Status</void-card-title>
      </void-card-header>
      <void-card-body>
        <p>All connected services are operating normally. Last sync completed at 08:45 AM today.</p>
      </void-card-body>
    </void-card>
  `,
};

export const Padding: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <void-card padding="none">
        <void-card-header>
          <void-card-title>No Padding</void-card-title>
        </void-card-header>
        <void-card-body>
          <p>Content sits flush against the card edges.</p>
        </void-card-body>
      </void-card>
      <void-card padding="sm">
        <void-card-header>
          <void-card-title>Small Padding</void-card-title>
        </void-card-header>
        <void-card-body>
          <p>Compact spacing for dense layouts.</p>
        </void-card-body>
      </void-card>
      <void-card padding="md">
        <void-card-header>
          <void-card-title>Medium Padding</void-card-title>
        </void-card-header>
        <void-card-body>
          <p>Balanced spacing suitable for most use cases.</p>
        </void-card-body>
      </void-card>
      <void-card padding="lg">
        <void-card-header>
          <void-card-title>Large Padding</void-card-title>
        </void-card-header>
        <void-card-body>
          <p>Generous spacing for featured or highlighted content.</p>
        </void-card-body>
      </void-card>
    </div>
  `,
};

export const NoHeader: Story = {
  render: () => html`
    <void-card>
      <void-card-body>
        <p>This card has no heading. It works well for simple content blocks that don't need a title, such as quotes, stats, or media previews.</p>
      </void-card-body>
    </void-card>
  `,
};

export const InFlexColumn: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Cards never shrink or scroll inside a height-constrained flex column. Add `scrollable` to opt in to an internal scrollbar.',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; height: 12rem; overflow: auto;">
      <void-card><void-card-header><void-card-title>First</void-card-title></void-card-header><void-card-body><p>Keeps its natural height.</p><p>The parent scrolls instead.</p></void-card-body></void-card>
      <void-card><void-card-header><void-card-title>Second</void-card-title></void-card-header><void-card-body><p>Also keeps its natural height.</p><p>No inner scrollbar.</p></void-card-body></void-card>
    </div>
  `,
};

export const Scrollable: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; height: 10rem;">
      <void-card scrollable><void-card-header><void-card-title>Scrollable</void-card-title></void-card-header><void-card-body><p>Opt-in.</p><p>Content.</p><p>That</p><p>scrolls</p><p>inside</p><p>the card.</p></void-card-body></void-card>
    </div>
  `,
};

export const LinkCard: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The one link goes in the title. Its text is the name, the description is read after it, the whole card is the hit area, and Tab stops once. Text inside the card cannot be selected. Never wrap the card in an <a>, and never put a second control inside.',
      },
    },
  },
  render: () => html`
    <void-card>
      <void-card-header>
        <void-card-title><a href="#ground-network">Ground network</a></void-card-title>
        <void-card-description>41 stations, 2 in maintenance.</void-card-description>
      </void-card-header>
      <void-card-body>
        <p>Downlink at 79.6 TB today, 64% of the daily plan.</p>
      </void-card-body>
    </void-card>
  `,
};

export const UnavailableCard: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'aria-disabled="true" mutes the title and icons, keeps the link focusable and inert, and the description is the reason, announced with it.',
      },
    },
  },
  render: () => html`
    <void-card aria-disabled="true">
      <void-card-header>
        <void-card-title><a href="#pro">Pro plan</a></void-card-title>
        <void-card-description>Upgrade your workspace to unlock this plan.</void-card-description>
      </void-card-header>
      <void-card-body><p>Unlimited stations.</p></void-card-body>
    </void-card>
  `,
};

export const ButtonCard: Story = {
  parameters: { docs: { description: { story: 'A button in the title makes the whole card a button: listen for its click as for any button.' } } },
  render: () => html`
    <void-card variant="bordered">
      <void-card-header>
        <void-card-title><button type="button">Add a station</button></void-card-title>
        <void-card-description>Register a new antenna.</void-card-description>
      </void-card-header>
      <void-card-body>
        <p>Opens the registration form.</p>
      </void-card-body>
    </void-card>
  `,
};

export const CardGrid: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'void-card-grid packs the cards in as many columns as fit, each at least --void-card-grid-min wide (16rem), the cards of a row equally tall. Static, link and button cards mix freely.',
      },
    },
  },
  render: () => html`
    <void-card-grid>
      <void-card>
        <void-card-header>
          <void-card-title><a href="#ground-network">Ground network</a></void-card-title>
          <void-card-description>41 stations, 2 in maintenance.</void-card-description>
        </void-card-header>
        <void-card-body><p>Downlink at 79.6 TB today.</p></void-card-body>
        <void-card-footer>Updated a minute ago</void-card-footer>
      </void-card>
      <void-card>
        <void-card-header>
          <void-card-title><button type="button">Add a station</button></void-card-title>
          <void-card-description>Register a new antenna.</void-card-description>
        </void-card-header>
        <void-card-body><p>Opens the registration form. A longer body makes this card taller, and the others in its row follow.</p><p>Footers line up along the bottom.</p></void-card-body>
        <void-card-footer>Takes two minutes</void-card-footer>
      </void-card>
      <void-card>
        <void-card-header><void-card-title>Static card</void-card-title></void-card-header>
        <void-card-body><p>No control: nothing to click, and the text can be selected.</p></void-card-body>
        <void-card-footer>Read only</void-card-footer>
      </void-card>
      <void-card variant="elevated">
        <void-card-header>
          <void-card-title><a href="#alerts">Alerts</a></void-card-title>
        </void-card-header>
        <void-card-body><p>3 open.</p></void-card-body>
      </void-card>
    </void-card-grid>
  `,
};
