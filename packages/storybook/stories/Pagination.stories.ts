import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';
import { argTypesFor } from '../.storybook/manifest';

const meta: Meta = {
  title: 'Navigation/Pagination',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Page navigation for data tables, search result lists, and content archives with many pages. Renders first/last, siblings, and ellipsis intelligently.',
      },
    },
  },
  argTypes: argTypesFor('void-pagination'),
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (args) => html`
    <void-pagination
      total=${args.total ?? 20}
      value=${args.value ?? 6}
      siblings=${args.siblings ?? 1}
      size=${args.size ?? 'md'}
    ></void-pagination>
  `,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <void-pagination total="20" value="6" size="sm"></void-pagination>
      <void-pagination total="20" value="6" size="md"></void-pagination>
      <void-pagination total="20" value="6" size="lg"></void-pagination>
    </div>
  `,
};

export const FewPages: Story = {
  render: () => html`
    <void-pagination total="5" value="3"></void-pagination>
  `,
};

export const OnFirstPage: Story = {
  render: () => html`
    <void-pagination total="20" value="1"></void-pagination>
  `,
};

export const OnLastPage: Story = {
  render: () => html`
    <void-pagination total="20" value="20"></void-pagination>
  `,
};

export const SinglePage: Story = {
  render: () => html`
    <void-pagination total="1" value="1"></void-pagination>
  `,
};

export const WideSiblings: Story = {
  render: () => html`
    <void-pagination total="20" value="10" siblings="3"></void-pagination>
  `,
};

export const LinkMode: Story = {
  parameters: {
    docs: {
      description: {
        story: 'With `href-template` (or `param`) pages render as real links. Middle-click, copy link and no-JS work, and `void-change` stays cancelable. Turbo Drive follows the links with no adapter code.',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <void-pagination total="20" value="6" href-template="?page={page}"></void-pagination>
      <void-pagination total="20" value="6" param="page"></void-pagination>
    </div>
  `,
};
