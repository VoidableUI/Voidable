import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Rails/Devise/Sign Up',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Devise registration view prototype. Presents a sign-up form with email, password, and password confirmation fields.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

const togglePasswordVisibility = (e: Event) => {
  const el = e.target as any;
  const visible = el.type === 'text';
  el.type = visible ? 'password' : 'text';
  el.icon = visible ? 'eye' : 'eye-off';
};

const formWrapper = (content: unknown) => html`
  <div style="max-width: 28rem; margin: 0 auto; padding: 2rem;">
    <void-card>
      <div style="padding: var(--void-space-6);">
        ${content}
      </div>
    </void-card>
  </div>
`;

export const Default: Story = {
  render: () => formWrapper(html`
    <h1 style="margin: 0 0 var(--void-space-5) 0; font-family: var(--void-font-sans); font-size: var(--void-text-xl); font-weight: var(--void-weight-bold); color: var(--void-color-text);">Sign up</h1>

    <form style="display: flex; flex-direction: column; gap: var(--void-space-4);">
      <void-field label="Email">
        <void-input type="email" placeholder="you@example.com" autocomplete="email"></void-input>
      </void-field>

      <void-field label="Password" helper="6 characters minimum">
        <void-action-input type="password" icon="eye" action-label="Toggle visibility" autocomplete="new-password" @void-action=${togglePasswordVisibility}></void-action-input>
      </void-field>

      <void-field label="Password confirmation">
        <void-action-input type="password" icon="eye" action-label="Toggle visibility" autocomplete="new-password" @void-action=${togglePasswordVisibility}></void-action-input>
      </void-field>

      <div style="padding-top: var(--void-space-2);">
        <void-button type="submit" color="success" style="width: 100%;">Sign up</void-button>
      </div>
    </form>

    <div style="display: flex; align-items: center; gap: var(--void-space-3); margin-top: var(--void-space-4);">
      <div style="flex: 1; height: 1px; background: var(--void-color-border);"></div>
      <span style="font-family: var(--void-font-sans); font-size: var(--void-text-xs); color: var(--void-color-text-muted); text-transform: uppercase; letter-spacing: 0.05em;">or</span>
      <div style="flex: 1; height: 1px; background: var(--void-color-border);"></div>
    </div>

    <div style="margin-top: var(--void-space-3);">
      <void-button variant="ghost" style="width: 100%;">Sign in</void-button>
    </div>
  `),
};

export const WithErrors: Story = {
  render: () => formWrapper(html`
    <h1 style="margin: 0 0 var(--void-space-5) 0; font-family: var(--void-font-sans); font-size: var(--void-text-xl); font-weight: var(--void-weight-bold); color: var(--void-color-text);">Sign up</h1>

    <form style="display: flex; flex-direction: column; gap: var(--void-space-4);">
      <void-alert color="error">
        2 errors prohibited this account from being saved:
        <ul style="margin: var(--void-space-2) 0 0 var(--void-space-4); padding: 0;">
          <li>Email has already been taken</li>
          <li>Password is too short (minimum is 6 characters)</li>
        </ul>
      </void-alert>

      <void-field label="Email" error="has already been taken">
        <void-input type="email" placeholder="you@example.com" autocomplete="email"></void-input>
      </void-field>

      <void-field label="Password" helper="6 characters minimum" error="is too short (minimum is 6 characters)">
        <void-action-input type="password" icon="eye" action-label="Toggle visibility" autocomplete="new-password" @void-action=${togglePasswordVisibility}></void-action-input>
      </void-field>

      <void-field label="Password confirmation">
        <void-action-input type="password" icon="eye" action-label="Toggle visibility" autocomplete="new-password" @void-action=${togglePasswordVisibility}></void-action-input>
      </void-field>

      <div style="padding-top: var(--void-space-2);">
        <void-button type="submit" color="success" style="width: 100%;">Sign up</void-button>
      </div>
    </form>

    <div style="display: flex; align-items: center; gap: var(--void-space-3); margin-top: var(--void-space-4);">
      <div style="flex: 1; height: 1px; background: var(--void-color-border);"></div>
      <span style="font-family: var(--void-font-sans); font-size: var(--void-text-xs); color: var(--void-color-text-muted); text-transform: uppercase; letter-spacing: 0.05em;">or</span>
      <div style="flex: 1; height: 1px; background: var(--void-color-border);"></div>
    </div>

    <div style="margin-top: var(--void-space-3);">
      <void-button variant="ghost" style="width: 100%;">Sign in</void-button>
    </div>
  `),
};

export const Filled: Story = {
  render: () => formWrapper(html`
    <h1 style="margin: 0 0 var(--void-space-5) 0; font-family: var(--void-font-sans); font-size: var(--void-text-xl); font-weight: var(--void-weight-bold); color: var(--void-color-text);">Sign up</h1>

    <form style="display: flex; flex-direction: column; gap: var(--void-space-4);">
      <void-field label="Email">
        <void-input type="email" value="user@example.com" placeholder="you@example.com" autocomplete="email"></void-input>
      </void-field>

      <void-field label="Password" helper="6 characters minimum">
        <void-action-input type="password" icon="eye" action-label="Toggle visibility" autocomplete="new-password" @void-action=${togglePasswordVisibility}></void-action-input>
      </void-field>

      <void-field label="Password confirmation">
        <void-action-input type="password" icon="eye" action-label="Toggle visibility" autocomplete="new-password" @void-action=${togglePasswordVisibility}></void-action-input>
      </void-field>

      <div style="padding-top: var(--void-space-2);">
        <void-button type="submit" color="success" style="width: 100%;">Sign up</void-button>
      </div>
    </form>

    <div style="display: flex; align-items: center; gap: var(--void-space-3); margin-top: var(--void-space-4);">
      <div style="flex: 1; height: 1px; background: var(--void-color-border);"></div>
      <span style="font-family: var(--void-font-sans); font-size: var(--void-text-xs); color: var(--void-color-text-muted); text-transform: uppercase; letter-spacing: 0.05em;">or</span>
      <div style="flex: 1; height: 1px; background: var(--void-color-border);"></div>
    </div>

    <div style="margin-top: var(--void-space-3);">
      <void-button variant="ghost" style="width: 100%;">Sign in</void-button>
    </div>
  `),
};
