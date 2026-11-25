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
        component: `Section switcher for detail pages, settings screens, and documentation layouts that organize related content into named panels without a full page navigation. Only the active panel is visible.

**Keyboard**

Pattern: tabs, manual activation by default (\`activation="auto"\` selects on focus). Roving tabindex.

| Key | Action |
|-----|--------|
| Right Arrow / Left Arrow | Focus the next / previous tab (wraps) |
| Home / End | Focus the first / last tab |
| Enter / Space | Select the focused tab (manual activation) |
| Tab | Move to the visible panel |`,
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
      <void-tabs-list>
        <void-tabs-trigger value="one">First</void-tabs-trigger>
        <void-tabs-trigger value="two">Second</void-tabs-trigger>
        <void-tabs-trigger value="three">Third</void-tabs-trigger>
      </void-tabs-list>
      <void-tabs-content value="one">Content 1</void-tabs-content>
      <void-tabs-content value="two">Content 2</void-tabs-content>
      <void-tabs-content value="three">Content 3</void-tabs-content>
    </void-tabs>
  `,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 2rem;">
      <void-tabs value="a" size="sm">
        <void-tabs-list>
          <void-tabs-trigger value="a">Alpha</void-tabs-trigger>
          <void-tabs-trigger value="b">Beta</void-tabs-trigger>
        </void-tabs-list>
        <void-tabs-content value="a">Small tab A</void-tabs-content>
        <void-tabs-content value="b">Small tab B</void-tabs-content>
      </void-tabs>
      <void-tabs value="a" size="md">
        <void-tabs-list>
          <void-tabs-trigger value="a">Alpha</void-tabs-trigger>
          <void-tabs-trigger value="b">Beta</void-tabs-trigger>
        </void-tabs-list>
        <void-tabs-content value="a">Medium tab A</void-tabs-content>
        <void-tabs-content value="b">Medium tab B</void-tabs-content>
      </void-tabs>
      <void-tabs value="a" size="lg">
        <void-tabs-list>
          <void-tabs-trigger value="a">Alpha</void-tabs-trigger>
          <void-tabs-trigger value="b">Beta</void-tabs-trigger>
        </void-tabs-list>
        <void-tabs-content value="a">Large tab A</void-tabs-content>
        <void-tabs-content value="b">Large tab B</void-tabs-content>
      </void-tabs>
    </div>
  `,
};

export const WithRichContent: Story = {
  render: () => html`
    <void-tabs value="overview">
      <void-tabs-list>
        <void-tabs-trigger value="overview">Overview</void-tabs-trigger>
        <void-tabs-trigger value="api">API</void-tabs-trigger>
        <void-tabs-trigger value="examples">Examples</void-tabs-trigger>
      </void-tabs-list>
      <void-tabs-content value="overview">
        <p>This is the overview panel with some content about the component.</p>
      </void-tabs-content>
      <void-tabs-content value="api">
        <p>API reference documentation goes here.</p>
      </void-tabs-content>
      <void-tabs-content value="examples">
        <p>Code examples and usage patterns are shown here.</p>
      </void-tabs-content>
    </void-tabs>
  `,
};

export const AutomaticActivation: Story = {
  render: () => html`
    <void-tabs value="one" activation="auto">
      <void-tabs-list>
        <void-tabs-trigger value="one">First</void-tabs-trigger>
        <void-tabs-trigger value="two">Second</void-tabs-trigger>
        <void-tabs-trigger value="three">Third</void-tabs-trigger>
      </void-tabs-list>
      <void-tabs-content value="one">Arrow keys select the focused tab.</void-tabs-content>
      <void-tabs-content value="two">Content 2</void-tabs-content>
      <void-tabs-content value="three">Content 3</void-tabs-content>
    </void-tabs>
  `,
};

export const DisabledTab: Story = {
  render: () => html`
    <void-tabs value="one">
      <void-tabs-list>
        <void-tabs-trigger value="one">First</void-tabs-trigger>
        <void-tabs-trigger value="two" disabled>Second</void-tabs-trigger>
        <void-tabs-trigger value="three">Third</void-tabs-trigger>
      </void-tabs-list>
      <void-tabs-content value="one">Content 1</void-tabs-content>
      <void-tabs-content value="two">Content 2</void-tabs-content>
      <void-tabs-content value="three">Content 3</void-tabs-content>
    </void-tabs>
  `,
};
