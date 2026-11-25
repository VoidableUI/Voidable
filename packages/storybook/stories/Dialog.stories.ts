import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';
import { argTypesFor } from '../.storybook/manifest';

const meta: Meta = {
  title: 'Components/Dialog',
  component: 'void-dialog',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Modal overlays for confirmations, detail views, and multi-step forms that require user attention before continuing. Traps focus and blocks interaction with the page behind.',
      },
    },
  },
  argTypes: argTypesFor('void-dialog'),
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
      <void-dialog @void-close="${onClose}">
        <void-dialog-title>Confirm Action</void-dialog-title>
        <void-dialog-body>
          <p>Are you sure you want to proceed? This action cannot be undone.</p>
        </void-dialog-body>
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
      </div>
      <void-dialog id="dialog-sm" size="sm" @void-close="${onClose}">
        <void-dialog-title>Small Dialog</void-dialog-title>
        <void-dialog-body>
          <p>This is a small dialog (24rem max-width).</p>
        </void-dialog-body>
      </void-dialog>
      <void-dialog id="dialog-md" size="md" @void-close="${onClose}">
        <void-dialog-title>Medium Dialog</void-dialog-title>
        <void-dialog-body>
          <p>This is a medium dialog (32rem max-width).</p>
        </void-dialog-body>
      </void-dialog>
      <void-dialog id="dialog-lg" size="lg" @void-close="${onClose}">
        <void-dialog-title>Large Dialog</void-dialog-title>
        <void-dialog-body>
          <p>This is a large dialog (48rem max-width).</p>
        </void-dialog-body>
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
      <void-dialog closable="false">
        <void-dialog-title>Required Action</void-dialog-title>
        <void-dialog-body>
          <p>You must complete this action before continuing. Press the button below to confirm.</p>
        </void-dialog-body>
        <void-dialog-actions>
          <button @click="${dismiss}" style="padding: 0.5rem 1rem; cursor: pointer;">I Understand</button>
        </void-dialog-actions>
      </void-dialog>
    `;
  },
};
