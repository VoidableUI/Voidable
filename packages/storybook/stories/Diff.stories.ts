import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';
import { argTypesFor } from '../.storybook/manifest';

const meta: Meta = {
  title: 'Components/Diff',
  component: 'void-diff',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A unified diff the application or the server computed: `void-diff-hunk` elements holding one `void-diff-line` per line (`kind="add"`, `"del"` or context), with the changed words in native `ins` and `del`. Markers, line numbers and colours are CSS; a change is never told by colour alone.',
      },
    },
  },
  argTypes: argTypesFor('void-diff'),
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {
    lineNumbers: true,
    wrap: false,
  },
  render: (args) => html`
    <void-diff ?line-numbers=${args.lineNumbers} ?wrap=${args.wrap} style="max-width: 40rem">
      <void-diff-title>src/invoice.js</void-diff-title>
      <void-diff-hunk>
        <void-diff-header>@@ -10,4 +10,5 @@ export function total(items) {</void-diff-header>
        <void-diff-line old="10" new="10">  let sum = 0;</void-diff-line>
        <void-diff-line kind="del" old="11">  for (const item of items) sum += <del>item.price</del>;</void-diff-line>
        <void-diff-line kind="add" new="11">  for (const item of items) sum += <ins>item.price * item.quantity</ins>;</void-diff-line>
        <void-diff-line kind="add" new="12">  if (sum &lt; 0) throw new RangeError('a total below zero is a mistake in the data');</void-diff-line>
        <void-diff-line old="12" new="13">  return sum;</void-diff-line>
        <void-diff-line old="13" new="14">}</void-diff-line>
      </void-diff-hunk>
      <void-diff-hunk>
        <void-diff-header>@@ -40,2 +41,2 @@</void-diff-header>
        <void-diff-line old="40" new="41">export const currency = 'EUR';</void-diff-line>
        <void-diff-line kind="del" old="41">export const digits = <del>2</del>;</void-diff-line>
        <void-diff-line kind="add" new="42">export const digits = <ins>3</ins>;</void-diff-line>
      </void-diff-hunk>
    </void-diff>
  `,
};

export const WithoutLineNumbers: Story = {
  render: () => html`
    <void-diff style="max-width: 32rem">
      <void-diff-hunk>
        <void-diff-line>retries: 3</void-diff-line>
        <void-diff-line kind="del">timeout: 30</void-diff-line>
        <void-diff-line kind="add">timeout: 60</void-diff-line>
        <void-diff-line>verbose: false</void-diff-line>
      </void-diff-hunk>
    </void-diff>
  `,
};

/** A diff of words in running text: unchanged lines that wrap, with `ins` and `del` around the words. */
export const Words: Story = {
  render: () => html`
    <void-diff wrap style="max-width: 32rem">
      <void-diff-title>Terms of service, section 4</void-diff-title>
      <void-diff-hunk>
        <void-diff-line>You may cancel <del>within 14 days</del><ins>within 30 days</ins> of the purchase. Refunds are paid to the <del>original</del> payment method <ins>you choose</ins>.</void-diff-line>
        <void-diff-line>This does not affect your statutory rights.</void-diff-line>
      </void-diff-hunk>
    </void-diff>
  `,
};

export const Wrap: Story = {
  render: () => html`
    <void-diff wrap line-numbers style="max-width: 28rem">
      <void-diff-hunk>
        <void-diff-line kind="del" old="1">const message = 'a long line that would scroll sideways without the wrap attribute, removed';</void-diff-line>
        <void-diff-line kind="add" new="1">const message = 'a long line that would scroll sideways without the wrap attribute, added';</void-diff-line>
      </void-diff-hunk>
    </void-diff>
  `,
};

/** The colours are tokens: set the two inks and the fills follow. */
export const OwnColours: Story = {
  render: () => html`
    <div style="--void-color-diff-ins: var(--void-color-info); --void-color-diff-del: var(--void-color-warning); max-width: 32rem" data-void-theme="void">
      <void-diff>
        <void-diff-hunk>
          <void-diff-line kind="del">colour: <del>red</del></void-diff-line>
          <void-diff-line kind="add">colour: <ins>blue</ins></void-diff-line>
        </void-diff-hunk>
      </void-diff>
    </div>
  `,
};
