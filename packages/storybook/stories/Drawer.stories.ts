import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';
import { argTypesFor } from '../.storybook/manifest';

const meta: Meta = {
  title: 'Components/Drawer',
  component: 'void-drawer',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Slide-out panels for filters, detail views, and navigation menus that need to overlay content without a full page change. Opens from any edge of the screen.',
      },
    },
  },
  argTypes: argTypesFor('void-drawer'),
};

export default meta;
type Story = StoryObj;

// A drawer is modal (the page behind it is inert), so the stories open it from a button
// instead of rendering it open on the docs page.
type Openable = HTMLElement & { open: boolean };
const openNext = (e: Event) => {
  ((e.currentTarget as HTMLElement).nextElementSibling as Openable).open = true;
};
const closeOwn = (e: Event) => {
  ((e.currentTarget as HTMLElement).closest('void-drawer') as Openable).open = false;
};

export const Default: Story = {
  args: {
    open: false,
    side: 'right',
    size: 'md',
    heading: 'Drawer',
    closable: true,
  },
  render: (args) => html`
    <void-button @click=${openNext}>Open drawer</void-button>
    <void-drawer
      ?open=${args.open}
      side=${args.side}
      size=${args.size}
      heading=${args.heading}
      closable=${String(args.closable)}
    >
      <p>This is the drawer body content. Place any content here.</p>
    </void-drawer>
  `,
};

export const FromLeft: Story = {
  render: () => html`
    <void-button @click=${openNext}>Open navigation</void-button>
    <void-drawer side="left" heading="Navigation">
      <nav>
        <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:0.5rem;">
          <li><a href="#">Dashboard</a></li>
          <li><a href="#">Projects</a></li>
          <li><a href="#">Team</a></li>
          <li><a href="#">Settings</a></li>
        </ul>
      </nav>
    </void-drawer>
  `,
};

export const FromTop: Story = {
  render: () => html`
    <void-button @click=${openNext}>Open search</void-button>
    <void-drawer side="top" heading="Search">
      <input type="search" placeholder="Search..." style="width:100%;padding:0.5rem;box-sizing:border-box;" />
    </void-drawer>
  `,
};

export const FromBottom: Story = {
  render: () => html`
    <void-button @click=${openNext}>Open actions</void-button>
    <void-drawer side="bottom" size="sm" heading="Actions">
      <div style="display:flex;gap:0.75rem;">
        <button>Confirm</button>
        <button>Cancel</button>
      </div>
    </void-drawer>
  `,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display:flex;flex-direction:column;gap:1rem;">
      <p>Use the controls in each drawer story to switch between sm, md, and lg sizes.</p>
      <void-button @click=${openNext}>Open small drawer</void-button>
      <void-drawer side="right" size="sm" heading="Small (16rem)">
        <p>sm = 16rem wide</p>
      </void-drawer>
    </div>
  `,
};

export const WithoutHeading: Story = {
  render: () => html`
    <void-button @click=${openNext}>Open drawer</void-button>
    <void-drawer side="right" aria-label="Details">
      <p>This drawer has no heading, so it is named with aria-label.</p>
    </void-drawer>
  `,
};

export const NotClosable: Story = {
  render: () => html`
    <void-button @click=${openNext}>Open required step</void-button>
    <void-drawer side="right" heading="Required Step" closable="false">
      <p>Escape and the backdrop do not close this drawer; only the action below does.</p>
      <void-button variant="filled" @click=${closeOwn}>Complete step</void-button>
    </void-drawer>
  `,
};
