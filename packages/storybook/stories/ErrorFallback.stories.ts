import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';
import { argTypesFor } from '../.storybook/manifest';

const meta: Meta = {
  title: 'Components/ErrorFallback',
  component: 'void-error-fallback',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Error state display for failed data fetches, broken features, and unexpected runtime errors. Provides an optional retry action to let users recover without a full page reload.',
      },
    },
  },
  argTypes: argTypesFor('void-error-fallback'),
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {
    heading: 'Something went wrong',
    message: '',
    retryable: false,
    retryLabel: 'Try again',
    hideIcon: false,
  },
  render: (args) => html`
    <void-error-fallback
      heading=${args.heading}
      message=${args.message}
      ?retryable=${args.retryable}
      retry-label=${args.retryLabel}
      ?hide-icon=${args.hideIcon}
    ></void-error-fallback>
  `,
};

export const WithMessage: Story = {
  render: () => html`
    <void-error-fallback
      heading="Something went wrong"
      message="We couldn't load your data. Please check your connection and try again."
    ></void-error-fallback>
  `,
};

export const Retryable: Story = {
  render: () => html`
    <void-error-fallback
      heading="Failed to load"
      message="There was a problem fetching the requested resource."
      retryable
    ></void-error-fallback>
  `,
};

export const RetryableCustomLabel: Story = {
  render: () => html`
    <void-error-fallback
      heading="Connection lost"
      message="Unable to reach the server. Check your network and try again."
      retryable
      retry-label="Reconnect"
    ></void-error-fallback>
  `,
};

export const NoIcon: Story = {
  render: () => html`
    <void-error-fallback
      heading="Page not available"
      message="This content could not be displayed."
      retryable
      hide-icon
    ></void-error-fallback>
  `,
};

export const WithParts: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Write the parts yourself and they replace the built-in default (the `heading`, `message` and `retryable` attributes no longer apply).',
      },
    },
  },
  render: () => html`
    <void-error-fallback>
      <void-error-fallback-title>Could not load invoices</void-error-fallback-title>
      <void-error-fallback-description>The server did not respond. Check your connection and try again.</void-error-fallback-description>
      <void-error-fallback-actions>
        <button type="button">Try again</button>
        <a href="/support">Contact support</a>
      </void-error-fallback-actions>
    </void-error-fallback>
  `,
};
