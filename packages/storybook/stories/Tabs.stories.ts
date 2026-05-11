import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Components/Tabs',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Section switcher for detail pages, settings screens, and documentation layouts that organize related content into named panels without a full page navigation. Only the active panel is visible.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    value: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (args) => html`
    <void-tabs value=${args.value || 'one'} size=${args.size || 'md'}>
      <void-tab-panel tab="one" label="First">Content 1</void-tab-panel>
      <void-tab-panel tab="two" label="Second">Content 2</void-tab-panel>
      <void-tab-panel tab="three" label="Third">Content 3</void-tab-panel>
    </void-tabs>
  `,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 2rem;">
      <void-tabs value="a" size="sm">
        <void-tab-panel tab="a" label="Alpha">Small tab A</void-tab-panel>
        <void-tab-panel tab="b" label="Beta">Small tab B</void-tab-panel>
      </void-tabs>
      <void-tabs value="a" size="md">
        <void-tab-panel tab="a" label="Alpha">Medium tab A</void-tab-panel>
        <void-tab-panel tab="b" label="Beta">Medium tab B</void-tab-panel>
      </void-tabs>
      <void-tabs value="a" size="lg">
        <void-tab-panel tab="a" label="Alpha">Large tab A</void-tab-panel>
        <void-tab-panel tab="b" label="Beta">Large tab B</void-tab-panel>
      </void-tabs>
    </div>
  `,
};

export const WithRichContent: Story = {
  render: () => html`
    <void-tabs value="overview">
      <void-tab-panel tab="overview" label="Overview">
        <p>This is the overview panel with some content about the component.</p>
      </void-tab-panel>
      <void-tab-panel tab="api" label="API">
        <p>API reference documentation goes here.</p>
      </void-tab-panel>
      <void-tab-panel tab="examples" label="Examples">
        <p>Code examples and usage patterns are shown here.</p>
      </void-tab-panel>
    </void-tabs>
  `,
};

export const FallbackLabel: Story = {
  render: () => html`
    <void-tabs value="tab-one">
      <void-tab-panel tab="tab-one">Tab one content (label falls back to tab id)</void-tab-panel>
      <void-tab-panel tab="tab-two">Tab two content</void-tab-panel>
    </void-tabs>
  `,
};
