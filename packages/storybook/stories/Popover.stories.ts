import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Components/Popover',
  component: 'void-popover',
  tags: ['autodocs'],
  argTypes: {
    open: {
      control: { type: 'boolean' },
    },
    position: {
      control: { type: 'select' },
      options: ['top', 'bottom', 'left', 'right'],
    },
    trigger: {
      control: { type: 'select' },
      options: ['click', 'manual'],
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => html`
    <div style="padding: 4rem; display: flex; justify-content: center;">
      <void-popover>
        <button style="padding: 0.5rem 1rem; cursor: pointer;">Open Popover</button>
        <div>
          <p style="margin: 0 0 0.5rem;">Popover content</p>
          <p style="margin: 0; opacity: 0.7;">Click outside or press Escape to close.</p>
        </div>
      </void-popover>
    </div>
  `,
};

export const Positions: Story = {
  render: () => html`
    <div style="padding: 6rem; display: flex; gap: 1.5rem; flex-wrap: wrap; justify-content: center;">
      <void-popover position="top">
        <button style="padding: 0.5rem 1rem; cursor: pointer;">Top</button>
        <div>Opens above</div>
      </void-popover>
      <void-popover position="bottom">
        <button style="padding: 0.5rem 1rem; cursor: pointer;">Bottom</button>
        <div>Opens below</div>
      </void-popover>
      <void-popover position="left">
        <button style="padding: 0.5rem 1rem; cursor: pointer;">Left</button>
        <div>Opens to the left</div>
      </void-popover>
      <void-popover position="right">
        <button style="padding: 0.5rem 1rem; cursor: pointer;">Right</button>
        <div>Opens to the right</div>
      </void-popover>
    </div>
  `,
};

export const WithRichContent: Story = {
  render: () => html`
    <div style="padding: 4rem; display: flex; justify-content: center;">
      <void-popover>
        <button style="padding: 0.5rem 1rem; cursor: pointer;">User Menu</button>
        <div style="display: flex; flex-direction: column; gap: 0.5rem; min-width: 10rem;">
          <a href="#" style="display: block; padding: 0.25rem 0; text-decoration: none;">Profile</a>
          <a href="#" style="display: block; padding: 0.25rem 0; text-decoration: none;">Settings</a>
          <hr style="margin: 0.25rem 0; border: none; border-top: 1px solid;" />
          <a href="#" style="display: block; padding: 0.25rem 0; text-decoration: none;">Sign out</a>
        </div>
      </void-popover>
    </div>
  `,
};

export const ManualTrigger: Story = {
  render: () => {
    const open = (e: Event) => {
      const btn = e.target as HTMLElement;
      const popover = btn.nextElementSibling as HTMLElement & { open: boolean };
      popover.open = true;
    };
    const close = (e: Event) => {
      const btn = e.target as HTMLElement;
      const popover = btn.closest('void-popover') as HTMLElement & { open: boolean };
      if (popover) popover.open = false;
    };
    return html`
      <div style="padding: 4rem; display: flex; gap: 1rem; align-items: flex-start;">
        <button @click="${open}" style="padding: 0.5rem 1rem; cursor: pointer;">Open Programmatically</button>
        <void-popover trigger="manual">
          <span></span>
          <div>
            <p style="margin: 0 0 0.75rem;">Manually controlled popover.</p>
            <button @click="${close}" style="padding: 0.25rem 0.75rem; cursor: pointer;">Close</button>
          </div>
        </void-popover>
      </div>
    `;
  },
};
