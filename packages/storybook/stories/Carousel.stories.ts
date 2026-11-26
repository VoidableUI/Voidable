import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';
import { argTypesFor } from '../.storybook/manifest';

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
  argTypes: argTypesFor('void-carousel'),
};

export default meta;
type Story = StoryObj;

const slideStyle = 'display: flex; align-items: center; justify-content: center; height: 12rem; font-size: 1.5rem; border-radius: var(--void-radius-md);';

export const Default: Story = {
  render: (args) => html`
    <void-carousel
      aria-label="Screenshots"
      index=${args.index ?? 0}
      ?loop=${args.loop}
      ?autoplay=${args.autoplay}
      interval=${args.interval ?? 5000}
      size=${args.size ?? 'md'}
      orientation=${args.orientation ?? 'horizontal'}
    >
      <void-carousel-content>
        <void-carousel-item>
          <div style="${slideStyle} background: var(--void-color-bg-elevated);">Slide 1</div>
        </void-carousel-item>
        <void-carousel-item>
          <div style="${slideStyle} background: var(--void-color-bg-secondary);">Slide 2</div>
        </void-carousel-item>
        <void-carousel-item>
          <div style="${slideStyle} background: var(--void-color-bg-elevated);">Slide 3</div>
        </void-carousel-item>
      </void-carousel-content>
      <void-carousel-previous aria-label="Previous slide"></void-carousel-previous>
      <void-carousel-next aria-label="Next slide"></void-carousel-next>
      <void-carousel-indicators></void-carousel-indicators>
    </void-carousel>
  `,
};

export const WithLoop: Story = {
  args: { loop: true },
  render: (args) => html`
    <void-carousel
      aria-label="Screenshots"
      index=${args.index ?? 0}
      ?loop=${args.loop ?? true}
      ?autoplay=${args.autoplay}
      interval=${args.interval ?? 5000}
      size=${args.size ?? 'md'}
      orientation=${args.orientation ?? 'horizontal'}
    >
      <void-carousel-content>
        <void-carousel-item>
          <div style="${slideStyle} background: var(--void-color-bg-elevated);">Slide 1</div>
        </void-carousel-item>
        <void-carousel-item>
          <div style="${slideStyle} background: var(--void-color-bg-secondary);">Slide 2</div>
        </void-carousel-item>
        <void-carousel-item>
          <div style="${slideStyle} background: var(--void-color-bg-elevated);">Slide 3</div>
        </void-carousel-item>
      </void-carousel-content>
      <void-carousel-previous aria-label="Previous slide"></void-carousel-previous>
      <void-carousel-next aria-label="Next slide"></void-carousel-next>
      <void-carousel-indicators></void-carousel-indicators>
    </void-carousel>
  `,
};

export const Autoplay: Story = {
  render: () => html`
    <void-carousel aria-label="Screenshots" autoplay loop interval="3000">
      <void-carousel-content>
        <void-carousel-item>
          <div style="${slideStyle} background: var(--void-color-bg-elevated);">Auto 1</div>
        </void-carousel-item>
        <void-carousel-item>
          <div style="${slideStyle} background: var(--void-color-bg-secondary);">Auto 2</div>
        </void-carousel-item>
        <void-carousel-item>
          <div style="${slideStyle} background: var(--void-color-bg-elevated);">Auto 3</div>
        </void-carousel-item>
      </void-carousel-content>
      <void-carousel-previous aria-label="Previous slide"></void-carousel-previous>
      <void-carousel-next aria-label="Next slide"></void-carousel-next>
      <void-carousel-indicators></void-carousel-indicators>
    </void-carousel>
  `,
};

export const Vertical: Story = {
  render: () => html`
    <void-carousel aria-label="Screenshots" orientation="vertical" loop style="height: 8rem;">
      <void-carousel-content>
        <void-carousel-item>
          <div style="${slideStyle} background: var(--void-color-bg-elevated); height: 100%; font-size: 1rem;">Top</div>
        </void-carousel-item>
        <void-carousel-item>
          <div style="${slideStyle} background: var(--void-color-bg-secondary); height: 100%; font-size: 1rem;">Middle</div>
        </void-carousel-item>
        <void-carousel-item>
          <div style="${slideStyle} background: var(--void-color-bg-elevated); height: 100%; font-size: 1rem;">Bottom</div>
        </void-carousel-item>
      </void-carousel-content>
      <void-carousel-previous aria-label="Previous slide"></void-carousel-previous>
      <void-carousel-next aria-label="Next slide"></void-carousel-next>
      <void-carousel-indicators></void-carousel-indicators>
    </void-carousel>
  `,
};

export const NoControls: Story = {
  render: () => html`
    <void-carousel aria-label="Screenshots">
      <void-carousel-content>
        <void-carousel-item>
          <div style="${slideStyle} background: var(--void-color-bg-elevated);">Slide 1</div>
        </void-carousel-item>
        <void-carousel-item>
          <div style="${slideStyle} background: var(--void-color-bg-secondary);">Slide 2</div>
        </void-carousel-item>
        <void-carousel-item>
          <div style="${slideStyle} background: var(--void-color-bg-elevated);">Slide 3</div>
        </void-carousel-item>
      </void-carousel-content>
    </void-carousel>
  `,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 2rem;">
      <void-carousel aria-label="Screenshots" size="sm" loop>
        <void-carousel-content>
          <void-carousel-item>
            <div style="${slideStyle} background: var(--void-color-bg-elevated); height: 8rem; font-size: 1rem;">Small</div>
          </void-carousel-item>
          <void-carousel-item>
            <div style="${slideStyle} background: var(--void-color-bg-secondary); height: 8rem; font-size: 1rem;">Small 2</div>
          </void-carousel-item>
        </void-carousel-content>
        <void-carousel-previous aria-label="Previous slide"></void-carousel-previous>
        <void-carousel-next aria-label="Next slide"></void-carousel-next>
        <void-carousel-indicators></void-carousel-indicators>
      </void-carousel>
      <void-carousel aria-label="Screenshots" size="md" loop>
        <void-carousel-content>
          <void-carousel-item>
            <div style="${slideStyle} background: var(--void-color-bg-elevated);">Medium</div>
          </void-carousel-item>
          <void-carousel-item>
            <div style="${slideStyle} background: var(--void-color-bg-secondary);">Medium 2</div>
          </void-carousel-item>
        </void-carousel-content>
        <void-carousel-previous aria-label="Previous slide"></void-carousel-previous>
        <void-carousel-next aria-label="Next slide"></void-carousel-next>
        <void-carousel-indicators></void-carousel-indicators>
      </void-carousel>
      <void-carousel aria-label="Screenshots" size="lg" loop>
        <void-carousel-content>
          <void-carousel-item>
            <div style="${slideStyle} background: var(--void-color-bg-elevated); height: 16rem; font-size: 2rem;">Large</div>
          </void-carousel-item>
          <void-carousel-item>
            <div style="${slideStyle} background: var(--void-color-bg-secondary); height: 16rem; font-size: 2rem;">Large 2</div>
          </void-carousel-item>
        </void-carousel-content>
        <void-carousel-previous aria-label="Previous slide"></void-carousel-previous>
        <void-carousel-next aria-label="Next slide"></void-carousel-next>
        <void-carousel-indicators></void-carousel-indicators>
      </void-carousel>
    </div>
  `,
};
