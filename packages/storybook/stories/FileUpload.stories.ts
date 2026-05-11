import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Form/FileUpload',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Drag-and-drop file picker for document upload forms, image attachment flows, and import wizards. Supports file type filtering, multiple files, and size validation.',
      },
    },
  },
  argTypes: {
    accept: { control: 'text' },
    multiple: { control: 'boolean' },
    disabled: { control: 'boolean' },
    maxSize: { control: 'number' },
    error: { control: 'text' },
  },
  render: (args) => html`
    <void-file-upload
      accept=${args.accept || ''}
      ?multiple=${args.multiple}
      ?disabled=${args.disabled}
      .maxSize=${args.maxSize || 0}
      error=${args.error || ''}
    ></void-file-upload>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};

export const MultipleFiles: Story = {
  args: { multiple: true },
};

export const AcceptImages: Story = {
  args: { accept: 'image/*', multiple: true },
};

export const WithError: Story = {
  args: { error: 'File upload failed. Please try again.' },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const WithMaxSize: Story = {
  args: { maxSize: 1048576, multiple: true },
  render: () => html`
    <div style="max-width: 480px;">
      <void-file-upload multiple .maxSize=${1048576}></void-file-upload>
      <p style="font-size: 12px; color: #888; margin-top: 8px;">Max file size: 1 MB</p>
    </div>
  `,
};

export const AcceptDocuments: Story = {
  args: { accept: '.pdf,.doc,.docx', multiple: true },
};
