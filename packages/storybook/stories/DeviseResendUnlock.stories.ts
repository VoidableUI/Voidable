import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Rails/Devise/Resend Unlock',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Devise unlock instructions resend view prototype. Allows locked-out users to request an unlock email.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => html`
    <div style="max-width: 28rem; margin: 0 auto; padding: 2rem;">
      <void-card>
        <div style="padding: var(--void-space-6);">
          <h1 style="margin: 0 0 var(--void-space-5) 0; font-family: var(--void-font-sans); font-size: var(--void-text-xl); font-weight: var(--void-weight-bold); color: var(--void-color-text);">Resend unlock instructions</h1>
          <p style="margin: calc(-1 * var(--void-space-3)) 0 var(--void-space-5) 0; font-family: var(--void-font-sans); font-size: var(--void-text-sm); color: var(--void-color-text-secondary);">Enter your email address and we'll send you instructions to unlock your account.</p>

          <form style="display: flex; flex-direction: column; gap: var(--void-space-4);">
            <void-field label="Email">
              <void-input type="email" placeholder="you@example.com" autocomplete="email"></void-input>
            </void-field>

            <div style="padding-top: var(--void-space-2);">
              <void-button type="submit" color="success" style="width: 100%;">Resend unlock instructions</void-button>
            </div>
          </form>

          <div style="display: flex; align-items: center; gap: var(--void-space-3); margin-top: var(--void-space-4);">
            <div style="flex: 1; height: 1px; background: var(--void-color-border);"></div>
            <span style="font-family: var(--void-font-sans); font-size: var(--void-text-xs); color: var(--void-color-text-muted); text-transform: uppercase; letter-spacing: 0.05em;">or</span>
            <div style="flex: 1; height: 1px; background: var(--void-color-border);"></div>
          </div>

          <div style="display: flex; flex-direction: column; gap: var(--void-space-2); margin-top: var(--void-space-3);">
            <void-button variant="ghost" style="width: 100%;">Sign in</void-button>
            <void-button variant="ghost" color="info" style="width: 100%;">Sign up</void-button>
          </div>
        </div>
      </void-card>
    </div>
  `,
};

export const WithErrors: Story = {
  render: () => html`
    <div style="max-width: 28rem; margin: 0 auto; padding: 2rem;">
      <void-card>
        <div style="padding: var(--void-space-6);">
          <h1 style="margin: 0 0 var(--void-space-5) 0; font-family: var(--void-font-sans); font-size: var(--void-text-xl); font-weight: var(--void-weight-bold); color: var(--void-color-text);">Resend unlock instructions</h1>
          <p style="margin: calc(-1 * var(--void-space-3)) 0 var(--void-space-5) 0; font-family: var(--void-font-sans); font-size: var(--void-text-sm); color: var(--void-color-text-secondary);">Enter your email address and we'll send you instructions to unlock your account.</p>

          <form style="display: flex; flex-direction: column; gap: var(--void-space-4);">
            <void-alert color="error">Email was not locked</void-alert>

            <void-field label="Email" error="was not locked">
              <void-input type="email" placeholder="you@example.com" autocomplete="email"></void-input>
            </void-field>

            <div style="padding-top: var(--void-space-2);">
              <void-button type="submit" color="success" style="width: 100%;">Resend unlock instructions</void-button>
            </div>
          </form>

          <div style="display: flex; align-items: center; gap: var(--void-space-3); margin-top: var(--void-space-4);">
            <div style="flex: 1; height: 1px; background: var(--void-color-border);"></div>
            <span style="font-family: var(--void-font-sans); font-size: var(--void-text-xs); color: var(--void-color-text-muted); text-transform: uppercase; letter-spacing: 0.05em;">or</span>
            <div style="flex: 1; height: 1px; background: var(--void-color-border);"></div>
          </div>

          <div style="display: flex; flex-direction: column; gap: var(--void-space-2); margin-top: var(--void-space-3);">
            <void-button variant="ghost" style="width: 100%;">Sign in</void-button>
            <void-button variant="ghost" color="info" style="width: 100%;">Sign up</void-button>
          </div>
        </div>
      </void-card>
    </div>
  `,
};
