import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

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
  argTypes: {
    open: {
      control: { type: 'boolean' },
    },
    side: {
      control: { type: 'select' },
      options: ['left', 'right', 'top', 'bottom'],
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
    heading: {
      control: { type: 'text' },
    },
    closable: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {
    open: true,
    side: 'right',
    size: 'md',
    heading: 'Drawer',
    closable: true,
  },
  render: (args) => html`
    <void-drawer
      ?open=${args.open}
      side=${args.side}
      size=${args.size}
      heading=${args.heading}
      ?closable=${args.closable}
    >
      <p>This is the drawer body content. Place any content here.</p>
    </void-drawer>
  `,
};

export const FromLeft: Story = {
  render: () => html`
    <void-drawer open side="left" heading="Navigation">
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
    <void-drawer open side="top" heading="Search">
      <input type="search" placeholder="Search..." style="width:100%;padding:0.5rem;box-sizing:border-box;" />
    </void-drawer>
  `,
};

export const FromBottom: Story = {
  render: () => html`
    <void-drawer open side="bottom" size="sm" heading="Actions">
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
      <void-drawer open side="right" size="sm" heading="Small (16rem)">
        <p>sm = 16rem wide</p>
      </void-drawer>
    </div>
  `,
};

export const WithoutHeading: Story = {
  render: () => html`
    <void-drawer open side="right">
      <p>This drawer has no heading.</p>
    </void-drawer>
  `,
};

export const NotClosable: Story = {
  render: () => html`
    <void-drawer open side="right" heading="Required Step" ?closable=${false}>
      <p>This drawer cannot be closed by the user. You must complete the required action.</p>
    </void-drawer>
  `,
};
