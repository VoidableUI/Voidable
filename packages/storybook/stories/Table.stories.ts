import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

const meta: Meta = {
  title: 'Components/Table',
  component: 'void-table',
  tags: ['autodocs'],
  argTypes: {
    striped: {
      control: { type: 'boolean' },
    },
    hoverable: {
      control: { type: 'boolean' },
    },
    compact: {
      control: { type: 'boolean' },
    },
    bordered: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj;

const sampleTable = html`
  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Role</th>
        <th>Status</th>
        <th>Joined</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Alice Morgan</td>
        <td>Engineer</td>
        <td>Active</td>
        <td>Jan 2023</td>
      </tr>
      <tr>
        <td>Ben Okafor</td>
        <td>Designer</td>
        <td>Active</td>
        <td>Mar 2023</td>
      </tr>
      <tr>
        <td>Clara Shen</td>
        <td>Product</td>
        <td>On leave</td>
        <td>Jul 2022</td>
      </tr>
      <tr>
        <td>David Park</td>
        <td>Engineer</td>
        <td>Active</td>
        <td>Nov 2023</td>
      </tr>
      <tr>
        <td>Eva Lindström</td>
        <td>QA</td>
        <td>Inactive</td>
        <td>Feb 2021</td>
      </tr>
    </tbody>
  </table>
`;

export const Default: Story = {
  args: {
    striped: false,
    hoverable: false,
    compact: false,
    bordered: false,
  },
  render: (args) => html`
    <void-table
      ?striped=${args.striped}
      ?hoverable=${args.hoverable}
      ?compact=${args.compact}
      ?bordered=${args.bordered}
    >
      ${sampleTable}
    </void-table>
  `,
};

export const Striped: Story = {
  render: () => html`
    <void-table striped>
      ${sampleTable}
    </void-table>
  `,
};

export const Hoverable: Story = {
  render: () => html`
    <void-table hoverable>
      ${sampleTable}
    </void-table>
  `,
};

export const Compact: Story = {
  render: () => html`
    <void-table compact>
      ${sampleTable}
    </void-table>
  `,
};

export const Bordered: Story = {
  render: () => html`
    <void-table bordered>
      ${sampleTable}
    </void-table>
  `,
};

export const StripedAndHoverable: Story = {
  render: () => html`
    <void-table striped hoverable>
      ${sampleTable}
    </void-table>
  `,
};

export const CompactBordered: Story = {
  render: () => html`
    <void-table compact bordered>
      ${sampleTable}
    </void-table>
  `,
};
