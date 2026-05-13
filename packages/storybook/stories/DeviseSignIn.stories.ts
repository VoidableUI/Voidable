import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Rails/Devise/Sign In',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Devise sign-in view prototype. Presents a focused authentication form with email, password, and remember-me toggle.',
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
    <h1 style="margin: 0 0 var(--void-space-5) 0; font-family: var(--void-font-sans); font-size: var(--void-text-xl); font-weight: var(--void-weight-bold); color: var(--void-color-text);">Sign in</h1>

    <form style="display: flex; flex-direction: column; gap: var(--void-space-4);">
      <void-field label="Email">
        <void-input type="email" placeholder="you@example.com" autocomplete="email"></void-input>
      </void-field>

      <void-field label="Password">
        <void-action-input type="password" icon="eye" action-label="Toggle visibility" autocomplete="current-password" @void-action=${togglePasswordVisibility}></void-action-input>
      </void-field>

      <void-field label="Remember me">
        <void-switch></void-switch>
      </void-field>

      <div style="padding-top: var(--void-space-2);">
        <void-button type="submit" color="success" style="width: 100%;">Sign in</void-button>
      </div>

      <void-button variant="ghost" style="width: 100%;">Forgot your password?</void-button>
    </form>

    <div style="display: flex; align-items: center; gap: var(--void-space-3); margin-top: var(--void-space-4);">
      <div style="flex: 1; height: 1px; background: var(--void-color-border);"></div>
      <span style="font-family: var(--void-font-sans); font-size: var(--void-text-xs); color: var(--void-color-text-muted); text-transform: uppercase; letter-spacing: 0.05em;">or</span>
      <div style="flex: 1; height: 1px; background: var(--void-color-border);"></div>
    </div>

    <div style="margin-top: var(--void-space-3);">
      <void-button variant="ghost" color="info" style="width: 100%;">Sign up</void-button>
    </div>
  `),
};

export const WithErrors: Story = {
  render: () => formWrapper(html`
    <h1 style="margin: 0 0 var(--void-space-5) 0; font-family: var(--void-font-sans); font-size: var(--void-text-xl); font-weight: var(--void-weight-bold); color: var(--void-color-text);">Sign in</h1>

    <form style="display: flex; flex-direction: column; gap: var(--void-space-4);">
      <void-alert color="error">Invalid Email or password.</void-alert>

      <void-field label="Email">
        <void-input type="email" placeholder="you@example.com" autocomplete="email"></void-input>
      </void-field>

      <void-field label="Password">
        <void-action-input type="password" icon="eye" action-label="Toggle visibility" autocomplete="current-password" @void-action=${togglePasswordVisibility}></void-action-input>
      </void-field>

      <void-field label="Remember me">
        <void-switch></void-switch>
      </void-field>

      <div style="padding-top: var(--void-space-2);">
        <void-button type="submit" color="success" style="width: 100%;">Sign in</void-button>
      </div>

      <void-button variant="ghost" style="width: 100%;">Forgot your password?</void-button>
    </form>

    <div style="display: flex; align-items: center; gap: var(--void-space-3); margin-top: var(--void-space-4);">
      <div style="flex: 1; height: 1px; background: var(--void-color-border);"></div>
      <span style="font-family: var(--void-font-sans); font-size: var(--void-text-xs); color: var(--void-color-text-muted); text-transform: uppercase; letter-spacing: 0.05em;">or</span>
      <div style="flex: 1; height: 1px; background: var(--void-color-border);"></div>
    </div>

    <div style="margin-top: var(--void-space-3);">
      <void-button variant="ghost" color="info" style="width: 100%;">Sign up</void-button>
    </div>
  `),
};

export const Filled: Story = {
  render: () => formWrapper(html`
    <h1 style="margin: 0 0 var(--void-space-5) 0; font-family: var(--void-font-sans); font-size: var(--void-text-xl); font-weight: var(--void-weight-bold); color: var(--void-color-text);">Sign in</h1>

    <form style="display: flex; flex-direction: column; gap: var(--void-space-4);">
      <void-field label="Email">
        <void-input type="email" value="user@example.com" placeholder="you@example.com" autocomplete="email"></void-input>
      </void-field>

      <void-field label="Password">
        <void-action-input type="password" icon="eye" action-label="Toggle visibility" autocomplete="current-password" @void-action=${togglePasswordVisibility}></void-action-input>
      </void-field>

      <void-field label="Remember me">
        <void-switch></void-switch>
      </void-field>

      <div style="padding-top: var(--void-space-2);">
        <void-button type="submit" color="success" style="width: 100%;">Sign in</void-button>
      </div>

      <void-button variant="ghost" style="width: 100%;">Forgot your password?</void-button>
    </form>

    <div style="display: flex; align-items: center; gap: var(--void-space-3); margin-top: var(--void-space-4);">
      <div style="flex: 1; height: 1px; background: var(--void-color-border);"></div>
      <span style="font-family: var(--void-font-sans); font-size: var(--void-text-xs); color: var(--void-color-text-muted); text-transform: uppercase; letter-spacing: 0.05em;">or</span>
      <div style="flex: 1; height: 1px; background: var(--void-color-border);"></div>
    </div>

    <div style="margin-top: var(--void-space-3);">
      <void-button variant="ghost" color="info" style="width: 100%;">Sign up</void-button>
    </div>
  `),
};
