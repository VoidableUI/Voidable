import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Components/Dialog',
  component: 'void-dialog',
  tags: ['autodocs'],
  argTypes: {
    heading: {
      control: { type: 'text' },
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg', 'xl'],
    },
    closable: {
      control: { type: 'boolean' },
    },
    open: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => {
    const toggle = (e: Event) => {
      const btn = e.target as HTMLElement;
      const dialog = btn.nextElementSibling as HTMLElement & { open: boolean };
      dialog.open = true;
    };
    const onClose = (e: Event) => {
      (e.target as HTMLElement & { open: boolean }).open = false;
    };
    return html`
      <button @click="${toggle}" style="padding: 0.5rem 1rem; cursor: pointer;">Open Dialog</button>
      <void-dialog heading="Confirm Action" @void-close="${onClose}">
        <p>Are you sure you want to proceed? This action cannot be undone.</p>
      </void-dialog>
    `;
  },
};

export const Sizes: Story = {
  render: () => {
    const openDialog = (id: string) => {
      const el = document.getElementById(id) as HTMLElement & { open: boolean };
      if (el) el.open = true;
    };
    const onClose = (e: Event) => {
      (e.target as HTMLElement & { open: boolean }).open = false;
    };
    return html`
      <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
        <button @click="${() => openDialog('dialog-sm')}" style="padding: 0.5rem 1rem; cursor: pointer;">Small</button>
        <button @click="${() => openDialog('dialog-md')}" style="padding: 0.5rem 1rem; cursor: pointer;">Medium</button>
        <button @click="${() => openDialog('dialog-lg')}" style="padding: 0.5rem 1rem; cursor: pointer;">Large</button>
        <button @click="${() => openDialog('dialog-xl')}" style="padding: 0.5rem 1rem; cursor: pointer;">Extra Large</button>
      </div>
      <void-dialog id="dialog-sm" heading="Small Dialog" size="sm" @void-close="${onClose}">
        <p>This is a small dialog (24rem max-width).</p>
      </void-dialog>
      <void-dialog id="dialog-md" heading="Medium Dialog" size="md" @void-close="${onClose}">
        <p>This is a medium dialog (32rem max-width).</p>
      </void-dialog>
      <void-dialog id="dialog-lg" heading="Large Dialog" size="lg" @void-close="${onClose}">
        <p>This is a large dialog (48rem max-width).</p>
      </void-dialog>
      <void-dialog id="dialog-xl" heading="Extra Large Dialog" size="xl" @void-close="${onClose}">
        <p>This is an extra large dialog (64rem max-width).</p>
      </void-dialog>
    `;
  },
};

export const NotClosable: Story = {
  render: () => {
    const toggle = (e: Event) => {
      const btn = e.target as HTMLElement;
      const dialog = btn.nextElementSibling as HTMLElement & { open: boolean };
      dialog.open = true;
    };
    const dismiss = (e: Event) => {
      const btn = e.target as HTMLElement;
      const dialog = btn.closest('void-dialog') as HTMLElement & { open: boolean };
      if (dialog) dialog.open = false;
    };
    return html`
      <button @click="${toggle}" style="padding: 0.5rem 1rem; cursor: pointer;">Open Non-Closable Dialog</button>
      <void-dialog heading="Required Action" ?closable="${false}">
        <p>You must complete this action before continuing. Press the button below to confirm.</p>
        <div style="margin-top: 1rem;">
          <button @click="${dismiss}" style="padding: 0.5rem 1rem; cursor: pointer;">I Understand</button>
        </div>
      </void-dialog>
    `;
  },
};
