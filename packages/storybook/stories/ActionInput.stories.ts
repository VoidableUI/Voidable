import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Form/ActionInput',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Input field with an attached icon button for copy-to-clipboard inputs, search boxes, and similar input-plus-action patterns.',
      },
    },
  },
  argTypes: {
    value: { control: 'text' },
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
    readonly: { control: 'boolean' },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    color: { control: 'select', options: ['default', 'error', 'warning', 'success', 'info', 'notice'] },
    type: { control: 'select', options: ['text', 'password'] },
    icon: { control: 'select', options: ['search', 'copy', 'send', 'eye', 'eye-off', 'check', 'x', 'arrow-right', 'clipboard'] },
    actionLabel: { control: 'text' },
    position: { control: 'select', options: ['left', 'right'] },
  },
  render: (args) => html`
    <void-action-input
      .value=${args.value ?? ''}
      placeholder=${args.placeholder || 'Enter text...'}
      size=${args.size || 'md'}
      color=${args.color || 'default'}
      icon=${args.icon || 'search'}
      action-label=${args.actionLabel || 'Action'}
      position=${args.position || 'right'}
      ?disabled=${args.disabled}
      ?readonly=${args.readonly}
      style="width: 320px;"
    ></void-action-input>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { placeholder: 'Search...', icon: 'search', actionLabel: 'Search' },
};

export const CopyToClipboard: Story = {
  args: { value: 'vk_live_9449786fa67cd25f', icon: 'copy', actionLabel: 'Copy', readonly: true },
};

export const SendMessage: Story = {
  args: { placeholder: 'Type a message...', icon: 'send', actionLabel: 'Send' },
};

export const PasswordReveal: Story = {
  render: () => html`
    <void-action-input
      value="secret-password"
      type="password"
      icon="eye"
      action-label="Toggle visibility"
      style="width: 320px;"
      @void-action=${(e: Event) => {
        const el = e.target as any;
        const visible = el.type === 'text';
        el.type = visible ? 'password' : 'text';
        el.icon = visible ? 'eye' : 'eye-off';
      }}
    ></void-action-input>
  `,
};

export const PasswordPushToReveal: Story = {
  render: () => {
    const reveal = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest('.void-action-input-btn')) return;
      const el = e.currentTarget as any;
      el.type = 'text';
      el.icon = 'eye-off';
    };
    const hide = (e: Event) => {
      const el = (e.currentTarget as any);
      el.type = 'password';
      el.icon = 'eye';
    };
    return html`
      <void-action-input
        value="secret-password"
        type="password"
        icon="eye"
        action-label="Hold to reveal"
        style="width: 320px;"
        @pointerdown=${reveal}
        @pointerup=${hide}
        @pointerleave=${hide}
      ></void-action-input>
    `;
  },
};

export const ButtonLeft: Story = {
  args: { placeholder: 'Search...', icon: 'search', actionLabel: 'Search', position: 'left' },
};

export const Icons: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px; width: 320px;">
      <void-action-input icon="search" placeholder="Search..." action-label="Search"></void-action-input>
      <void-action-input icon="copy" value="Copy this text" action-label="Copy" readonly></void-action-input>
      <void-action-input icon="send" placeholder="Type a message..." action-label="Send"></void-action-input>
      <void-action-input icon="eye" value="secret-value" action-label="Show"></void-action-input>
      <void-action-input icon="clipboard" placeholder="Paste here..." action-label="Paste"></void-action-input>
      <void-action-input icon="arrow-right" placeholder="Go to..." action-label="Go"></void-action-input>
      <void-action-input icon="x" value="Clear me" action-label="Clear"></void-action-input>
    </div>
  `,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px; width: 320px;">
      <void-action-input size="sm" icon="search" placeholder="Small"></void-action-input>
      <void-action-input size="md" icon="search" placeholder="Medium"></void-action-input>
      <void-action-input size="lg" icon="search" placeholder="Large"></void-action-input>
    </div>
  `,
};

export const Colors: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px; width: 320px;">
      <void-action-input color="default" icon="search" placeholder="Default"></void-action-input>
      <void-action-input color="error" icon="x" placeholder="Error"></void-action-input>
      <void-action-input color="warning" icon="eye" placeholder="Warning"></void-action-input>
      <void-action-input color="success" icon="check" placeholder="Success"></void-action-input>
      <void-action-input color="info" icon="search" placeholder="Info"></void-action-input>
      <void-action-input color="notice" icon="clipboard" placeholder="Notice"></void-action-input>
    </div>
  `,
};

export const Disabled: Story = {
  args: { disabled: true, value: 'Cannot edit', icon: 'copy', actionLabel: 'Copy' },
};

export const Readonly: Story = {
  args: { readonly: true, value: 'Read only value', icon: 'copy', actionLabel: 'Copy' },
};
