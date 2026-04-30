import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';

import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Components/ComposeInput',
  tags: ['autodocs'],
  argTypes: {
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
    maxlength: { control: 'number' },
  },
  render: (args) => html`
    <void-compose-input
      placeholder=${args.placeholder || 'Type a message...'}
      ?disabled=${args.disabled}
      maxlength=${args.maxlength || 0}
    ></void-compose-input>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};

export const Disabled: Story = {
  args: { disabled: true, placeholder: 'Cannot send messages' },
};

export const WithMaxlength: Story = {
  args: { maxlength: 100, placeholder: 'Max 100 characters...' },
};

export const CustomPlaceholder: Story = {
  args: { placeholder: 'Ask anything...' },
};

export const EventDemo: Story = {
  render: () => {
    const onSubmit = (e: CustomEvent) => {
      // eslint-disable-next-line no-console
      console.log('void-submit', e.detail);
    };
    return html`
      <div style="max-width: 480px;">
        <void-compose-input
          placeholder="Type and press Enter to submit..."
          @void-submit=${onSubmit}
        ></void-compose-input>
      </div>
    `;
  },
};
