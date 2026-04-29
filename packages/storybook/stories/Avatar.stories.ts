import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Components/Avatar',
  component: 'void-avatar',
  tags: ['autodocs'],
  argTypes: {
    src: { control: { type: 'text' } },
    alt: { control: { type: 'text' } },
    initials: { control: { type: 'text' } },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg', 'xl', 'xxl'],
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {
    initials: 'KW',
    size: 'md',
  },
  render: (args) => html`
    <void-avatar initials=${args.initials} size=${args.size}></void-avatar>
  `,
};

export const WithImage: Story = {
  args: {
    src: 'https://i.pravatar.cc/150?img=3',
    alt: 'Avatar',
    size: 'md',
  },
  render: (args) => html`
    <void-avatar src=${args.src} alt=${args.alt} size=${args.size}></void-avatar>
  `,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 0.75rem;">
      <void-avatar initials="KW" size="sm"></void-avatar>
      <void-avatar initials="KW" size="md"></void-avatar>
      <void-avatar initials="KW" size="lg"></void-avatar>
      <void-avatar initials="KW" size="xl"></void-avatar>
      <void-avatar initials="KW" size="xxl"></void-avatar>
    </div>
  `,
};

export const FallbackOnError: Story = {
  args: {
    src: 'https://example.com/broken-image.png',
    alt: 'Broken image',
    initials: 'KW',
    size: 'md',
  },
  render: (args) => html`
    <void-avatar src=${args.src} alt=${args.alt} initials=${args.initials} size=${args.size}></void-avatar>
  `,
};
