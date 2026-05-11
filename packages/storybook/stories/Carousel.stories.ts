import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Components/Carousel',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Scrollable image or content galleries for product photo viewers, onboarding flows, and featured content sliders. Supports autoplay, looping, and keyboard navigation.',
      },
    },
  },
  argTypes: {
    active: { control: 'number' },
    loop: { control: 'boolean' },
    autoplay: { control: 'boolean' },
    interval: { control: 'number' },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    controls: { control: 'boolean' },
    indicators: { control: 'boolean' },
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
  },
};

export default meta;
type Story = StoryObj;

const slideStyle = 'display: flex; align-items: center; justify-content: center; height: 12rem; font-size: 1.5rem; border-radius: var(--void-radius-md);';

export const Default: Story = {
  render: (args) => html`
    <void-carousel
      active=${args.active ?? 0}
      ?loop=${args.loop}
      ?autoplay=${args.autoplay}
      interval=${args.interval ?? 5000}
      size=${args.size ?? 'md'}
      ?controls=${args.controls ?? true}
      ?indicators=${args.indicators ?? true}
      orientation=${args.orientation ?? 'horizontal'}
    >
      <void-carousel-slide>
        <div style="${slideStyle} background: var(--void-color-bg-elevated);">Slide 1</div>
      </void-carousel-slide>
      <void-carousel-slide>
        <div style="${slideStyle} background: var(--void-color-bg-secondary);">Slide 2</div>
      </void-carousel-slide>
      <void-carousel-slide>
        <div style="${slideStyle} background: var(--void-color-bg-elevated);">Slide 3</div>
      </void-carousel-slide>
    </void-carousel>
  `,
};

export const WithLoop: Story = {
  args: { loop: true },
  render: (args) => html`
    <void-carousel
      active=${args.active ?? 0}
      ?loop=${args.loop ?? true}
      ?autoplay=${args.autoplay}
      interval=${args.interval ?? 5000}
      size=${args.size ?? 'md'}
      ?controls=${args.controls ?? true}
      ?indicators=${args.indicators ?? true}
      orientation=${args.orientation ?? 'horizontal'}
    >
      <void-carousel-slide>
        <div style="${slideStyle} background: var(--void-color-bg-elevated);">Slide 1</div>
      </void-carousel-slide>
      <void-carousel-slide>
        <div style="${slideStyle} background: var(--void-color-bg-secondary);">Slide 2</div>
      </void-carousel-slide>
      <void-carousel-slide>
        <div style="${slideStyle} background: var(--void-color-bg-elevated);">Slide 3</div>
      </void-carousel-slide>
    </void-carousel>
  `,
};

export const Autoplay: Story = {
  render: () => html`
    <void-carousel autoplay loop interval="3000">
      <void-carousel-slide>
        <div style="${slideStyle} background: var(--void-color-bg-elevated);">Auto 1</div>
      </void-carousel-slide>
      <void-carousel-slide>
        <div style="${slideStyle} background: var(--void-color-bg-secondary);">Auto 2</div>
      </void-carousel-slide>
      <void-carousel-slide>
        <div style="${slideStyle} background: var(--void-color-bg-elevated);">Auto 3</div>
      </void-carousel-slide>
    </void-carousel>
  `,
};

export const Vertical: Story = {
  render: () => html`
    <void-carousel orientation="vertical" loop style="height: 8rem;">
      <void-carousel-slide>
        <div style="${slideStyle} background: var(--void-color-bg-elevated); height: 100%; font-size: 1rem;">Top</div>
      </void-carousel-slide>
      <void-carousel-slide>
        <div style="${slideStyle} background: var(--void-color-bg-secondary); height: 100%; font-size: 1rem;">Middle</div>
      </void-carousel-slide>
      <void-carousel-slide>
        <div style="${slideStyle} background: var(--void-color-bg-elevated); height: 100%; font-size: 1rem;">Bottom</div>
      </void-carousel-slide>
    </void-carousel>
  `,
};

export const NoControls: Story = {
  render: () => html`
    <void-carousel .controls=${false}>
      <void-carousel-slide>
        <div style="${slideStyle} background: var(--void-color-bg-elevated);">Slide 1</div>
      </void-carousel-slide>
      <void-carousel-slide>
        <div style="${slideStyle} background: var(--void-color-bg-secondary);">Slide 2</div>
      </void-carousel-slide>
      <void-carousel-slide>
        <div style="${slideStyle} background: var(--void-color-bg-elevated);">Slide 3</div>
      </void-carousel-slide>
    </void-carousel>
  `,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 2rem;">
      <void-carousel size="sm" loop>
        <void-carousel-slide>
          <div style="${slideStyle} background: var(--void-color-bg-elevated); height: 8rem; font-size: 1rem;">Small</div>
        </void-carousel-slide>
        <void-carousel-slide>
          <div style="${slideStyle} background: var(--void-color-bg-secondary); height: 8rem; font-size: 1rem;">Small 2</div>
        </void-carousel-slide>
      </void-carousel>
      <void-carousel size="md" loop>
        <void-carousel-slide>
          <div style="${slideStyle} background: var(--void-color-bg-elevated);">Medium</div>
        </void-carousel-slide>
        <void-carousel-slide>
          <div style="${slideStyle} background: var(--void-color-bg-secondary);">Medium 2</div>
        </void-carousel-slide>
      </void-carousel>
      <void-carousel size="lg" loop>
        <void-carousel-slide>
          <div style="${slideStyle} background: var(--void-color-bg-elevated); height: 16rem; font-size: 2rem;">Large</div>
        </void-carousel-slide>
        <void-carousel-slide>
          <div style="${slideStyle} background: var(--void-color-bg-secondary); height: 16rem; font-size: 2rem;">Large 2</div>
        </void-carousel-slide>
      </void-carousel>
    </div>
  `,
};
