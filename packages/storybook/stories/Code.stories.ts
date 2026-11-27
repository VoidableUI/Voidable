import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';
import { argTypesFor } from '../.storybook/manifest';

const meta: Meta = {
  title: 'Components/Code',
  component: 'void-code',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A block of code: monospace, scrolls sideways (or wraps), optional line numbers, an optional title and a copy button. Write a native `<pre><code>` inside; for line numbers write one `void-code-line` per line. No syntax highlighter is included: put the highlighted spans of your own inside the code.',
      },
    },
  },
  argTypes: argTypesFor('void-code'),
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {
    lineNumbers: false,
    wrap: false,
  },
  render: (args) => html`
    <void-code ?line-numbers=${args.lineNumbers} ?wrap=${args.wrap} style="max-width: 36rem">
      <void-code-title>greet.js</void-code-title>
      <void-code-copy><button type="button"></button></void-code-copy>
      <pre><code>
        <void-code-line>function greet(name) {</void-code-line>
        <void-code-line>  return 'Hello, ' + name + '. This line is long enough that it scrolls sideways in a narrow block.';</void-code-line>
        <void-code-line>}</void-code-line>
      </code></pre>
    </void-code>
  `,
};

export const Command: Story = {
  render: () => html`
    <void-code style="max-width: 24rem">
      <void-code-copy><button type="button"></button></void-code-copy>
      <pre><code>npm install @voidable/ui @voidable/theme</code></pre>
    </void-code>
  `,
};

export const Plain: Story = {
  render: () => html`
    <void-code style="max-width: 36rem">
      <pre><code>{
  "name": "example",
  "private": true,
  "type": "module"
}</code></pre>
    </void-code>
  `,
};

export const LineNumbers: Story = {
  render: () => html`
    <void-code line-numbers style="max-width: 36rem">
      <void-code-title>An excerpt that starts at line 40</void-code-title>
      <pre><code>
        <void-code-line number="40">export function total(items) {</void-code-line>
        <void-code-line number="41">  let sum = 0;</void-code-line>
        <void-code-line number="42">  for (const item of items) sum += item.price * item.quantity;</void-code-line>
        <void-code-line number="43">  return sum;</void-code-line>
        <void-code-line number="44">}</void-code-line>
      </code></pre>
    </void-code>
  `,
};

export const Wrap: Story = {
  render: () => html`
    <void-code wrap line-numbers style="max-width: 24rem">
      <pre><code>
        <void-code-line>curl --request POST --header "Content-Type: application/json" --data '{"name":"example"}' https://example.test/api/projects</void-code-line>
        <void-code-line>echo done</void-code-line>
      </code></pre>
    </void-code>
  `,
};

/**
 * The component brings no highlighter. Whatever yours writes (here, spans with classes a stylesheet of the
 * application colours from the theme's tokens) stays as written, and copying takes the text without it.
 */
export const Highlighted: Story = {
  render: () => html`
    <style>
      .tok-keyword { color: var(--void-color-notice); }
      .tok-string { color: var(--void-color-success); }
      .tok-comment { color: var(--void-color-text-secondary); }
    </style>
    <void-code line-numbers style="max-width: 36rem">
      <void-code-title>greet.js</void-code-title>
      <void-code-copy><button type="button"></button></void-code-copy>
      <pre><code>
        <void-code-line><span class="tok-comment">// Says hello.</span></void-code-line>
        <void-code-line><span class="tok-keyword">function</span> greet(name) {</void-code-line>
        <void-code-line>  <span class="tok-keyword">return</span> <span class="tok-string">'Hello, '</span> + name;</void-code-line>
        <void-code-line>}</void-code-line>
      </code></pre>
    </void-code>
  `,
};

export const CopyWithText: Story = {
  render: () => html`
    <void-code style="max-width: 24rem">
      <void-code-title>Terminal</void-code-title>
      <void-code-copy><button type="button">Copy</button></void-code-copy>
      <pre><code>mise run build</code></pre>
    </void-code>
  `,
};
