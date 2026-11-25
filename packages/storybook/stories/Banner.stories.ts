import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';
import { argTypesFor } from '../.storybook/manifest';

const meta: Meta = {
  title: 'Components/Banner',
  component: 'void-banner',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Full-width site-level announcements for maintenance windows, cookie consent, or promotional messaging. Add a `void-banner-close` part for a dismissible one-time notice.',
      },
    },
  },
  argTypes: argTypesFor('void-banner'),
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {
    color: 'default',
    variant: 'subtle',
  },
  render: (args) => html`
    <void-banner color=${args.color} variant=${args.variant}>
      <void-banner-description>This is a page-level notification banner.</void-banner-description>
    </void-banner>
  `,
};

export const Colors: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <void-banner color="default"><void-banner-description>Default — general-purpose page message.</void-banner-description></void-banner>
      <void-banner color="error"><void-banner-description>Error — something went wrong and needs attention.</void-banner-description></void-banner>
      <void-banner color="warning"><void-banner-description>Warning — proceed with caution.</void-banner-description></void-banner>
      <void-banner color="success"><void-banner-description>Success — the operation completed successfully.</void-banner-description></void-banner>
      <void-banner color="info"><void-banner-description>Info — here is some useful information.</void-banner-description></void-banner>
      <void-banner color="notice"><void-banner-description>Notice — a routine notification for your awareness.</void-banner-description></void-banner>
    </div>
  `,
};

export const Filled: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <void-banner color="default" variant="filled"><void-banner-description>Default filled banner.</void-banner-description></void-banner>
      <void-banner color="error" variant="filled"><void-banner-description>Error filled banner.</void-banner-description></void-banner>
      <void-banner color="warning" variant="filled"><void-banner-description>Warning filled banner.</void-banner-description></void-banner>
      <void-banner color="success" variant="filled"><void-banner-description>Success filled banner.</void-banner-description></void-banner>
      <void-banner color="info" variant="filled"><void-banner-description>Info filled banner.</void-banner-description></void-banner>
      <void-banner color="notice" variant="filled"><void-banner-description>Notice filled banner.</void-banner-description></void-banner>
    </div>
  `,
};

export const Dismissable: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <void-banner color="info">
        <void-banner-description>This banner can be dismissed. Click the × button to close it.</void-banner-description>
        <void-banner-close><button type="button" aria-label="Dismiss">&times;</button></void-banner-close>
      </void-banner>
      <void-banner color="success">
        <void-banner-description>Your changes have been saved successfully.</void-banner-description>
        <void-banner-close><button type="button" aria-label="Dismiss">&times;</button></void-banner-close>
      </void-banner>
      <void-banner color="error">
        <void-banner-title>Could not submit</void-banner-title>
        <void-banner-description>Failed to submit the form. Please try again.</void-banner-description>
        <void-banner-actions><void-button size="sm">Retry</void-button></void-banner-actions>
        <void-banner-close><button type="button" aria-label="Dismiss">&times;</button></void-banner-close>
      </void-banner>
    </div>
  `,
};
