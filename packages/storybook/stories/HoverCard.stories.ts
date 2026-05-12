import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Components/HoverCard',
  component: 'void-hover-card',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Rich content preview card that appears on hover for user profiles, link previews, and contextual information panels. Supports four placement positions with arrow indicators.',
      },
    },
  },
  argTypes: {
    open: {
      control: { type: 'boolean' },
    },
    position: {
      control: { type: 'select' },
      options: ['top', 'bottom', 'left', 'right'],
    },
    'open-delay': {
      control: { type: 'number' },
    },
    'close-delay': {
      control: { type: 'number' },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => html`
    <div style="padding: 6rem; display: flex; justify-content: center;">
      <void-hover-card>
        <a href="#" style="font-weight: 600; text-decoration: underline; cursor: pointer;">@janedoe</a>
        <div style="display: flex; flex-direction: column; gap: 0.75rem; min-width: 18rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 3rem; height: 3rem; border-radius: 50%; background: var(--void-color-bg-subtle); display: flex; align-items: center; justify-content: center; font-weight: 600;">JD</div>
            <div>
              <div style="font-weight: 600;">Jane Doe</div>
              <div style="opacity: 0.7; font-size: 0.85em;">@janedoe</div>
            </div>
          </div>
          <p style="margin: 0; line-height: 1.4;">Full-stack developer. Open source contributor. Building things that matter.</p>
          <div style="display: flex; gap: 1rem; font-size: 0.85em; opacity: 0.7;">
            <span><strong>142</strong> following</span>
            <span><strong>2.1k</strong> followers</span>
          </div>
        </div>
      </void-hover-card>
    </div>
  `,
};

export const Positions: Story = {
  render: () => html`
    <div style="padding: 8rem; display: flex; gap: 3rem; flex-wrap: wrap; justify-content: center;">
      <void-hover-card position="top">
        <button style="padding: 0.5rem 1rem; cursor: pointer;">Top</button>
        <div>
          <p style="margin: 0;">Card opens above the trigger.</p>
        </div>
      </void-hover-card>
      <void-hover-card position="bottom">
        <button style="padding: 0.5rem 1rem; cursor: pointer;">Bottom</button>
        <div>
          <p style="margin: 0;">Card opens below the trigger.</p>
        </div>
      </void-hover-card>
      <void-hover-card position="left">
        <button style="padding: 0.5rem 1rem; cursor: pointer;">Left</button>
        <div>
          <p style="margin: 0;">Card opens to the left.</p>
        </div>
      </void-hover-card>
      <void-hover-card position="right">
        <button style="padding: 0.5rem 1rem; cursor: pointer;">Right</button>
        <div>
          <p style="margin: 0;">Card opens to the right.</p>
        </div>
      </void-hover-card>
    </div>
  `,
};

export const WithActions: Story = {
  render: () => html`
    <div style="padding: 6rem; display: flex; justify-content: center;">
      <void-hover-card>
        <a href="#" style="font-weight: 600; text-decoration: underline; cursor: pointer;">@alexsmith</a>
        <div style="display: flex; flex-direction: column; gap: 0.75rem; min-width: 18rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 3rem; height: 3rem; border-radius: 50%; background: var(--void-color-bg-subtle); display: flex; align-items: center; justify-content: center; font-weight: 600;">AS</div>
            <div>
              <div style="font-weight: 600;">Alex Smith</div>
              <div style="opacity: 0.7; font-size: 0.85em;">Staff Engineer at Acme Corp</div>
            </div>
          </div>
          <p style="margin: 0; line-height: 1.4;">Building distributed systems and developer tools.</p>
          <div style="display: flex; gap: var(--void-space-2);">
            <void-button variant="filled" size="sm" style="flex: 1;">Follow</void-button>
            <void-button variant="outline" size="sm">Message</void-button>
          </div>
        </div>
      </void-hover-card>
    </div>
  `,
};
