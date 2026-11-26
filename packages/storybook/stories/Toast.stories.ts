import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';
import { VoidToastContainer } from '@voidable/ui';
import { argTypesFor } from '../.storybook/manifest';

const meta: Meta = {
  title: 'Components/Toast',
  component: 'void-toast',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Ephemeral notification for confirming actions, surfacing errors, and delivering system messages without interrupting the user flow. Written as parts (title, description, actions, close), by hand or by the `toast()` helper. Stacks in a corner via VoidToastContainer and auto-dismisses after a configurable duration.',
      },
    },
  },
  argTypes: argTypesFor('void-toast'),
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => {
    const show = () => {
      VoidToastContainer.show({ description: 'Operation completed successfully.', color: 'default' });
    };
    return html`
      <void-toast-container placement='bottom-right'></void-toast-container>
      <button @click='${show}' style='padding: 0.5rem 1rem; cursor: pointer;'>Show Toast</button>
    `;
  },
};

export const Colors: Story = {
  render: () => {
    const show = (color: string, message: string) => {
      VoidToastContainer.show({ description: message, color: color as any });
    };
    return html`
      <void-toast-container placement='bottom-right'></void-toast-container>
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

export const WithTitle: Story = {
  render: () => {
    const show = () => {
      VoidToastContainer.show({ description: 'Your file has been saved.', title: 'Saved', color: 'success' });
    };
    return html`
      <void-toast-container placement='bottom-right'></void-toast-container>
      <button @click='${show}' style='padding: 0.5rem 1rem; cursor: pointer;'>Show Toast with Title</button>
    `;
  },
};

export const NoDismiss: Story = {
  render: () => {
    const show = () => {
      VoidToastContainer.show({ description: 'Processing in background...', duration: 3000, dismissable: false });
    };
    return html`
      <void-toast-container placement='bottom-right'></void-toast-container>
      <button @click='${show}' style='padding: 0.5rem 1rem; cursor: pointer;'>Show Non-Dismissable Toast</button>
    `;
  },
};

export const WithActions: Story = {
  render: () => {
    const show = () => {
      VoidToastContainer.show({
        title: 'Message archived',
        description: 'It will be deleted in 30 days.',
        actions: [{ label: 'Undo', onClick: (_e, toast) => toast.close() }],
        duration: 8000,
      });
    };
    return html`
      <void-toast-container placement='bottom-right'></void-toast-container>
      <button @click='${show}' style='padding: 0.5rem 1rem; cursor: pointer;'>Show Toast with Action</button>
    `;
  },
};

export const Persistent: Story = {
  render: () => {
    const show = () => {
      VoidToastContainer.show({ description: 'This toast will not auto-dismiss.', duration: 0 });
    };
    return html`
      <void-toast-container placement='bottom-right'></void-toast-container>
      <button @click='${show}' style='padding: 0.5rem 1rem; cursor: pointer;'>Show Persistent Toast</button>
    `;
  },
};

export const Positions: Story = {
  render: () => {
    const showAt = (position: string) => {
      let container = document.querySelector(`void-toast-container[placement="${position}"]`) as any;
      if (!container) {
        container = document.createElement('void-toast-container');
        container.setAttribute('placement', position);
        document.body.appendChild(container);
      }
      const toast = document.createElement('void-toast') as any;
      toast.color = 'info';
      toast.innerHTML = '<void-toast-description></void-toast-description><void-toast-close><button type="button" aria-label="Dismiss">&times;</button></void-toast-close>';
      toast.querySelector('void-toast-description').textContent = `Position: ${position}`;
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

export const InlinePlacement: Story = {
  parameters: {
    docs: {
      description: {
        story: '`placement="inline"` keeps the container in the page flow, so toasts push content instead of covering it. Style it with `position: sticky` from the app if it should stay in view. A container with no toasts takes no space.',
      },
    },
  },
  render: () => html`
    <div style="max-width: 28rem;">
      <void-toast-container placement="inline">
        <void-toast color="caution">
          <void-toast-title>Heads up</void-toast-title>
          <void-toast-description>Your trial ends in 3 days.</void-toast-description>
          <void-toast-close><button type="button" aria-label="Dismiss">&times;</button></void-toast-close>
        </void-toast>
      </void-toast-container>
      <p>Page content continues below the toast.</p>
    </div>
  `,
};
