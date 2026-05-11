import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

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
  argTypes: {
    heading: {
      control: { type: 'text' },
    },
    message: {
      control: { type: 'text' },
    },
    retryable: {
      control: { type: 'boolean' },
    },
    retryLabel: {
      control: { type: 'text' },
    },
    icon: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {
    heading: 'Something went wrong',
    message: '',
    retryable: false,
    retryLabel: 'Try again',
    icon: true,
  },
  render: (args) => html`
    <void-error-fallback
      heading=${args.heading}
      message=${args.message}
      ?retryable=${args.retryable}
      retryLabel=${args.retryLabel}
      ?icon=${args.icon}
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
      retryLabel="Reconnect"
    ></void-error-fallback>
  `,
};

export const NoIcon: Story = {
  render: () => html`
    <void-error-fallback
      heading="Page not available"
      message="This content could not be displayed."
      retryable
      ?icon=${false}
    ></void-error-fallback>
  `,
};
