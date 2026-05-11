import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';
import { VoidToastContainer } from '@voidable/ui';

const meta: Meta = {
  title: 'Components/Toast',
  component: 'void-toast',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Ephemeral notification for confirming actions, surfacing errors, and delivering system messages without interrupting the user flow. Stacks in a corner via VoidToastContainer and auto-dismisses after a configurable duration.',
      },
    },
  },
  argTypes: {
    color: {
      control: { type: 'select' },
      options: ['default', 'error', 'warning', 'success', 'info'],
    },
    duration: {
      control: { type: 'number' },
    },
    dismissable: {
      control: { type: 'boolean' },
    },
    heading: {
      control: { type: 'text' },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => {
    const show = () => {
      VoidToastContainer.show({ message: 'Operation completed successfully.', color: 'default' });
    };
    return html`
      <void-toast-container position='bottom-right'></void-toast-container>
      <button @click='${show}' style='padding: 0.5rem 1rem; cursor: pointer;'>Show Toast</button>
    `;
  },
};

export const Colors: Story = {
  render: () => {
    const show = (color: string, message: string) => {
      VoidToastContainer.show({ message, color: color as any });
    };
    return html`
      <void-toast-container position='bottom-right'></void-toast-container>
      <div style='display: flex; gap: 0.5rem; flex-wrap: wrap;'>
        <button @click='${() => show('default', 'Default notification.')}' style='padding: 0.5rem 1rem; cursor: pointer;'>Default</button>
        <button @click='${() => show('error', 'Something went wrong.')}' style='padding: 0.5rem 1rem; cursor: pointer;'>Error</button>
        <button @click='${() => show('warning', 'Proceed with caution.')}' style='padding: 0.5rem 1rem; cursor: pointer;'>Warning</button>
        <button @click='${() => show('success', 'Action completed successfully.')}' style='padding: 0.5rem 1rem; cursor: pointer;'>Success</button>
        <button @click='${() => show('info', 'Here is some useful information.')}' style='padding: 0.5rem 1rem; cursor: pointer;'>Info</button>
      </div>
    `;
  },
};

export const WithHeading: Story = {
  render: () => {
    const show = () => {
      VoidToastContainer.show({ message: 'Your file has been saved.', heading: 'Saved', color: 'success' });
    };
    return html`
      <void-toast-container position='bottom-right'></void-toast-container>
      <button @click='${show}' style='padding: 0.5rem 1rem; cursor: pointer;'>Show Toast with Heading</button>
    `;
  },
};

export const NoDismiss: Story = {
  render: () => {
    const show = () => {
      VoidToastContainer.show({ message: 'Processing in background...', duration: 3000, dismissable: false });
    };
    return html`
      <void-toast-container position='bottom-right'></void-toast-container>
      <button @click='${show}' style='padding: 0.5rem 1rem; cursor: pointer;'>Show Non-Dismissable Toast</button>
    `;
  },
};

export const Persistent: Story = {
  render: () => {
    const show = () => {
      VoidToastContainer.show({ message: 'This toast will not auto-dismiss.', duration: 0 });
    };
    return html`
      <void-toast-container position='bottom-right'></void-toast-container>
      <button @click='${show}' style='padding: 0.5rem 1rem; cursor: pointer;'>Show Persistent Toast</button>
    `;
  },
};

export const Positions: Story = {
  render: () => {
    const showAt = (position: string) => {
      let container = document.querySelector(`void-toast-container[position="${position}"]`) as any;
      if (!container) {
        container = document.createElement('void-toast-container');
        container.setAttribute('position', position);
        document.body.appendChild(container);
      }
      const toast = document.createElement('void-toast') as any;
      toast.color = 'info';
      toast.textContent = `Position: ${position}`;
      container.appendChild(toast);
    };
    return html`
      <div style='display: flex; gap: 0.5rem; flex-wrap: wrap;'>
        <button @click='${() => showAt('top-right')}' style='padding: 0.5rem 1rem; cursor: pointer;'>Top Right</button>
        <button @click='${() => showAt('top-left')}' style='padding: 0.5rem 1rem; cursor: pointer;'>Top Left</button>
        <button @click='${() => showAt('bottom-right')}' style='padding: 0.5rem 1rem; cursor: pointer;'>Bottom Right</button>
        <button @click='${() => showAt('bottom-left')}' style='padding: 0.5rem 1rem; cursor: pointer;'>Bottom Left</button>
        <button @click='${() => showAt('top-center')}' style='padding: 0.5rem 1rem; cursor: pointer;'>Top Center</button>
        <button @click='${() => showAt('bottom-center')}' style='padding: 0.5rem 1rem; cursor: pointer;'>Bottom Center</button>
      </div>
    `;
  },
};
